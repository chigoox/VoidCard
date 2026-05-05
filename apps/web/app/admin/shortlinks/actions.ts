"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export async function deleteShortlink(formData: FormData) {
  const u = await requireAdmin();
  const code = String(formData.get("code") ?? "");
  if (!code) throw new Error("missing code");
  const sb = createAdminClient();
  const { error } = await sb.from("vcard_shortlinks").delete().eq("code", code);
  if (error) throw new Error(error.message);
  await audit({ action: "admin.shortlinks.delete", actorId: u.id, targetKind: "vcard_shortlinks", targetId: code });
  revalidatePath("/admin/shortlinks");
}
