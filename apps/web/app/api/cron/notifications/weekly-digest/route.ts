import { NextResponse } from "next/server";
import type { Plan } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { sendEmail } from "@/lib/email";
import { buildWeeklyDigestEmail } from "@/lib/weekly-digest";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DigestCandidate = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  plan: Plan | null;
  bonus_storage_bytes: number | null;
  weekly_digest_enabled: boolean | null;
  last_weekly_digest_at: string | null;
};

function currentDigestWindow(now = new Date()) {
  const start = new Date(now);
  const weekday = start.getUTCDay() || 7;
  start.setUTCDate(start.getUTCDate() - (weekday - 1));
  start.setUTCHours(9, 0, 0, 0);
  if (now.getTime() < start.getTime()) {
    start.setUTCDate(start.getUTCDate() - 7);
  }
  return start;
}

function digestWindowLabel(start: Date) {
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);
  return `${start.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })} – ${end.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`;
}

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const fromVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!fromVercelCron && (!cronSecret || auth !== `Bearer ${cronSecret}`)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const admin = createAdminClient();
  const windowStart = currentDigestWindow();
  const activitySince = new Date(windowStart);
  activitySince.setUTCDate(activitySince.getUTCDate() - 7);
  const weekKey = windowStart.toISOString().slice(0, 10);
  const insightsBaseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com";

  const { data } = await admin
    .from("vcard_profile_ext")
    .select("user_id, username, display_name, plan, bonus_storage_bytes, weekly_digest_enabled, last_weekly_digest_at")
    .is("deleted_at", null)
    .limit(250);

  const candidates = (data as DigestCandidate[] | null) ?? [];
  let queued = 0;
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const candidate of candidates) {
    const ent = entitlementsFor(candidate.plan ?? "free", {
      extraStorageBytes: Number(candidate.bonus_storage_bytes ?? 0),
    });
    const lastSent = candidate.last_weekly_digest_at ? new Date(candidate.last_weekly_digest_at) : null;
    if (!ent.weeklyDigest || candidate.weekly_digest_enabled === false || (lastSent && lastSent >= windowStart)) {
      skipped += 1;
      continue;
    }

    const idemKey = `weekly-digest:${candidate.user_id}:${weekKey}`;
    const { data: existingOutbox } = await admin
      .from("vcard_email_outbox")
      .select("id, status, attempts")
      .eq("idem_key", idemKey)
      .maybeSingle();
    if (existingOutbox?.status === "sent") {
      skipped += 1;
      continue;
    }

    const [{ count: tapsCount }, { count: contactsCount }, { count: ordersCount }, userResponse] = await Promise.all([
      admin
        .from("vcard_taps")
        .select("id", { count: "exact", head: true })
        .eq("user_id", candidate.user_id)
        .gte("occurred_at", activitySince.toISOString()),
      admin
        .from("vcard_form_submissions")
        .select("id", { count: "exact", head: true })
        .eq("owner_id", candidate.user_id)
        .gte("created_at", activitySince.toISOString()),
      admin
        .from("vcard_orders")
        .select("id", { count: "exact", head: true })
        .eq("user_id", candidate.user_id)
        .eq("status", "paid")
        .gte("created_at", activitySince.toISOString()),
      admin.auth.admin.getUserById(candidate.user_id),
    ]);

    const recipient = userResponse.data.user?.email ?? null;
    if (!recipient) {
      failed += 1;
      continue;
    }

    const emailPayload = buildWeeklyDigestEmail({
      displayName: candidate.display_name?.trim() || candidate.username || "VoidCard",
      username: candidate.username,
      taps: tapsCount ?? 0,
      contacts: contactsCount ?? 0,
      orders: ordersCount ?? 0,
      windowLabel: digestWindowLabel(activitySince),
      insightsUrl: `${insightsBaseUrl}/insights`,
    });

    const payload = {
      taps: tapsCount ?? 0,
      contacts: contactsCount ?? 0,
      orders: ordersCount ?? 0,
      week_start: activitySince.toISOString(),
      week_end: windowStart.toISOString(),
    };

    if (!existingOutbox) {
      await admin.from("vcard_email_outbox").insert({
        idem_key: idemKey,
        to_email: recipient,
        template: "weekly-digest",
        payload,
        status: "queued",
      });
      queued += 1;
    }

    const result = await sendEmail({
      to: recipient,
      subject: emailPayload.subject,
      html: emailPayload.html,
      text: emailPayload.text,
      tags: [{ name: "type", value: "weekly_digest" }],
    });

    if (result.ok) {
      await Promise.all([
        admin
          .from("vcard_email_outbox")
          .update({
            status: "sent",
            attempts: Number(existingOutbox?.attempts ?? 0) + 1,
            last_error: null,
            resend_id: result.id ?? null,
            sent_at: new Date().toISOString(),
          })
          .eq("idem_key", idemKey),
        admin
          .from("vcard_notifications")
          .insert({
            user_id: candidate.user_id,
            kind: "weekly-digest",
            title: "Your week on VoidCard",
            body: `${tapsCount ?? 0} taps, ${contactsCount ?? 0} contacts, ${ordersCount ?? 0} orders in the last 7 days.`,
            url: "/insights",
          }),
        admin
          .from("vcard_profile_ext")
          .update({ last_weekly_digest_at: new Date().toISOString() })
          .eq("user_id", candidate.user_id),
      ]);
      sent += 1;
    } else {
      await admin
        .from("vcard_email_outbox")
        .update({
          status: "failed",
          attempts: Number(existingOutbox?.attempts ?? 0) + 1,
          last_error: result.error ?? "unknown",
        })
        .eq("idem_key", idemKey);
      failed += 1;
    }
  }

  return NextResponse.json({ ok: true, queued, sent, failed, skipped, window_start: windowStart.toISOString() });
}