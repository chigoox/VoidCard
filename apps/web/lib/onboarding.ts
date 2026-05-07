import "server-only";
import { cookies } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";

export const ONBOARDING_TOTAL_STEPS = 5;
export const ONBOARDING_COOKIE = "vcard_onb";

/**
 * Read the current onboarding step from `vcard_profile_ext.onboarding_state`.
 * Returns 5 (complete) when the row is missing or the column is unreadable so
 * legacy/imported users are not forced through the wizard.
 */
export async function getOnboardingStep(userId: string): Promise<number> {
  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from("vcard_profile_ext")
      .select("onboarding_state")
      .eq("user_id", userId)
      .maybeSingle();
    if (error || !data) return ONBOARDING_TOTAL_STEPS;
    const raw = (data.onboarding_state as { step?: number } | null)?.step;
    if (typeof raw !== "number" || Number.isNaN(raw)) return 0;
    return Math.max(0, Math.min(ONBOARDING_TOTAL_STEPS, Math.floor(raw)));
  } catch {
    return ONBOARDING_TOTAL_STEPS;
  }
}

/** Persist the onboarding step. Pass 5 to mark complete. */
export async function setOnboardingStep(userId: string, step: number) {
  const safe = Math.max(0, Math.min(ONBOARDING_TOTAL_STEPS, Math.floor(step)));
  const admin = createAdminClient();
  const { error } = await admin
    .from("vcard_profile_ext")
    .update({ onboarding_state: { step: safe } })
    .eq("user_id", userId);
  if (!error) {
    await writeOnboardingCookie(safe);
  }
  return { ok: !error, error };
}

/**
 * Write the onboarding hint cookie used by the proxy to fast-path users
 * past the wizard without an extra DB roundtrip on every request.
 */
export async function writeOnboardingCookie(step: number) {
  const safe = Math.max(0, Math.min(ONBOARDING_TOTAL_STEPS, Math.floor(step)));
  const store = await cookies();
  store.set(ONBOARDING_COOKIE, String(safe), {
    path: "/",
    httpOnly: false,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 365,
  });
}
