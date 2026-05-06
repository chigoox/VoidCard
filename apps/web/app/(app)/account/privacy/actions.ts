"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { enqueueExport, requestDelete, cancelDelete } from "@/lib/dsr";
import { usesSharedProfilesAsPrimary } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

const AI_INDEXING = ["allow_search_only", "allow_all", "disallow_all"] as const;
type AiIndexing = (typeof AI_INDEXING)[number];

export async function exportDataAction(): Promise<void> {
  const u = await requireUser();
  await enqueueExport(u.id);
  revalidatePath("/account/privacy");
}

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const u = await requireUser();
  const confirm = String(formData.get("confirm") ?? "");
  if (confirm !== "DELETE") return;
  await requestDelete(u.id);
  revalidatePath("/account/privacy");
}

export async function cancelDeletionAction(): Promise<void> {
  const u = await requireUser();
  await cancelDelete(u.id);
  revalidatePath("/account/privacy");
}

export async function updateAiIndexingAction(formData: FormData): Promise<void> {
  const u = await requireUser();
  const raw = String(formData.get("ai_indexing") ?? "");
  if (!AI_INDEXING.includes(raw as AiIndexing)) return;

  if (await usesSharedProfilesAsPrimary()) {
    revalidatePath("/account/privacy");
    return;
  }

  const sb = await createClient();
  await sb
    .from("vcard_profile_ext")
    .update({ ai_indexing: raw })
    .eq("user_id", u.id);
  revalidatePath("/account/privacy");
}
