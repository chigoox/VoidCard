"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const Schema = z.object({
  key: z.string().min(1).max(80),
  value_json: z.string().max(8000),
});

export async function upsertSetting(formData: FormData) {
  const u = await requireAdmin();
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  let value: unknown;
  try {
    value = JSON.parse(parsed.data.value_json);
  } catch {
    throw new Error("value_json must be valid JSON");
  }
  const sb = createAdminClient();
  const { error } = await sb.from("vcard_settings").upsert({
    key: parsed.data.key,
    value,
    updated_at: new Date().toISOString(),
    updated_by: u.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

export async function deleteSetting(formData: FormData) {
  await requireAdmin();
  const key = formData.get("key") as string;
  if (!key) throw new Error("missing key");
  const sb = createAdminClient();
  const { error } = await sb.from("vcard_settings").delete().eq("key", key);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/settings");
}
