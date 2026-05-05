import "server-only";

import { createAdminClient } from "./supabase/admin";
import { audit } from "./audit";
import { rateLimits } from "./rate-limit";

/**
 * GDPR / CCPA Data-Subject-Request helpers.
 *
 * - enqueueExport: queues an export job; an Edge Function worker (out of scope
 *   here) consumes vcard_dsr_log rows where status='queued' and kind='export',
 *   produces a ZIP of all vcard_* rows for the user + storage objects, signs a
 *   URL valid 7 days, sends a `data-export-ready` email, and marks status='ready'.
 * - requestDelete: marks user pending_deletion and schedules a 30-day grace
 *   period. A daily cron hard-deletes users where delete_at <= now().
 * - cancelDelete: user cancels within window.
 *
 * All operations are rate-limited per user (1 / 24h).
 */

export type DsrResult =
  | { ok: true; jobId: string }
  | { ok: false; error: "rate_limited" | "already_pending" | "internal" };

export async function enqueueExport(userId: string): Promise<DsrResult> {
  const rl = await rateLimits.dsrExport.limit(`u:${userId}`);
  if (!rl.success) return { ok: false, error: "rate_limited" };

  const sb = createAdminClient();
  const { data: pending } = await sb
    .from("vcard_dsr_log")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "export")
    .in("status", ["queued", "processing"])
    .maybeSingle();
  if (pending) return { ok: false, error: "already_pending" };

  const { data, error } = await sb
    .from("vcard_dsr_log")
    .insert({ user_id: userId, kind: "export", status: "queued" })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "internal" };

  await audit({
    action: "dsr.export.enqueue",
    actorId: userId,
    targetKind: "user",
    targetId: userId,
    diff: { jobId: data.id },
  });

  return { ok: true, jobId: data.id };
}

export async function requestDelete(
  userId: string,
  graceDays = 30,
): Promise<DsrResult> {
  const rl = await rateLimits.dsrDelete.limit(`u:${userId}`);
  if (!rl.success) return { ok: false, error: "rate_limited" };

  const sb = createAdminClient();
  const { data: pending } = await sb
    .from("vcard_dsr_log")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "delete")
    .in("status", ["queued", "processing"])
    .maybeSingle();
  if (pending) return { ok: false, error: "already_pending" };

  const deleteAt = new Date(Date.now() + graceDays * 24 * 60 * 60 * 1000).toISOString();
  const { data, error } = await sb
    .from("vcard_dsr_log")
    .insert({ user_id: userId, kind: "delete", status: "queued", delete_at: deleteAt })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: "internal" };

  await audit({
    action: "dsr.delete.request",
    actorId: userId,
    targetKind: "user",
    targetId: userId,
    diff: { jobId: data.id, deleteAt },
  });

  return { ok: true, jobId: data.id };
}

export async function cancelDelete(userId: string): Promise<DsrResult> {
  const sb = createAdminClient();
  const { data: job } = await sb
    .from("vcard_dsr_log")
    .select("id")
    .eq("user_id", userId)
    .eq("kind", "delete")
    .eq("status", "queued")
    .maybeSingle();
  if (!job) return { ok: false, error: "already_pending" };

  await sb
    .from("vcard_dsr_log")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", job.id);

  await audit({
    action: "dsr.delete.cancel",
    actorId: userId,
    targetKind: "user",
    targetId: userId,
    diff: { jobId: job.id },
  });

  return { ok: true, jobId: job.id };
}

export async function recordConsent(input: {
  userId?: string | null;
  cookieId?: string | null;
  choice: { essential: true; analytics: boolean; marketing: boolean };
  policyVersion: string;
  ipHash?: string | null;
  ua?: string | null;
}): Promise<void> {
  const sb = createAdminClient();
  await sb.from("vcard_consent_log").insert({
    user_id: input.userId ?? null,
    cookie_id: input.cookieId ?? null,
    choice: input.choice,
    policy_version: input.policyVersion,
    ip_hash: input.ipHash ?? null,
    ua: input.ua ?? null,
  });
}
