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

  // Enforce paired-cards-max for plan.
  const { count } = await sb
    .from("vcard_cards")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if ((count ?? 0) >= ent.pairedCardsMax) {
    redirect("/cards/pair?err=plan_limit");
  }

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
  if (card.status === "lost" || card.status === "replaced") {
    redirect("/cards/pair?err=deactivated");
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
