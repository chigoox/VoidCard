"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { audit } from "@/lib/audit";

export async function markDsrReady(formData: FormData) {
  const u = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");
  const sb = createAdminClient();
  const { error } = await sb
    .from("vcard_dsr_log")
    .update({ status: "ready", completed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await audit({ action: "admin.dsr.mark_ready", actorId: u.id, targetKind: "vcard_dsr_log", targetId: id });
  revalidatePath("/admin/dsr");
}

export async function cancelDsr(formData: FormData) {
  const u = await requireAdmin();
  const id = String(formData.get("id") ?? "");
  if (!id) throw new Error("missing id");
  const sb = createAdminClient();
  const { error } = await sb
    .from("vcard_dsr_log")
    .update({ status: "cancelled", cancelled_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  await audit({ action: "admin.dsr.cancel", actorId: u.id, targetKind: "vcard_dsr_log", targetId: id });
  revalidatePath("/admin/dsr");
}
