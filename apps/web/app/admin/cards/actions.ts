"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

function randomSerial(): string {
  // base32 12 chars (Crockford-ish, no confusing chars)
  const alphabet = "ABCDEFGHJKMNPQRSTVWXYZ23456789";
  let s = "";
  const bytes = new Uint8Array(12);
  crypto.getRandomValues(bytes);
  for (const b of bytes) s += alphabet[b % alphabet.length];
  return s;
}

const CardIdSchema = z.string().uuid();

function parseCardId(formData: FormData): string {
  const id = String(formData.get("id") ?? "").trim();
  if (!CardIdSchema.safeParse(id).success) {
    throw new Error("Invalid card id.");
  }
  return id;
}

async function revalidateCardAdminPaths(userId?: string | null) {
  revalidatePath("/admin/cards");
  if (userId) {
    revalidatePath(`/admin/cards?user=${userId}`);
    revalidatePath(`/admin/users/${userId}`);
  }
}

export async function batchCreateCards(formData: FormData) {
  const u = await requireAdmin();
  const count = Math.max(1, Math.min(500, Number(formData.get("count") ?? 25)));
  const sku = String(formData.get("sku") ?? "card-pvc");
  const sb = createAdminClient();
  const rows = Array.from({ length: count }, () => ({
    serial: randomSerial(),
    sku,
    status: "unprovisioned" as const,
  }));
  const { error } = await sb.from("vcard_cards").insert(rows);
  if (error) throw new Error(error.message);
  await audit({ action: "admin.cards.batch_create", actorId: u.id, targetKind: "vcard_cards", diff: { count, sku } });
  revalidatePath("/admin/cards");
}

const PairSchema = z.object({
  id: z.string().uuid(),
  user_id: z.string().uuid(),
});

export async function pairCard(formData: FormData) {
  const u = await requireAdmin();
  const parsed = PairSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const sb = createAdminClient();
  const { error } = await sb
    .from("vcard_cards")
    .update({ user_id: parsed.data.user_id, status: "active", paired_at: new Date().toISOString() })
    .eq("id", parsed.data.id);
  if (error) throw new Error(error.message);
  await audit({
    action: "admin.cards.pair",
    actorId: u.id,
    targetKind: "vcard_cards",
    targetId: parsed.data.id,
    diff: { user_id: parsed.data.user_id },
  });
  revalidatePath("/admin/cards");
}

export async function disableCard(formData: FormData) {
  const u = await requireAdmin();
  const id = parseCardId(formData);
  const sb = createAdminClient();
  const { data: card, error: cardError } = await sb
    .from("vcard_cards")
    .select("id, status, user_id")
    .eq("id", id)
    .maybeSingle();

  if (cardError) throw new Error(cardError.message);
  if (!card) throw new Error("Card not found.");
  if (card.status === "lost") {
    await revalidateCardAdminPaths(card.user_id);
    return;
  }

  const { error } = await sb.from("vcard_cards").update({ status: "lost" }).eq("id", id);
  if (error) throw new Error(error.message);
  await audit({ action: "admin.cards.disable", actorId: u.id, targetKind: "vcard_cards", targetId: id });
  await revalidateCardAdminPaths(card.user_id);
}

export async function reactivateCard(formData: FormData) {
  const u = await requireAdmin();
  const id = parseCardId(formData);
  const sb = createAdminClient();
  const { data: card, error: cardError } = await sb
    .from("vcard_cards")
    .select("id, status, user_id")
    .eq("id", id)
    .maybeSingle();

  if (cardError) throw new Error(cardError.message);
  if (!card) throw new Error("Card not found.");

  const nextStatus = card.user_id ? "active" : "sold";
  const { error } = await sb.from("vcard_cards").update({ status: nextStatus }).eq("id", id);
  if (error) throw new Error(error.message);

  await audit({
    action: "admin.cards.reactivate",
    actorId: u.id,
    targetKind: "vcard_cards",
    targetId: id,
    diff: { from: card.status, to: nextStatus },
  });
  await revalidateCardAdminPaths(card.user_id);
}

export async function deleteCard(formData: FormData) {
  const u = await requireAdmin();
  const id = parseCardId(formData);
  const sb = createAdminClient();
  const { data: card, error: cardError } = await sb
    .from("vcard_cards")
    .select("id, serial, user_id, status")
    .eq("id", id)
    .maybeSingle();

  if (cardError) throw new Error(cardError.message);
  if (!card) throw new Error("Card not found.");

  const { error } = await sb.from("vcard_cards").delete().eq("id", id);
  if (error) throw new Error(error.message);

  await audit({
    action: "admin.cards.delete",
    actorId: u.id,
    targetKind: "vcard_cards",
    targetId: id,
    diff: { serial: card.serial, status: card.status },
  });
  await revalidateCardAdminPaths(card.user_id);
}

/** Mark a card as provisioned (NFC URL written, ready to ship). status: unprovisioned → sold */
export async function markProvisioned(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const u = await requireAdmin();
  const id = String(formData.get("id") ?? "").trim();
  if (!z.string().uuid().safeParse(id).success) return { ok: false, error: "Invalid card ID." };
  const sb = createAdminClient();
  const { error } = await sb
    .from("vcard_cards")
    .update({ status: "sold" })
    .eq("id", id)
    .eq("status", "unprovisioned"); // Only advance from unprovisioned
  if (error) return { ok: false, error: error.message };
  await audit({ action: "admin.cards.provisioned", actorId: u.id, targetKind: "vcard_cards", targetId: id });
  revalidatePath("/admin/cards");
  return { ok: true };
}
