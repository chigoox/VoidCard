import "server-only";
import { redirect } from "next/navigation";
import { createClient } from "./supabase/server";
import { loadPrimaryProfile } from "./profiles";

export type Plan = "free" | "pro" | "team" | "enterprise";

export type AppUser = {
  id: string;
  email: string | null;
  username: string | null;
  displayName: string | null;
  plan: Plan;
  bonusStorageBytes: number;
  verified: boolean;
  role: "user" | "admin" | "superadmin";
};

/**
 * Get current user with VoidCard profile context. Returns null if not signed in.
 */
export async function getUser(): Promise<AppUser | null> {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  if (!user) return null;

  const [{ data: profile }, primaryProfile] = await Promise.all([
    sb.from("profiles").select("role").eq("id", user.id).maybeSingle(),
    loadPrimaryProfile(user.id),
  ]);

  return {
    id: user.id,
    email: user.email ?? null,
    username: primaryProfile?.username ?? null,
    displayName: primaryProfile?.displayName ?? null,
    plan: primaryProfile?.plan ?? "free",
    bonusStorageBytes: Number(primaryProfile?.bonusStorageBytes ?? 0),
    verified: primaryProfile?.verified === true,
    role: (profile?.role as "user" | "admin" | "superadmin") ?? "user",
  };
}

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/login");
  return u;
}

export async function requireAdmin() {
  const u = await requireUser();
  if (u.role !== "admin" && u.role !== "superadmin") redirect("/dashboard");

  // superadmin bypasses MFA requirement
  if (u.role !== "superadmin") {
    const sb = await createClient();
    const [{ data: assurance }, { data: factors }] = await Promise.all([
      sb.auth.mfa.getAuthenticatorAssuranceLevel(),
      sb.auth.mfa.listFactors(),
    ]);
    const hasVerifiedTotp = !!factors?.totp?.some((factor) => factor.status === "verified");
    if (!hasVerifiedTotp || assurance?.currentLevel !== "aal2") {
      redirect("/account/security?next=/admin");
    }
  }

  return u;
}

export async function requireVerified() {
  const u = await requireUser();
  if (!u.verified) redirect("/account/verify");
  return u;
}
