import { NextResponse } from "next/server";
import Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";
import { usesSharedProfilesAsPrimary } from "@/lib/profiles";
import { queueWebhookEvent } from "@/lib/webhook-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const VERIFIED_GRANTING_SKUS = new Set(["card-metal", "card-custom", "bundle-starter", "team-5pack"]);
const STORAGE_GRANTING_PREFIX = "card-";
const ONE_GB = 1_000_000_000;
const STORAGE_CAP = 25 * ONE_GB;

export async function POST(req: Request) {
  const sig = req.headers.get("stripe-signature");
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!sig || !secret) return NextResponse.json({ error: "no_signature" }, { status: 400 });

  const raw = await req.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, secret);
  } catch (err) {
    return NextResponse.json({ error: `bad_signature: ${(err as Error).message}` }, { status: 400 });
  }

  const admin = createAdminClient();
  const sharedPrimary = await usesSharedProfilesAsPrimary();

  // Idempotency: short-circuit if we've already processed this event id.
  const { data: existing } = await admin
    .from("vcard_stripe_events")
    .select("id, processed_at")
    .eq("id", event.id)
    .maybeSingle();
  if (existing?.processed_at) {
    return NextResponse.json({ received: true, deduped: true });
  }
  if (!existing) {
    await admin.from("vcard_stripe_events").insert({
      id: event.id,
      type: event.type,
      livemode: event.livemode,
      payload: event as unknown as Record<string, unknown>,
    });
  }

  switch (event.type) {
    case "account.updated": {
      const account = event.data.object as Stripe.Account;
      await admin
        .from("vcard_seller_accounts")
        .update({
          country: account.country ?? null,
          default_currency: account.default_currency ?? null,
          details_submitted: account.details_submitted ?? false,
          charges_enabled: account.charges_enabled ?? false,
          payouts_enabled: account.payouts_enabled ?? false,
          capabilities: (account.capabilities ?? {}) as Record<string, unknown>,
          requirements: (account.requirements ?? {}) as unknown as Record<string, unknown>,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", account.id);
      break;
    }

    case "account.application.deauthorized": {
      // Connected account deauthorized our platform. Mark as disabled.
      const application = event.data.object as Stripe.Application;
      // For deauthorize events, the connected account id is on the event itself.
      const accountId = (event as unknown as { account?: string }).account ?? application.id;
      await admin
        .from("vcard_seller_accounts")
        .update({
          charges_enabled: false,
          payouts_enabled: false,
          updated_at: new Date().toISOString(),
        })
        .eq("stripe_account_id", accountId);
      break;
    }

    case "charge.refunded": {
      // Reflect a refund issued from the Stripe Dashboard.
      const charge = event.data.object as Stripe.Charge;
      const piId = typeof charge.payment_intent === "string" ? charge.payment_intent : null;
      if (piId) {
        await admin
          .from("vcard_seller_orders")
          .update({ status: "refunded" })
          .eq("stripe_payment_intent", piId);
      }
      break;
    }

    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const mode = session.mode;
      const userId = (session.metadata?.user_id as string) ?? null;

      // ----- Seller storefront sale (destination charge to a connected account) -----
      if (mode === "payment" && session.metadata?.kind === "seller") {
        const sellerUserId = (session.metadata?.seller_user_id as string) ?? null;
        const productId = (session.metadata?.product_id as string) ?? null;
        const buyerUserId = (session.metadata?.buyer_user_id as string) || null;

        let sellerAccountId = "";
        if (sellerUserId) {
          const { data: acct } = await admin
            .from("vcard_seller_accounts")
            .select("stripe_account_id")
            .eq("user_id", sellerUserId)
            .maybeSingle();
          sellerAccountId = acct?.stripe_account_id ?? "";
        }

        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, {
          expand: ["data.price.product"],
        });
        const items = lineItems.data.map((li) => {
          const product = li.price?.product as Stripe.Product | null;
          return {
            product_id: product?.metadata?.product_id ?? productId ?? "",
            name: product?.name ?? "",
            quantity: li.quantity ?? 1,
            amount_total: li.amount_total ?? 0,
          };
        });

        let applicationFee = 0;
        if (typeof session.payment_intent === "string") {
          try {
            const pi = await stripe.paymentIntents.retrieve(session.payment_intent);
            if (typeof pi.application_fee_amount === "number") {
              applicationFee = pi.application_fee_amount;
            }
          } catch {
            // ignore — fee will reconcile via charge.updated.
          }
        }

        await admin.from("vcard_seller_orders").insert({
          seller_user_id: sellerUserId,
          buyer_user_id: buyerUserId,
          buyer_email: session.customer_details?.email ?? null,
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent as string,
          stripe_account_id: sellerAccountId,
          status: "paid",
          subtotal_cents: session.amount_subtotal ?? session.amount_total ?? 0,
          total_cents: session.amount_total ?? 0,
          application_fee_cents: applicationFee,
          currency: session.currency ?? "usd",
          items,
          shipping_address: session.shipping_details ?? null,
        });

        // Notify the seller by email (best-effort).
        if (sellerUserId) {
          try {
            const { data: sellerAuth } = await admin.auth.admin.getUserById(sellerUserId);
            const sellerEmail = sellerAuth?.user?.email ?? null;
            if (sellerEmail) {
              const { sendEmail } = await import("@/lib/email");
              const totalDisplay = `$${((session.amount_total ?? 0) / 100).toFixed(2)} ${(session.currency ?? "usd").toUpperCase()}`;
              const itemsList = items
                .map((i) => `${i.quantity ?? 1}× ${i.name || "item"}`)
                .join(", ");
              await sendEmail({
                to: sellerEmail,
                subject: `New sale: ${totalDisplay}`,
                html: `<p>You just made a sale on VoidCard.</p>
                       <p><strong>${itemsList}</strong></p>
                       <p>Total: ${totalDisplay}</p>
                       <p>Buyer: ${session.customer_details?.email ?? "—"}</p>
                       <p><a href="https://vcard.ed5enterprise.com/account/orders">View order →</a></p>`,
                text: `New sale: ${totalDisplay}\n${itemsList}\nBuyer: ${session.customer_details?.email ?? "—"}\nhttps://vcard.ed5enterprise.com/account/orders`,
              });
            }
          } catch {
            // best-effort; never fail the webhook on email errors.
          }
        }

        // Decrement inventory if tracked.
        if (productId) {
          const { data: prod } = await admin
            .from("vcard_seller_products")
            .select("inventory")
            .eq("id", productId)
            .maybeSingle();
          if (prod && typeof prod.inventory === "number") {
            const qty = items.reduce((acc, it) => acc + (it.quantity || 1), 0);
            await admin
              .from("vcard_seller_products")
              .update({ inventory: Math.max(0, prod.inventory - qty) })
              .eq("id", productId);
          }
        }
        break;
      }

      // ----- First-party shop / subscription flows (existing behavior) -----
      if (mode === "subscription") {
        // Subscription started.
        const sub = await stripe.subscriptions.retrieve(session.subscription as string);
        const priceId = sub.items.data[0]?.price.id ?? "";
        const plan = priceId === process.env.STRIPE_PRICE_TEAM_M || priceId === process.env.STRIPE_PRICE_TEAM_Y ? "team" : "pro";
        const interval = sub.items.data[0]?.price.recurring?.interval === "year" ? "year" : "month";

        if (userId) {
          await admin.from("vcard_subscriptions").upsert({
            user_id: userId,
            stripe_customer_id: sub.customer as string,
            stripe_subscription_id: sub.id,
            plan, interval,
            status: sub.status,
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            cancel_at_period_end: sub.cancel_at_period_end,
            trial_end: sub.trial_end ? new Date(sub.trial_end * 1000).toISOString() : null,
            seats: plan === "team" ? 10 : 1,
          });
          if (!sharedPrimary) {
            await admin.from("vcard_profile_ext").update({ plan }).eq("user_id", userId);
          }
        }
      }

      if (mode === "payment") {
        // One-time order.
        const lineItems = await stripe.checkout.sessions.listLineItems(session.id, { expand: ["data.price.product"] });
        const skus = lineItems.data.map((li) => {
          const product = li.price?.product as Stripe.Product | null;
          return product?.metadata?.sku ?? "";
        }).filter(Boolean);

        const total = session.amount_total ?? 0;
        const { data: order } = await admin.from("vcard_orders").insert({
          user_id: userId,
          email: session.customer_details?.email ?? "",
          stripe_session_id: session.id,
          stripe_payment_intent: session.payment_intent as string,
          status: "paid",
          subtotal_cents: session.amount_subtotal ?? total,
          tax_cents: session.total_details?.amount_tax ?? 0,
          shipping_cents: session.total_details?.amount_shipping ?? 0,
          total_cents: total,
          currency: session.currency ?? "usd",
          shipping_address: session.shipping_details ?? null,
        }).select("id").single();

        for (const li of lineItems.data) {
          const product = li.price?.product as Stripe.Product | null;
          await admin.from("vcard_order_items").insert({
            order_id: order!.id,
            sku: product?.metadata?.sku ?? "",
            qty: li.quantity ?? 1,
            price_cents: li.amount_total ?? li.amount_subtotal ?? 0,
            metadata: product?.metadata ?? {},
          });
        }

        // Side effects: storage bonus + verified grant + referral credit
        if (userId) {
          let storageDelta = 0;
          let grantsVerified = false;

          for (const sku of skus) {
            if (sku.startsWith(STORAGE_GRANTING_PREFIX)) storageDelta += ONE_GB;
            if (VERIFIED_GRANTING_SKUS.has(sku)) grantsVerified = true;
          }

          if (storageDelta > 0 && !sharedPrimary) {
            const { data: cur } = await admin.from("vcard_profile_ext").select("bonus_storage_bytes").eq("user_id", userId).single();
            const next = Math.min((cur?.bonus_storage_bytes ?? 0) + storageDelta, STORAGE_CAP);
            await admin.from("vcard_profile_ext").update({ bonus_storage_bytes: next }).eq("user_id", userId);
          }

          if (grantsVerified) {
            if (!sharedPrimary) {
              await admin.from("vcard_profile_ext").update({ verified: true }).eq("user_id", userId);
            }
            await admin.from("vcard_verifications").insert({
              user_id: userId, method: "earned", status: "approved",
              decided_at: new Date().toISOString(),
            });
          }

          // Referral conversion credit ($5)
          const refCode = (session.metadata?.referral_code as string) ?? null;
          if (refCode) {
            const { data: ref } = await admin.from("vcard_referrals").select("id, referrer_id").eq("code", refCode).maybeSingle();
            if (ref && ref.referrer_id !== userId) {
              await admin.from("vcard_store_credits").insert({
                user_id: ref.referrer_id, delta_cents: 500, reason: "referral", ref_id: ref.id,
              });
              await admin.from("vcard_referrals").update({
                referee_id: userId, status: "converted", reward_cents: 500, rewarded_at: new Date().toISOString(),
              }).eq("id", ref.id);
            }
          }

          // Verified-badge $5 SKU → mark verified
          if (skus.includes("verified-badge")) {
            await admin.from("vcard_verifications").insert({
              user_id: userId, method: "individual", status: "pending", paid: true,
              stripe_payment_intent: session.payment_intent as string,
            });
          }
        }

        if (userId && order?.id) {
          void queueWebhookEvent(userId, "order.paid", {
            order_id: order.id,
            total_cents: total,
            currency: session.currency ?? "usd",
            skus,
            created_at: new Date().toISOString(),
          }).catch(() => null);
        }
      }
      break;
    }

    case "customer.subscription.updated":
    case "customer.subscription.deleted": {
      const sub = event.data.object as Stripe.Subscription;
      await admin.from("vcard_subscriptions").update({
        status: sub.status,
        current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
        cancel_at_period_end: sub.cancel_at_period_end,
      }).eq("stripe_subscription_id", sub.id);

      if (sub.status === "canceled") {
        const { data: row } = await admin.from("vcard_subscriptions").select("user_id").eq("stripe_subscription_id", sub.id).maybeSingle();
        if (row && !sharedPrimary) {
          await admin.from("vcard_profile_ext").update({ plan: "free", remove_branding: false }).eq("user_id", row.user_id);
        }
      }
      break;
    }

    case "invoice.payment_failed": {
      // Log; downgrade after 3 retries handled by Stripe Smart Retries + dunning email.
      break;
    }
  }

  await admin
    .from("vcard_stripe_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", event.id);

  // Audit subscription/refund-shaped events; skip noisy intent.* lifecycle.
  if (event.type.startsWith("customer.subscription.") || event.type === "checkout.session.completed") {
    await audit({
      action: `stripe.${event.type}`,
      targetKind: "stripe_event",
      targetId: event.id,
      diff: { livemode: event.livemode },
    });
  }

  return NextResponse.json({ received: true });
}
