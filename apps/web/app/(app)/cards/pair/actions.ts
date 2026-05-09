"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { entitlementsFor } from "@/lib/entitlements";
import { audit } from "@/lib/audit";

export async function pairCardAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const serialOrId = String(formData.get("serial") ?? "").trim();
  const cardIdParam = String(formData.get("cardId") ?? "").trim();

  if (!serialOrId && !cardIdParam) {
    redirect("/cards/pair?err=missing");
  }

  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  const sb = await createClient();
  const admin = createAdminClient();
  const lookup = cardIdParam || serialOrId;

  // Try by id first, then serial.
  let { data: card } = await admin
    .from("vcard_cards")
    .select("id, user_id, status, serial")
    .eq("id", lookup)
    .maybeSingle();
  if (!card) {
    const r = await admin
      .from("vcard_cards")
      .select("id, user_id, status, serial")
      .eq("serial", lookup)
      .maybeSingle();
    card = r.data ?? null;
  }

  if (!card) redirect("/cards/pair?err=not_found");
  if (card.user_id && card.user_id !== user.id) {
    redirect("/cards/pair?err=already_paired");
  }

  // If the user got here from an actual NFC/QR scan, trust that card-id signal
  // and heal stale inventory state on claim. Serial-only claims still require
  // the card to be marked provisioned first.
  const cameFromDetectedCard = cardIdParam.length > 0 && cardIdParam === card.id;

  if (card.status === "unprovisioned" && !cameFromDetectedCard) {
    redirect("/cards/pair?err=not_ready");
  }
  if (card.status === "lost" || card.status === "replaced") {
    redirect("/cards/pair?err=deactivated");
  }

  // Enforce plan limit only when claiming a NEW card (not re-linking their own).
  // If card.user_id is already this user, they're just re-confirming — skip the count.
  if (!card.user_id) {
    const { count } = await sb
      .from("vcard_cards")
      .select("id", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count ?? 0) >= ent.pairedCardsMax) {
      redirect("/cards/pair?err=plan_limit");
    }
  }

  const { error } = await admin
    .from("vcard_cards")
    .update({
      user_id: user.id,
      status: "active",
      paired_at: new Date().toISOString(),
    })
    .eq("id", card.id);

  if (error) redirect("/cards/pair?err=internal");

  await audit({
    action: "card.pair",
    actorId: user.id,
    actorRole: user.role,
    targetKind: "vcard_cards",
    targetId: card.id,
    diff: { serial: card.serial },
  });

  revalidatePath("/cards");
  redirect("/cards");
}

export async function unpairCardAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const cardId = String(formData.get("cardId") ?? "").trim();
  if (!cardId) redirect("/cards?err=missing");

  const admin = createAdminClient();

  // Verify the card belongs to this user before unlinking.
  const { data: card } = await admin
    .from("vcard_cards")
    .select("id, serial, status")
    .eq("id", cardId)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!card) redirect("/cards?err=not_found");

  const { error } = await admin
    .from("vcard_cards")
    .update({ user_id: null, status: "sold", paired_at: null })
    .eq("id", card.id);

  if (error) redirect("/cards?err=internal");

  await audit({
    action: "card.unpair",
    actorId: user.id,
    actorRole: user.role,
    targetKind: "vcard_cards",
    targetId: card.id,
    diff: { serial: card.serial },
  });

  revalidatePath("/cards");
  redirect("/cards");
}
