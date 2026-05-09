"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { loadPrimaryProfile, usesSharedProfilesAsPrimary } from "@/lib/profiles";
import { createAdminClient } from "@/lib/supabase/admin";

const RoleSchema = z.object({
  user_id: z.string().uuid(),
  role: z.enum(["user", "admin", "superadmin"]),
});

const VerifiedSchema = z.object({
  user_id: z.string().uuid(),
  verified: z.enum(["true", "false"]).transform((value) => value === "true"),
});

async function revalidateUserPaths(userId: string) {
  const profile = await loadPrimaryProfile(userId);
  revalidatePath("/admin");
  revalidatePath("/admin/users");
  revalidatePath("/admin/verifications");
  revalidatePath("/dashboard");
  revalidatePath("/account");
  revalidatePath("/account/verify");
  if (profile?.username) revalidatePath(`/u/${profile.username}`);
  return profile;
}

export async function setUserRole(formData: FormData) {
  const adminUser = await requireAdmin();
  if (adminUser.role !== "superadmin") {
    throw new Error("Only superadmins can change roles.");
  }

  const parsed = RoleSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  if (parsed.data.user_id === adminUser.id && parsed.data.role !== "superadmin") {
    throw new Error("You cannot demote your own superadmin account.");
  }

  const admin = createAdminClient();
  const { data: sharedProfile, error } = await admin
    .from("profiles")
    .select("role")
    .eq("id", parsed.data.user_id)
    .maybeSingle();

  if (error || !sharedProfile) {
    throw new Error(error?.message ?? "Shared profile row not found.");
  }

  const previousRole = (sharedProfile.role as "user" | "admin" | "superadmin" | null) ?? "user";
  if (previousRole !== parsed.data.role) {
    const { error: updateError } = await admin
      .from("profiles")
      .update({ role: parsed.data.role })
      .eq("id", parsed.data.user_id);
    if (updateError) throw new Error(updateError.message);

    await audit({
      action: "admin.user.role.update",
      actorId: adminUser.id,
      actorRole: adminUser.role,
      targetKind: "profiles",
      targetId: parsed.data.user_id,
      diff: { from: previousRole, to: parsed.data.role },
    });
  }

  await revalidateUserPaths(parsed.data.user_id);
}

export async function setUserVerified(formData: FormData) {
  const adminUser = await requireAdmin();
  const parsed = VerifiedSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const admin = createAdminClient();
  const sharedPrimary = await usesSharedProfilesAsPrimary();
  const profileBefore = await loadPrimaryProfile(parsed.data.user_id);
  const note = "Manual admin override from Users page.";
  const now = new Date().toISOString();

  const { data: latestVerification, error } = await admin
    .from("vcard_verifications")
    .select("id, status")
    .eq("user_id", parsed.data.user_id)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw new Error(error.message);

  if (parsed.data.verified) {
    if (latestVerification && ["pending", "approved", "needs_more_info"].includes(latestVerification.status ?? "")) {
      if (latestVerification.status !== "approved") {
        const { error: updateError } = await admin
          .from("vcard_verifications")
          .update({
            status: "approved",
            reviewer_id: adminUser.id,
            reviewer_note: note,
            reason: null,
            decided_at: now,
          })
          .eq("id", latestVerification.id);
        if (updateError) throw new Error(updateError.message);
      }
    } else {
      const { error: insertError } = await admin.from("vcard_verifications").insert({
        user_id: parsed.data.user_id,
        method: "manual",
        status: "approved",
        reviewer_id: adminUser.id,
        reviewer_note: note,
        paid: false,
        decided_at: now,
      });
      if (insertError) throw new Error(insertError.message);
    }
  } else if (latestVerification && ["pending", "approved", "needs_more_info"].includes(latestVerification.status ?? "")) {
    const { error: updateError } = await admin
      .from("vcard_verifications")
      .update({
        status: "revoked",
        reviewer_id: adminUser.id,
        reviewer_note: note,
        reason: "Admin override",
        decided_at: now,
      })
      .eq("id", latestVerification.id);
    if (updateError) throw new Error(updateError.message);
  }

  if (!sharedPrimary) {
    const { error: profileError } = await admin
      .from("vcard_profile_ext")
      .update({ verified: parsed.data.verified })
      .eq("user_id", parsed.data.user_id);
    if (profileError) throw new Error(profileError.message);
  }

  await audit({
    action: parsed.data.verified ? "admin.user.verify" : "admin.user.unverify",
    actorId: adminUser.id,
    actorRole: adminUser.role,
    targetKind: "vcard_verifications",
    targetId: parsed.data.user_id,
    diff: {
      from: profileBefore?.verified === true,
      to: parsed.data.verified,
    },
  });

  await revalidateUserPaths(parsed.data.user_id);
}