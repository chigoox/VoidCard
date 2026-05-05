"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { deliverDueWebhookEvents, newWebhookSecret } from "@/lib/webhook-delivery";
import { WEBHOOK_EVENTS, queueWebhookDelivery } from "@/lib/webhook-queue";
import { entitlementsFor } from "@/lib/entitlements";
import { validateWebhookUrl } from "@/lib/ssrf";
import { createClient } from "@/lib/supabase/server";

function selectedEvents(formData: FormData) {
  const picked = formData
    .getAll("events")
    .map((value) => String(value))
    .filter((value): value is (typeof WEBHOOK_EVENTS)[number] =>
      WEBHOOK_EVENTS.includes(value as (typeof WEBHOOK_EVENTS)[number]),
    );
  return picked.length > 0 ? picked : [...WEBHOOK_EVENTS];
}

export async function createWebhookAction(formData: FormData) {
  const user = await requireUser();
  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (!ent.webhooks) {
    throw new Error("Webhooks are a Pro feature.");
  }

  const url = String(formData.get("url") ?? "").trim();
  const events = selectedEvents(formData);
  const validation = await validateWebhookUrl(url, { allowHttp: user.verified });
  if (!validation.ok) {
    throw new Error(`Webhook URL rejected: ${validation.reason}`);
  }

  const sb = await createClient();
  await sb.from("vcard_webhooks").insert({
    user_id: user.id,
    url,
    secret: newWebhookSecret(),
    events,
    active: true,
  });
  revalidatePath("/account/api");
}

export async function deleteWebhookAction(formData: FormData) {
  const user = await requireUser();
  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (!ent.webhooks) {
    throw new Error("Webhooks are a Pro feature.");
  }

  const id = String(formData.get("id") ?? "");
  const sb = await createClient();
  await sb.from("vcard_webhooks").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/account/api");
}

export async function toggleWebhookAction(formData: FormData) {
  const user = await requireUser();
  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (!ent.webhooks) {
    throw new Error("Webhooks are a Pro feature.");
  }

  const id = String(formData.get("id") ?? "");
  const active = String(formData.get("active")) === "true";
  const sb = await createClient();
  await sb.from("vcard_webhooks").update({ active }).eq("id", id).eq("user_id", user.id);
  revalidatePath("/account/api");
}

export async function sendTestWebhookAction(formData: FormData) {
  const user = await requireUser();
  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (!ent.webhooks) {
    throw new Error("Webhooks are a Pro feature.");
  }

  const id = String(formData.get("id") ?? "");
  const sb = await createClient();
  const { data: hook } = await sb
    .from("vcard_webhooks")
    .select("id")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!hook?.id) {
    throw new Error("Webhook not found.");
  }

  await queueWebhookDelivery(hook.id, "tap.created", {
    source: "test",
    username: user.username,
    created_at: new Date().toISOString(),
    test: true,
  });
  await deliverDueWebhookEvents({ limit: 10, webhookId: hook.id });
  revalidatePath("/account/api");
}