import "server-only";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/cms";
import type { Plan } from "@/lib/auth";

export type SellerAccount = {
  user_id: string;
  stripe_account_id: string;
  account_type: string;
  country: string | null;
  default_currency: string | null;
  details_submitted: boolean;
  charges_enabled: boolean;
  payouts_enabled: boolean;
  capabilities: Record<string, unknown> | null;
  requirements: Record<string, unknown> | null;
};

function isRecoverableStripeAccountError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "");
  const lower = message.toLowerCase();

  return (
    lower.includes("no such account")
    || lower.includes("does not exist")
    || lower.includes("not a valid account")
    || (lower.includes("connected account") && lower.includes("platform"))
    || lower.includes("deleted")
  );
}

async function loadLiveStripeAccount(accountId: string) {
  const account = await stripe.accounts.retrieve(accountId);
  if ("deleted" in account && account.deleted) {
    throw new Error(`Connected account ${accountId} was deleted.`);
  }
  return account;
}

async function persistSellerAccount(params: {
  userId: string;
  accountId: string;
  account: Awaited<ReturnType<typeof loadLiveStripeAccount>>;
  existing: SellerAccount | null;
}): Promise<SellerAccount> {
  const admin = createAdminClient();
  const payload = {
    stripe_account_id: params.accountId,
    account_type: "express",
    country: params.account.country ?? null,
    default_currency: params.account.default_currency ?? null,
    details_submitted: params.account.details_submitted ?? false,
    charges_enabled: params.account.charges_enabled ?? false,
    payouts_enabled: params.account.payouts_enabled ?? false,
    capabilities: (params.account.capabilities ?? {}) as Record<string, unknown>,
    requirements: (params.account.requirements ?? {}) as unknown as Record<string, unknown>,
    updated_at: new Date().toISOString(),
  };

  const builder = params.existing
    ? admin
        .from("vcard_seller_accounts")
        .update(payload)
        .eq("user_id", params.userId)
    : admin
        .from("vcard_seller_accounts")
        .insert({
          user_id: params.userId,
          ...payload,
          connected_at: new Date().toISOString(),
        });

  const { data, error } = await builder.select("*").single();
  if (error || !data) throw new Error(error?.message ?? "seller_account_insert_failed");
  return data as SellerAccount;
}

export async function getSellerAccount(userId: string): Promise<SellerAccount | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_seller_accounts")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as SellerAccount | null) ?? null;
}

/**
 * Look up or create the user's Stripe Express account.
 *
 * Cross-app reuse: before creating a new acct in Stripe, we check sister
 * ED5 apps (currently Boox) for an existing Stripe Connect account tied
 * to the same Supabase user.id. This avoids duplicate Connect accounts
 * for the same human.
 */
export async function getOrCreateExpressAccount(params: {
  userId: string;
  email: string | null;
  country?: string;
}): Promise<SellerAccount> {
  const existing = await getSellerAccount(params.userId);

  if (existing?.stripe_account_id) {
    try {
      const account = await loadLiveStripeAccount(existing.stripe_account_id);
      return await persistSellerAccount({
        userId: params.userId,
        accountId: existing.stripe_account_id,
        account,
        existing,
      });
    } catch (error) {
      if (!isRecoverableStripeAccountError(error)) {
        throw error;
      }
    }
  }

  // 1) Try to reuse an existing acct from Boox.
  const reused = await fetchSisterStripeAccountId(params.userId);

  let accountId = "";
  let accountSnapshot: Awaited<ReturnType<typeof loadLiveStripeAccount>> | null = null;
  if (reused) {
    accountId = reused;
    try {
      accountSnapshot = await loadLiveStripeAccount(accountId);
    } catch {
      // If the acct id stored in Boox is invalid for our Stripe account,
      // fall through to creating a new one.
      accountSnapshot = null;
    }
  }

  if (!accountSnapshot) {
    const created = await stripe.accounts.create({
      type: "express",
      email: params.email ?? undefined,
      country: params.country,
      capabilities: {
        card_payments: { requested: true },
        transfers: { requested: true },
      },
      business_type: "individual",
      metadata: { vcard_user_id: params.userId, ed5_user_id: params.userId },
    });
    accountId = created.id;
    accountSnapshot = created;
  }

  return await persistSellerAccount({
    userId: params.userId,
    accountId,
    account: accountSnapshot,
    existing,
  });
}

/**
 * Calls Boox's internal lookup endpoint to see if the user already has
 * a Stripe Connect account on the booking side. Returns null on any failure.
 */
async function fetchSisterStripeAccountId(userId: string): Promise<string | null> {
  const secret = process.env.ED5_SERVICE_SECRET;
  const booxUrl = process.env.NEXT_PUBLIC_BOOX_URL;
  if (!secret || !booxUrl) return null;
  try {
    const res = await fetch(
      `${booxUrl.replace(/\/$/, "")}/api/internal/stripe-account?uid=${encodeURIComponent(userId)}`,
      {
        headers: { Authorization: `Bearer ${secret}` },
        cache: "no-store",
      },
    );
    if (!res.ok) return null;
    const body = (await res.json()) as { stripeAccountId?: string | null };
    return body.stripeAccountId || null;
  } catch {
    return null;
  }
}

/**
 * Create a Stripe-hosted onboarding URL for an Express account.
 * Stripe handles "log in to existing Stripe account" or "create a new one" automatically.
 */
export async function createOnboardingLink(params: {
  accountId: string;
  origin: string;
}): Promise<string> {
  const link = await stripe.accountLinks.create({
    account: params.accountId,
    refresh_url: `${params.origin}/api/stripe/connect/onboard?refresh=1`,
    return_url: `${params.origin}/account/payments?connected=1`,
    type: "account_onboarding",
  });
  return link.url;
}

/**
 * Express dashboard "log in" link so users can manage payouts, taxes, etc.
 */
export async function createDashboardLink(accountId: string): Promise<string> {
  const link = await stripe.accounts.createLoginLink(accountId);
  return link.url;
}

/**
 * Re-fetch latest status from Stripe and persist locally.
 */
export async function refreshSellerAccount(userId: string): Promise<SellerAccount | null> {
  const existing = await getSellerAccount(userId);
  if (!existing) return null;
  const account = await stripe.accounts.retrieve(existing.stripe_account_id);
  const admin = createAdminClient();
  const { data } = await admin
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
    .eq("user_id", userId)
    .select("*")
    .single();
  return (data as SellerAccount | null) ?? existing;
}

/**
 * Platform fee (basis points) for a given plan.
 */
export async function getPlatformFeeBps(plan: Plan): Promise<number> {
  const free = (await getSetting<number>("seller.platform_fee_bps")) ?? 500;
  const pro = (await getSetting<number>("seller.platform_fee_bps_pro")) ?? 250;
  const team = (await getSetting<number>("seller.platform_fee_bps_team")) ?? 100;
  switch (plan) {
    case "free":
      return free;
    case "pro":
      return pro;
    case "team":
    case "enterprise":
      return team;
  }
}

export function applicationFeeFor(amountCents: number, bps: number): number {
  if (amountCents <= 0 || bps <= 0) return 0;
  return Math.max(0, Math.floor((amountCents * bps) / 10_000));
}
