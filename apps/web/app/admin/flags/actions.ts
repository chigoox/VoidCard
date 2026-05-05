"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

const Schema = z.object({
  key: z.string().min(1).max(80).regex(/^[a-z0-9._-]+$/i),
  enabled: z.enum(["true", "false"]),
  rollout_pct: z.coerce.number().int().min(0).max(100),
  description: z.string().max(200).optional(),
});

export async function upsertFlag(formData: FormData) {
  const u = await requireAdmin();
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const sb = createAdminClient();
  const { error } = await sb.from("vcard_flags").upsert({
    key: parsed.data.key,
    enabled: parsed.data.enabled === "true",
    rollout_pct: parsed.data.rollout_pct,
    description: parsed.data.description ?? null,
    updated_by: u.id,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  await audit({ action: "admin.flags.upsert", actorId: u.id, targetKind: "vcard_flags", targetId: parsed.data.key, diff: parsed.data });
  revalidatePath("/admin/flags");
}

export async function deleteFlag(formData: FormData) {
  const u = await requireAdmin();
  const key = String(formData.get("key") ?? "");
  if (!key) throw new Error("missing key");
  const sb = createAdminClient();
  const { error } = await sb.from("vcard_flags").delete().eq("key", key);
  if (error) throw new Error(error.message);
  await audit({ action: "admin.flags.delete", actorId: u.id, targetKind: "vcard_flags", targetId: key });
  revalidatePath("/admin/flags");
}
