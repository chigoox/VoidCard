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
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");
  const sb = createAdminClient();
  const { error } = await sb.from("vcard_cards").update({ status: "lost" }).eq("id", id);
  if (error) throw new Error(error.message);
  await audit({ action: "admin.cards.disable", actorId: u.id, targetKind: "vcard_cards", targetId: id });
  revalidatePath("/admin/cards");
}
