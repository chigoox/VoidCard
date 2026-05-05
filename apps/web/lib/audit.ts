import "server-only";
import { headers } from "next/headers";
import { createHash } from "node:crypto";
import { createAdminClient } from "./supabase/admin";

/**
 * Server-only helper to write to vcard_audit_log.
 *
 * Always uses the service-role client (no INSERT policy is granted to users).
 * Failures are logged but never thrown — auditing must not break user actions.
 */
export type AuditEntry = {
  action: string;
  actorId?: string | null;
  actorRole?: string | null;
  targetKind?: string | null;
  targetId?: string | null;
  diff?: Record<string, unknown> | null;
};

const SALT_KEY = process.env.AUDIT_IP_SALT ?? "vcard-audit-default-salt";

function hashIp(ip: string | null | undefined): string | null {
  if (!ip) return null;
  return createHash("sha256").update(`${ip}:${SALT_KEY}`).digest("hex").slice(0, 32);
}

async function readContext() {
  try {
    const h = await headers();
    const ip =
      h.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      h.get("x-real-ip") ??
      null;
    const ua = h.get("user-agent")?.slice(0, 500) ?? null;
    return { ipHash: hashIp(ip), ua };
  } catch {
    // Outside a request scope (cron, edge function): no headers.
    return { ipHash: null, ua: null };
  }
}

export async function audit(entry: AuditEntry): Promise<void> {
  const { ipHash, ua } = await readContext();
  try {
    const sb = createAdminClient();
    const { error } = await sb.from("vcard_audit_log").insert({
      action: entry.action,
      actor_id: entry.actorId ?? null,
      actor_role: entry.actorRole ?? null,
      target_kind: entry.targetKind ?? null,
      target_id: entry.targetId ?? null,
      diff: entry.diff ?? null,
      ip_hash: ipHash,
      ua,
    });
    if (error) console.error("[audit] insert failed", error.message);
  } catch (e) {
    console.error("[audit] unexpected error", e);
  }
}
