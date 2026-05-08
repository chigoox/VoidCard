"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";

const NumberField = z.number().finite().min(-5000).max(6000);
const PositiveDimension = z.number().finite().positive().max(6000);
const FillField = z.string().min(1).max(120);

const DesignItemSchema = z.discriminatedUnion("type", [
  z.object({
    type: z.literal("text"),
    id: z.string().min(1).max(80),
    x: NumberField,
    y: NumberField,
    text: z.string().max(500),
    fill: FillField,
    fontSize: z.number().finite().min(8).max(240),
    fontFamily: z.string().min(1).max(120),
    rotation: z.number().finite().min(-360).max(360).optional(),
    width: PositiveDimension.optional(),
  }).strict(),
  z.object({
    type: z.literal("rect"),
    id: z.string().min(1).max(80),
    x: NumberField,
    y: NumberField,
    width: PositiveDimension,
    height: PositiveDimension,
    fill: FillField,
    cornerRadius: z.number().finite().min(0).max(500).optional(),
    rotation: z.number().finite().min(-360).max(360).optional(),
  }).strict(),
  z.object({
    type: z.literal("image"),
    id: z.string().min(1).max(80),
    x: NumberField,
    y: NumberField,
    width: PositiveDimension,
    height: PositiveDimension,
    src: z.string().url().max(2000),
    rotation: z.number().finite().min(-360).max(360).optional(),
  }).strict(),
]);

const DesignDocSchema = z.object({
  w: z.literal(1011),
  h: z.literal(638),
  front: z.object({ items: z.array(DesignItemSchema).max(200) }).strict(),
  back: z.object({ items: z.array(DesignItemSchema).max(200) }).strict(),
}).strict();

const SaveSchema = z.object({
  id: z.string().uuid(),
  name: z.string().min(1).max(120),
  doc: z.string().min(2).max(2_000_000),       // JSON string, max ~2MB
  preview: z.string().url().max(2000).optional(),
});

export async function createDesignAction() {
  const user = await requireUser();
  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (!ent.allSectionTypes) throw new Error("Not allowed");
  const sb = await createClient();
  const { data, error } = await sb
    .from("vcard_card_designs")
    .insert({
      user_id: user.id,
      name: "Untitled card",
      doc: { front: { items: [] }, back: { items: [] }, w: 1011, h: 638 },
    })
    .select("id")
    .single();
  if (error || !data) {
    throw new Error("Could not create design");
  }
  revalidatePath("/cards/design");
  redirect(`/cards/design/${data.id}`);
}

export async function saveDesignAction(input: {
  id: string;
  name: string;
  doc: string;
  preview?: string;
}) {
  const user = await requireUser();
  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (!ent.allSectionTypes) return { ok: false as const, error: "not_allowed" };
  const parsed = SaveSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: "bad_request" };
  }

  let docJson: z.infer<typeof DesignDocSchema>;
  try {
    docJson = DesignDocSchema.parse(JSON.parse(parsed.data.doc));
  } catch {
    return { ok: false as const, error: "bad_doc" };
  }

  const sb = await createClient();
  const update: Record<string, unknown> = {
    name: parsed.data.name,
    doc: docJson,
    updated_at: new Date().toISOString(),
  };
  if (parsed.data.preview) update.preview_url = parsed.data.preview;

  const { error } = await sb
    .from("vcard_card_designs")
    .update(update)
    .eq("id", parsed.data.id)
    .eq("user_id", user.id);

  if (error) return { ok: false as const, error: "save_failed" };

  revalidatePath("/cards/design");
  revalidatePath(`/cards/design/${parsed.data.id}`);
  return { ok: true as const };
}

export async function deleteDesignAction(formData: FormData) {
  const user = await requireUser();
  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (!ent.allSectionTypes) return;
  const id = String(formData.get("id") ?? "");
  if (!/^[0-9a-f-]{36}$/i.test(id)) return;
  const sb = await createClient();
  await sb.from("vcard_card_designs").delete().eq("id", id).eq("user_id", user.id);
  revalidatePath("/cards/design");
}
