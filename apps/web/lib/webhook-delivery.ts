import "server-only";

import { createHmac, randomBytes } from "node:crypto";
import { sendEmail } from "@/lib/email";
import { loadPrimaryProfile } from "@/lib/profiles";
import { validateWebhookUrl } from "@/lib/ssrf";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WebhookEventName } from "@/lib/webhook-queue";

const BACKOFF_MINUTES = [1, 5, 30, 120, 720, 1440];

type PendingDelivery = {
  id: string;
  webhook_id: string;
  event: WebhookEventName;
  payload: Record<string, unknown>;
  attempt: number;
  delivered_at: string;
};

type WebhookRow = {
  id: string;
  user_id: string;
  url: string;
  secret: string;
  active: boolean;
};

export function newWebhookSecret() {
  return `vwhsec_${randomBytes(24).toString("hex")}`;
}

function nextRetryAt(attempt: number) {
  const delayMinutes = BACKOFF_MINUTES[Math.max(0, Math.min(attempt - 1, BACKOFF_MINUTES.length - 1))];
  return new Date(Date.now() + delayMinutes * 60_000);
}

function signedHeaders(secret: string, event: WebhookEventName, body: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const digest = createHmac("sha256", secret).update(`${timestamp}.${body}`).digest("hex");
  return {
    "content-type": "application/json",
    "x-voidcard-event": event,
    "x-voidcard-signature": `t=${timestamp},v1=${digest}`,
  };
}

async function sendWebhookDisabledEmail(userId: string, url: string) {
  const admin = createAdminClient();
  const { data } = await admin.auth.admin.getUserById(userId);
  const email = data.user?.email ?? null;
  if (!email) return;
  await sendEmail({
    to: email,
    subject: "Your VoidCard webhook was disabled",
    html: `<!doctype html><html><body style="font-family:system-ui,sans-serif;background:#0a0a0a;color:#f7f3ea;padding:24px;"><div style="max-width:560px;margin:0 auto;background:#141414;border:1px solid #2a2a2a;border-radius:12px;padding:32px;"><h1 style="margin:0 0 12px;font-size:22px;color:#d4af37;">Webhook disabled</h1><p style="margin:0 0 16px;line-height:1.6;">VoidCard disabled <code style="color:#d4af37;">${escapeHtml(url)}</code> after repeated delivery failures.</p><p style="margin:0 0 16px;line-height:1.6;">Open Account → API & Webhooks to re-enable it after fixing the endpoint.</p><p style="margin:0;font-size:12px;color:#a8a39a;">VoidCard · vcard.ed5enterprise.com</p></div></body></html>`,
    text: `VoidCard disabled webhook ${url} after repeated delivery failures. Open Account -> API & Webhooks to re-enable it after fixing the endpoint.`,
    tags: [{ name: "type", value: "webhook_disabled" }],
  }).catch(() => null);
}

async function failDelivery(
  delivery: PendingDelivery,
  webhook: WebhookRow,
  details: { statusCode?: number | null; error: string; responseMs?: number | null },
) {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  await admin
    .from("vcard_webhook_deliveries")
    .update({
      status_code: details.statusCode ?? null,
      response_ms: details.responseMs ?? null,
      error: details.error.slice(0, 1000),
      delivered_at: now,
    })
    .eq("id", delivery.id);

  if (delivery.attempt >= BACKOFF_MINUTES.length) {
    await admin
      .from("vcard_webhooks")
      .update({
        active: false,
        failure_count: delivery.attempt,
        last_error: details.error.slice(0, 1000),
        last_response_code: details.statusCode ?? null,
      })
      .eq("id", webhook.id);
    await admin.from("vcard_notifications").insert({
      user_id: webhook.user_id,
      kind: "webhook-disabled",
      title: "Webhook disabled after delivery failures",
      body: webhook.url,
      url: "/account/api",
    });
    await sendWebhookDisabledEmail(webhook.user_id, webhook.url);
    return;
  }

  await admin.from("vcard_webhook_deliveries").insert({
    webhook_id: delivery.webhook_id,
    event: delivery.event,
    payload: delivery.payload,
    attempt: delivery.attempt + 1,
    delivered_at: nextRetryAt(delivery.attempt).toISOString(),
  });
  await admin
    .from("vcard_webhooks")
    .update({
      failure_count: delivery.attempt,
      last_error: details.error.slice(0, 1000),
      last_response_code: details.statusCode ?? null,
    })
    .eq("id", webhook.id);
}

export async function deliverDueWebhookEvents(options?: { limit?: number; webhookId?: string }) {
  const admin = createAdminClient();
  let query = admin
    .from("vcard_webhook_deliveries")
    .select("id, webhook_id, event, payload, attempt, delivered_at")
    .is("status_code", null)
    .is("error", null)
    .lte("delivered_at", new Date().toISOString())
    .order("delivered_at", { ascending: true })
    .limit(options?.limit ?? 50);

  if (options?.webhookId) {
    query = query.eq("webhook_id", options.webhookId);
  }

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message);
  }

  const deliveries = (data ?? []) as PendingDelivery[];
  let sent = 0;
  let failed = 0;
  let skipped = 0;

  for (const delivery of deliveries) {
    const { data: webhookData } = await admin
      .from("vcard_webhooks")
      .select("id, user_id, url, secret, active")
      .eq("id", delivery.webhook_id)
      .maybeSingle();

    const webhook = (webhookData as WebhookRow | null) ?? null;
    const profile = webhook ? await loadPrimaryProfile(webhook.user_id) : null;

    if (!webhook || !webhook.active) {
      await admin
        .from("vcard_webhook_deliveries")
        .update({ error: "inactive_webhook", delivered_at: new Date().toISOString() })
        .eq("id", delivery.id);
      skipped += 1;
      continue;
    }

    const urlCheck = await validateWebhookUrl(webhook.url, { allowHttp: profile?.verified === true });
    if (!urlCheck.ok) {
      await failDelivery(delivery, webhook, { error: `invalid_destination:${urlCheck.reason}` });
      failed += 1;
      continue;
    }

    const body = JSON.stringify({
      id: delivery.id,
      type: delivery.event,
      created_at: new Date().toISOString(),
      data: delivery.payload,
    });

    const startedAt = Date.now();
    try {
      const response = await fetch(webhook.url, {
        method: "POST",
        headers: signedHeaders(webhook.secret, delivery.event, body),
        body,
        signal: AbortSignal.timeout(15_000),
      });
      const responseMs = Date.now() - startedAt;
      if (!response.ok) {
        const responseBody = (await response.text().catch(() => "")).slice(0, 1000);
        await failDelivery(delivery, webhook, {
          statusCode: response.status,
          responseMs,
          error: responseBody || `http_${response.status}`,
        });
        failed += 1;
        continue;
      }

      await Promise.all([
        admin
          .from("vcard_webhook_deliveries")
          .update({
            status_code: response.status,
            response_ms: responseMs,
            error: null,
            delivered_at: new Date().toISOString(),
          })
          .eq("id", delivery.id),
        admin
          .from("vcard_webhooks")
          .update({
            failure_count: 0,
            last_error: null,
            last_delivery_at: new Date().toISOString(),
            last_response_code: response.status,
          })
          .eq("id", webhook.id),
      ]);
      sent += 1;
    } catch (errorValue) {
      await failDelivery(delivery, webhook, {
        error: errorValue instanceof Error ? errorValue.message : "network_error",
      });
      failed += 1;
    }
  }

  return { sent, failed, skipped, processed: deliveries.length };
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;",
  })[char] ?? char);
}