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
 */
export async function getOrCreateExpressAccount(params: {
  userId: string;
  email: string | null;
  country?: string;
}): Promise<SellerAccount> {
  const existing = await getSellerAccount(params.userId);
  if (existing) return existing;

  const account = await stripe.accounts.create({
    type: "express",
    email: params.email ?? undefined,
    country: params.country,
    capabilities: {
      card_payments: { requested: true },
      transfers: { requested: true },
    },
    business_type: "individual",
    metadata: { vcard_user_id: params.userId },
  });

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vcard_seller_accounts")
    .insert({
      user_id: params.userId,
      stripe_account_id: account.id,
      account_type: "express",
      country: account.country ?? null,
      default_currency: account.default_currency ?? null,
      details_submitted: account.details_submitted ?? false,
      charges_enabled: account.charges_enabled ?? false,
      payouts_enabled: account.payouts_enabled ?? false,
      capabilities: (account.capabilities ?? {}) as Record<string, unknown>,
      requirements: (account.requirements ?? {}) as unknown as Record<string, unknown>,
    })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "seller_account_insert_failed");
  return data as SellerAccount;
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
