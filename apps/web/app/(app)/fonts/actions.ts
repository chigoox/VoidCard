"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

function gateFonts(plan: string, bonusStorageBytes: number) {
  const ents = entitlementsFor(plan as never, { extraStorageBytes: bonusStorageBytes });
  if (!ents.customFontUpload) throw new Error("Custom fonts require Pro.");
}

const AddSchema = z.object({
  family: z.string().min(1).max(80),
  weight: z.coerce.number().int().min(100).max(900),
  style: z.enum(["normal", "italic"]),
  url: z.string().url().max(500).refine((u) => u.toLowerCase().endsWith(".woff2"), {
    message: "Must be a .woff2 URL.",
  }),
  bytes: z.coerce.number().int().min(1).max(1_000_000),
});

export async function createFontRecord(input: unknown) {
  const u = await requireUser();
  gateFonts(u.plan, u.bonusStorageBytes);
  const parsed = AddSchema.safeParse(input);
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  const admin = createAdminClient();
  const { error } = await admin.from("vcard_user_fonts").insert({
    user_id: u.id,
    family: parsed.data.family,
    weight: parsed.data.weight,
    style: parsed.data.style,
    url: parsed.data.url,
    bytes: parsed.data.bytes,
  });
  if (error) throw new Error(error.message);
  await admin.from("vcard_profile_ext").update({ custom_font_url: parsed.data.url }).eq("user_id", u.id);
  revalidatePath("/settings");
  revalidatePath("/fonts");
  if (u.username) revalidatePath(`/u/${u.username}`);
}

export async function setActiveFont(formData: FormData) {
  const u = await requireUser();
  gateFonts(u.plan, u.bonusStorageBytes);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vcard_user_fonts")
    .select("url")
    .eq("id", id)
    .eq("user_id", u.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data?.url) throw new Error("font not found");
  await admin.from("vcard_profile_ext").update({ custom_font_url: data.url }).eq("user_id", u.id);
  revalidatePath("/settings");
  revalidatePath("/fonts");
  if (u.username) revalidatePath(`/u/${u.username}`);
}

export async function deleteFont(formData: FormData) {
  const u = await requireUser();
  gateFonts(u.plan, u.bonusStorageBytes);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");
  const admin = createAdminClient();
  const { data: font } = await admin
    .from("vcard_user_fonts")
    .select("url")
    .eq("id", id)
    .eq("user_id", u.id)
    .maybeSingle();
  const { error } = await admin.from("vcard_user_fonts").delete().eq("id", id).eq("user_id", u.id);
  if (error) throw new Error(error.message);

  if (font?.url) {
    const { data: ext } = await admin
      .from("vcard_profile_ext")
      .select("custom_font_url")
      .eq("user_id", u.id)
      .maybeSingle();
    if (ext?.custom_font_url === font.url) {
      const { data: fallback } = await admin
        .from("vcard_user_fonts")
        .select("url")
        .eq("user_id", u.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      await admin
        .from("vcard_profile_ext")
        .update({ custom_font_url: fallback?.url ?? null })
        .eq("user_id", u.id);
    }
  }

  revalidatePath("/settings");
  revalidatePath("/fonts");
  if (u.username) revalidatePath(`/u/${u.username}`);
}
