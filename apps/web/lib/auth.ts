import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";

export type Plan = "free" | "pro" | "team" | "enterprise";

export type AppUser = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  plan: Plan;
  bonusStorageBytes: number;
  verified: boolean;
  role: "user" | "admin";
};

/**
 * Get current user with VoidCard profile context. Returns null if not signed in.
 */
export async function getUser(): Promise<AppUser | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  // shared profiles table for role
  const { data: profile } = await sb
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  const { data: ext } = await sb
    .from("vcard_profile_ext")
    .select("username, display_name, plan, bonus_storage_bytes, verified")
    .eq("user_id", user.id)
    .maybeSingle();

  return {
    id: user.id,
    email: user.email ?? null,
    username: ext?.username ?? null,
    displayName: ext?.display_name ?? null,
    plan: (ext?.plan as Plan) ?? "free",
    bonusStorageBytes: Number(ext?.bonus_storage_bytes ?? 0),
    verified: !!ext?.verified,
    role: (profile?.role as "user" | "admin") ?? "user",
  };
}

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin") redirect("/dashboard");

  const sb = await createClient();
  const [{ data: assurance }, { data: factors }] = await Promise.all([
    sb.auth.mfa.getAuthenticatorAssuranceLevel(),
    sb.auth.mfa.listFactors(),
  ]);
  const hasVerifiedTotp = !!factors?.totp?.some((factor) => factor.status === "verified");
  if (!hasVerifiedTotp || assurance?.currentLevel !== "aal2") {
    redirect("/account/security?next=/admin");
  }

  return u;
}

export async function requireVerified() {
  const u = await requireUser();
  if (!u.verified) redirect("/account/verify");
  return u;
}
