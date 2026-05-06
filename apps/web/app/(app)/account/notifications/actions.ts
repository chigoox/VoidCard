"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { usesSharedProfilesAsPrimary } from "@/lib/profiles";
import { createClient } from "@/lib/supabase/server";

export async function saveWeeklyDigestPreference(formData: FormData) {
  const user = await requireUser();
  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  const requestedEnabled = String(formData.get("enabled")) === "true";
  const nextEnabled = ent.weeklyDigest ? requestedEnabled : false;

  if (await usesSharedProfilesAsPrimary()) {
    revalidatePath("/account/notifications");
    return;
  }

  const sb = await createClient();
  await sb
    .from("vcard_profile_ext")
    .update({ weekly_digest_enabled: nextEnabled })
    .eq("user_id", user.id);

  revalidatePath("/account/notifications");
}