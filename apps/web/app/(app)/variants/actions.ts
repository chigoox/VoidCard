"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { loadPrimaryProfile } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

function gateProAB(plan: string, bonusStorageBytes: number) {
  const ents = entitlementsFor(plan as never, { extraStorageBytes: bonusStorageBytes });
  if (!ents.abVariants) throw new Error("A/B variants require Pro.");
}

const CreateSchema = z.object({
  name: z.string().min(1).max(80),
  weight: z.coerce.number().int().min(0).max(100).default(50),
});

export async function createVariant(formData: FormData) {
  const u = await requireUser();
  gateProAB(u.plan, u.bonusStorageBytes);
  const parsed = CreateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));

  const profile = await loadPrimaryProfile(u.id);

  const admin = createAdminClient();
  const { error } = await admin.from("vcard_ab_variants").insert({
    user_id: u.id,
    name: parsed.data.name,
    weight: parsed.data.weight,
    sections: profile?.sections ?? [],
    theme: profile?.theme ?? {},
    enabled: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/variants");
}

const UpdateSchema = z.object({
  id: z.string().uuid(),
  enabled: z.enum(["true", "false"]).optional(),
  weight: z.coerce.number().int().min(0).max(100).optional(),
});

export async function updateVariant(formData: FormData) {
  const u = await requireUser();
  gateProAB(u.plan, u.bonusStorageBytes);
  const parsed = UpdateSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("invalid input");

  const admin = createAdminClient();
  const patch: Record<string, unknown> = {};
  if (parsed.data.enabled !== undefined) patch.enabled = parsed.data.enabled === "true";
  if (parsed.data.weight !== undefined) patch.weight = parsed.data.weight;

  const { error } = await admin
    .from("vcard_ab_variants")
    .update(patch)
    .eq("id", parsed.data.id)
    .eq("user_id", u.id);
  if (error) throw new Error(error.message);
  revalidatePath("/variants");
}

export async function deleteVariant(formData: FormData) {
  const u = await requireUser();
  gateProAB(u.plan, u.bonusStorageBytes);
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");
  const admin = createAdminClient();
  const { error } = await admin.from("vcard_ab_variants").delete().eq("id", id).eq("user_id", u.id);
  if (error) throw new Error(error.message);
  revalidatePath("/variants");
}
