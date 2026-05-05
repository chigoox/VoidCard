import { createAdminClient } from "@/lib/supabase/admin";

export const WEBHOOK_EVENTS = ["tap.created", "contact.captured", "order.paid"] as const;

export type WebhookEventName = (typeof WEBHOOK_EVENTS)[number];

function isWebhookEvent(value: string): value is WebhookEventName {
  return WEBHOOK_EVENTS.includes(value as WebhookEventName);
}

export async function queueWebhookDelivery(
  webhookId: string,
  event: WebhookEventName,
  payload: Record<string, unknown>,
  scheduledAt = new Date(),
) {
  if (!isWebhookEvent(event)) return 0;
  const admin = createAdminClient();
  const { error } = await admin.from("vcard_webhook_deliveries").insert({
    webhook_id: webhookId,
    event,
    payload,
    attempt: 1,
    delivered_at: scheduledAt.toISOString(),
  });
  if (error) {
    throw new Error(error.message);
  }
  return 1;
}

export async function queueWebhookEvent(
  userId: string,
  event: WebhookEventName,
  payload: Record<string, unknown>,
  scheduledAt = new Date(),
) {
  if (!isWebhookEvent(event)) return 0;
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vcard_webhooks")
    .select("id")
    .eq("user_id", userId)
    .eq("active", true)
    .contains("events", [event]);
  if (error) {
    throw new Error(error.message);
  }
  const hooks = (data ?? []) as Array<{ id: string }>;
  if (hooks.length === 0) return 0;

  const deliveries = hooks.map((hook) => ({
    webhook_id: hook.id,
    event,
    payload,
    attempt: 1,
    delivered_at: scheduledAt.toISOString(),
  }));

  const { error: insertError } = await admin.from("vcard_webhook_deliveries").insert(deliveries);
  if (insertError) {
    throw new Error(insertError.message);
  }
  return deliveries.length;
}