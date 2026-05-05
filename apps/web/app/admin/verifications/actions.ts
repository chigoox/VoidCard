"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { sendVerificationLifecycleEmail } from "@/lib/verification-email";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";

const ReviewSchema = z.object({
  id: z.string().uuid(),
  decision: z.enum(["approve", "reject", "needs_more_info", "revoke"]),
  reviewer_note: z.string().max(2000).optional(),
  reason: z.string().max(500).optional(),
});

export async function reviewVerification(formData: FormData) {
  const adminUser = await requireAdmin();
  const parsed = ReviewSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  const admin = createAdminClient();
  const { data: verification, error: verificationError } = await admin
    .from("vcard_verifications")
    .select("id, user_id, status, paid, stripe_payment_intent")
    .eq("id", parsed.data.id)
    .maybeSingle();
  if (verificationError || !verification) {
    throw new Error(verificationError?.message ?? "Verification request not found.");
  }

  const { data: profile } = await admin
    .from("vcard_profile_ext")
    .select("username")
    .eq("user_id", verification.user_id)
    .maybeSingle();

  const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(verification.user_id);
  if (authUserError) {
    console.error("[verification.email] could not load auth user", authUserError.message);
  }
  const recipientEmail = authUserData.user?.email ?? null;

  const reviewer_note = parsed.data.reviewer_note?.trim() || null;
  const reason = parsed.data.reason?.trim() || null;
  const now = new Date().toISOString();

  if (parsed.data.decision === "approve") {
    const { error } = await admin
      .from("vcard_verifications")
      .update({
        status: "approved",
        reviewer_id: adminUser.id,
        reviewer_note,
        reason: null,
        decided_at: now,
      })
      .eq("id", verification.id);
    if (error) throw new Error(error.message);

    const { error: profileError } = await admin
      .from("vcard_profile_ext")
      .update({ verified: true })
      .eq("user_id", verification.user_id);
    if (profileError) throw new Error(profileError.message);

    await audit({
      action: "verification.approve",
      actorId: adminUser.id,
      actorRole: adminUser.role,
      targetKind: "vcard_verifications",
      targetId: verification.id,
      diff: { user_id: verification.user_id },
    });

    if (recipientEmail) {
      const mail = await sendVerificationLifecycleEmail({
        to: recipientEmail,
        username: profile?.username,
        kind: "approved",
        reviewerNote: reviewer_note,
      });
      if (!mail.ok) console.error("[verification.email] approve send failed", mail.error);
    }
  }

  if (parsed.data.decision === "needs_more_info") {
    const { error } = await admin
      .from("vcard_verifications")
      .update({
        status: "needs_more_info",
        reviewer_id: adminUser.id,
        reviewer_note,
        reason: null,
        decided_at: null,
      })
      .eq("id", verification.id);
    if (error) throw new Error(error.message);

    await audit({
      action: "verification.needs_more_info",
      actorId: adminUser.id,
      actorRole: adminUser.role,
      targetKind: "vcard_verifications",
      targetId: verification.id,
      diff: { user_id: verification.user_id },
    });

    if (recipientEmail) {
      const mail = await sendVerificationLifecycleEmail({
        to: recipientEmail,
        username: profile?.username,
        kind: "needs_more_info",
        reviewerNote: reviewer_note,
      });
      if (!mail.ok) console.error("[verification.email] needs-more-info send failed", mail.error);
    }
  }

  if (parsed.data.decision === "reject") {
    let refunded = false;
    if (verification.paid && verification.stripe_payment_intent) {
      await stripe.refunds.create({
        payment_intent: verification.stripe_payment_intent,
        reason: "requested_by_customer",
      });
      refunded = true;
    }

    const { error } = await admin
      .from("vcard_verifications")
      .update({
        status: "rejected",
        reviewer_id: adminUser.id,
        reviewer_note,
        reason,
        decided_at: now,
      })
      .eq("id", verification.id);
    if (error) throw new Error(error.message);

    const { error: profileError } = await admin
      .from("vcard_profile_ext")
      .update({ verified: false })
      .eq("user_id", verification.user_id);
    if (profileError) throw new Error(profileError.message);

    await audit({
      action: "verification.reject",
      actorId: adminUser.id,
      actorRole: adminUser.role,
      targetKind: "vcard_verifications",
      targetId: verification.id,
      diff: { user_id: verification.user_id, refunded },
    });

    if (recipientEmail) {
      const mail = await sendVerificationLifecycleEmail({
        to: recipientEmail,
        username: profile?.username,
        kind: "rejected",
        reviewerNote: reviewer_note,
        reason,
        refunded,
      });
      if (!mail.ok) console.error("[verification.email] reject send failed", mail.error);
    }
  }

  if (parsed.data.decision === "revoke") {
    const { error } = await admin
      .from("vcard_verifications")
      .update({
        status: "revoked",
        reviewer_id: adminUser.id,
        reviewer_note,
        reason,
        decided_at: now,
      })
      .eq("id", verification.id);
    if (error) throw new Error(error.message);

    const { error: profileError } = await admin
      .from("vcard_profile_ext")
      .update({ verified: false })
      .eq("user_id", verification.user_id);
    if (profileError) throw new Error(profileError.message);

    await audit({
      action: "verification.revoke",
      actorId: adminUser.id,
      actorRole: adminUser.role,
      targetKind: "vcard_verifications",
      targetId: verification.id,
      diff: { user_id: verification.user_id },
    });

    if (recipientEmail) {
      const mail = await sendVerificationLifecycleEmail({
        to: recipientEmail,
        username: profile?.username,
        kind: "revoked",
        reviewerNote: reviewer_note,
        reason,
      });
      if (!mail.ok) console.error("[verification.email] revoke send failed", mail.error);
    }
  }

  revalidatePath("/admin/verifications");
  revalidatePath("/account");
  revalidatePath("/account/verify");
  revalidatePath("/dashboard");
  if (profile?.username) revalidatePath(`/u/${profile.username}`);
}