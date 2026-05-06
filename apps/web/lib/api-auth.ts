import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { rateLimits } from "@/lib/rate-limit";

export type ApiContext = {
  userId: string;
  plan: "pro" | "team" | "enterprise";
  scopes: string[];
};

function isMissingTableError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST205" || message.includes("schema cache") || message.includes("could not find the table");
}

export async function authenticateApiKey(req: Request): Promise<ApiContext | { error: string; status: number }> {
  const auth = req.headers.get("authorization") ?? "";
  const m = /^Bearer\s+(vk_[A-Za-z0-9]+)/.exec(auth);
  if (!m) return { error: "missing_bearer", status: 401 };

  const key = m[1];
  const hash = await sha256(key);
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("vcard_api_keys")
    .select("user_id, scopes, revoked_at")
    .eq("hash", hash)
    .maybeSingle();

  if (!row || row.revoked_at) return { error: "invalid_key", status: 401 };

  const { data: ext, error: profileError } = await admin
    .from("vcard_profile_ext")
    .select("plan")
    .eq("user_id", row.user_id)
    .maybeSingle();
  const plan = isMissingTableError(profileError) ? "free" : ((ext?.plan as string) ?? "pro");

  if (plan === "free") return { error: "pro_required", status: 403 };

  const limiter = plan === "team" || plan === "enterprise" ? rateLimits.api_team : rateLimits.api_pro;
  const rl = await limiter.limit(`k:${hash}`);
  if (!rl.success) return { error: "rate_limited", status: 429 };

  await admin.from("vcard_api_keys").update({ last_used_at: new Date().toISOString() }).eq("hash", hash);
  return { userId: row.user_id, plan: plan as ApiContext["plan"], scopes: row.scopes ?? [] };
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}
