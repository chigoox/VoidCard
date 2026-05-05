"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { createManagedProfile, deleteManagedProfile } from "@/lib/profiles";

export async function createProfileAction(formData: FormData) {
  const user = await requireUser();
  const result = await createManagedProfile(user, {
    username: String(formData.get("username") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
  });

  if (!result.ok) {
    redirect(`/profiles?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/profiles");
  revalidatePath("/settings");
  revalidatePath("/edit");
  redirect(`/settings?profile=${result.id}`);
}

export async function deleteProfileAction(formData: FormData) {
  const user = await requireUser();
  const profileId = String(formData.get("id") ?? "");
  const result = await deleteManagedProfile(user.id, profileId);
  if (!result.ok) {
    redirect(`/profiles?error=${encodeURIComponent(result.error)}`);
  }

  revalidatePath("/profiles");
  revalidatePath("/settings");
  revalidatePath("/edit");
  redirect("/profiles?deleted=1");
}