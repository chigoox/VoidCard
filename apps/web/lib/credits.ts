import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getSetting } from "@/lib/cms";

export type GrantReason = "monthly_grant" | "card_bonus" | "purchase" | "admin" | "refund";

const DEFAULTS = {
  costPerImage: 1,
  freeMonthlyFree: 3,
  freeMonthlyPro: 20,
  freeMonthlyTeam: 60,
  cardBonus: 10,
} as const;

export async function getAiSettings() {
  const [cost, freeFree, freePro, freeTeam, cardBonus] = await Promise.all([
    getSetting<number>("ai.credit_cost_per_image"),
    getSetting<number>("ai.free_monthly_credits"),
    getSetting<number>("ai.free_monthly_credits_pro"),
    getSetting<number>("ai.free_monthly_credits_team"),
    getSetting<number>("ai.card_purchase_bonus_credits"),
  ]);
  return {
    costPerImage: typeof cost === "number" && cost > 0 ? cost : DEFAULTS.costPerImage,
    freeMonthly: {
      free: typeof freeFree === "number" ? freeFree : DEFAULTS.freeMonthlyFree,
      pro: typeof freePro === "number" ? freePro : DEFAULTS.freeMonthlyPro,
      team: typeof freeTeam === "number" ? freeTeam : DEFAULTS.freeMonthlyTeam,
    },
    cardBonus: typeof cardBonus === "number" ? cardBonus : DEFAULTS.cardBonus,
  };
}

export type CreditBalance = {
  balance: number;
  lifetimeGranted: number;
  lifetimeSpent: number;
  lastMonthlyGrant: string | null;
};

export async function getBalance(userId: string): Promise<CreditBalance> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_ai_credits")
    .select("balance, lifetime_granted, lifetime_spent, last_monthly_grant")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data) return { balance: 0, lifetimeGranted: 0, lifetimeSpent: 0, lastMonthlyGrant: null };
  return {
    balance: data.balance ?? 0,
    lifetimeGranted: data.lifetime_granted ?? 0,
    lifetimeSpent: data.lifetime_spent ?? 0,
    lastMonthlyGrant: data.last_monthly_grant ?? null,
  };
}

async function ensureRow(userId: string) {
  const admin = createAdminClient();
  await admin
    .from("vcard_ai_credits")
    .upsert({ user_id: userId }, { onConflict: "user_id", ignoreDuplicates: true });
}

/** Grant credits and write a ledger entry. Idempotent only if caller passes a unique refId. */
export async function grantCredits(
  userId: string,
  amount: number,
  reason: GrantReason,
  refId?: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: true; balance: number } | { ok: false; error: string }> {
  if (amount <= 0) return { ok: false, error: "non_positive" };
  const admin = createAdminClient();

  if (refId) {
    // Idempotency check: don't double-grant for the same refId+reason.
    const { data: existing } = await admin
      .from("vcard_ai_credit_ledger")
      .select("id")
      .eq("user_id", userId)
      .eq("reason", reason)
      .eq("ref_id", refId)
      .maybeSingle();
    if (existing) {
      const { balance } = await getBalance(userId);
      return { ok: true, balance };
    }
  }

  await ensureRow(userId);
  const current = await getBalance(userId);
  const nextBalance = current.balance + amount;
  const nextLifetime = current.lifetimeGranted + amount;

  const { error: upErr } = await admin
    .from("vcard_ai_credits")
    .update({
      balance: nextBalance,
      lifetime_granted: nextLifetime,
      last_monthly_grant: reason === "monthly_grant" ? new Date().toISOString() : current.lastMonthlyGrant,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId);
  if (upErr) return { ok: false, error: upErr.message };

  await admin.from("vcard_ai_credit_ledger").insert({
    user_id: userId,
    delta: amount,
    reason,
    ref_id: refId ?? null,
    metadata: metadata ?? null,
  });
  return { ok: true, balance: nextBalance };
}

/** Atomically debit credits. Returns ok:false if insufficient. */
export async function spendCredits(
  userId: string,
  amount: number,
  refId?: string,
  metadata?: Record<string, unknown>,
): Promise<{ ok: true; balance: number } | { ok: false; error: "insufficient" | "db" }> {
  if (amount <= 0) return { ok: false, error: "db" };
  const admin = createAdminClient();
  await ensureRow(userId);

  // Optimistic concurrency: only succeed if balance >= amount.
  const current = await getBalance(userId);
  if (current.balance < amount) return { ok: false, error: "insufficient" };
  const nextBalance = current.balance - amount;
  const { error, data } = await admin
    .from("vcard_ai_credits")
    .update({
      balance: nextBalance,
      lifetime_spent: current.lifetimeSpent + amount,
      updated_at: new Date().toISOString(),
    })
    .eq("user_id", userId)
    .eq("balance", current.balance) // CAS guard
    .select("balance")
    .maybeSingle();
  if (error || !data) return { ok: false, error: "insufficient" };

  await admin.from("vcard_ai_credit_ledger").insert({
    user_id: userId,
    delta: -amount,
    reason: "spend",
    ref_id: refId ?? null,
    metadata: metadata ?? null,
  });
  return { ok: true, balance: nextBalance };
}

/** Grant the monthly free credits if the user hasn't received them this calendar month. */
export async function grantMonthlyIfDue(userId: string, plan: "free" | "pro" | "team"): Promise<number> {
  const settings = await getAiSettings();
  const amount = settings.freeMonthly[plan] ?? settings.freeMonthly.free;
  if (amount <= 0) return 0;
  const current = await getBalance(userId);
  const now = new Date();
  const ym = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}`;
  const last = current.lastMonthlyGrant ? new Date(current.lastMonthlyGrant) : null;
  const lastYm = last ? `${last.getUTCFullYear()}-${String(last.getUTCMonth() + 1).padStart(2, "0")}` : null;
  if (lastYm === ym) return 0;
  const result = await grantCredits(userId, amount, "monthly_grant", `${ym}:${plan}`);
  return result.ok ? amount : 0;
}
