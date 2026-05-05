"use server";

import { createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendVerificationLifecycleEmail } from "@/lib/verification-email";
import {
  VERIFICATION_METHODS,
  VERIFICATION_RETRY_DAYS,
  type VerificationDocument,
  type VerificationRiskFlag,
} from "@/lib/verification";

const ACTIVE_STATUSES = new Set(["pending", "approved", "needs_more_info"]);
const FILE_DOCUMENT_KINDS = new Set([
  "government_id",
  "selfie",
  "business_registration",
  "trademark_proof",
]);
const RISK_RETRY_LOOKBACK_DAYS = 7;

type MediaRow = {
  id: string;
  bucket: "vcard-private" | "vcard-public";
  storage_path: string;
  mime: string | null;
  size_bytes: number;
};

type VerificationHashMatch = {
  user_id: string;
  verification_id: string;
  sha256: string;
};

type VerificationDocumentHash = {
  kind: string;
  mediaId: string;
  sha256: string;
};

const DocumentSchema = z.object({
  kind: z.string().min(1).max(60),
  mediaId: z.string().uuid().optional(),
  storagePath: z.string().min(1).max(500).optional(),
  bucket: z.enum(["vcard-private", "vcard-public"]).optional(),
  mime: z.string().min(1).max(100).optional(),
  sizeBytes: z.number().int().positive().optional(),
  name: z.string().min(1).max(200).optional(),
  value: z.string().min(1).max(500).optional(),
});

const SubmitSchema = z.object({
  verification_id: z.string().uuid(),
  method: z.enum(VERIFICATION_METHODS),
  documents: z.string().min(2).max(20_000),
});

function hasDocumentKind(documents: z.infer<typeof DocumentSchema>[], kind: string) {
  return documents.some((doc) => doc.kind === kind);
}

function hasDocumentValue(documents: z.infer<typeof DocumentSchema>[], kind: string) {
  return documents.some((doc) => doc.kind === kind && !!doc.value?.trim());
}

function assertMethodRequirements(method: z.infer<typeof SubmitSchema>["method"], documents: z.infer<typeof DocumentSchema>[]) {
  if (method === "individual") {
    if (!hasDocumentKind(documents, "government_id") || !hasDocumentKind(documents, "selfie")) {
      throw new Error("Upload your ID and selfie before submitting.");
    }
    return;
  }

  if (method === "business") {
    if (!hasDocumentKind(documents, "business_registration")) {
      throw new Error("Upload your business registration document before submitting.");
    }
    if (!hasDocumentValue(documents, "domain_ownership")) {
      throw new Error("Enter the domain ownership proof before submitting.");
    }
    return;
  }

  if (!hasDocumentValue(documents, "trademark_registration")) {
    throw new Error("Enter the trademark registration number before submitting.");
  }
}

async function hashUploadedVerificationDocument(
  admin: ReturnType<typeof createAdminClient>,
  document: VerificationDocument
): Promise<VerificationDocumentHash | null> {
  if (!document.mediaId || !document.storagePath || !document.bucket) {
    return null;
  }

  const { data, error } = await admin.storage.from(document.bucket).download(document.storagePath);
  if (error || !data) {
    throw new Error(error?.message ?? `Unable to hash ${document.kind}.`);
  }

  const buffer = Buffer.from(await data.arrayBuffer());
  return {
    kind: document.kind,
    mediaId: document.mediaId,
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

export async function submitVerification(formData: FormData) {
  const user = await requireUser();
  if (user.verified) throw new Error("Your account is already verified.");

  const parsed = SubmitSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((issue) => issue.message).join("; "));
  }

  let rawDocuments: z.infer<typeof DocumentSchema>[];
  try {
    rawDocuments = z.array(DocumentSchema).max(8).parse(JSON.parse(parsed.data.documents));
  } catch {
    throw new Error("Verification documents were not understood. Re-upload and try again.");
  }

  assertMethodRequirements(parsed.data.method, rawDocuments);

  const admin = createAdminClient();
  const { data: verification, error: verificationError } = await admin
    .from("vcard_verifications")
    .select("id, user_id, status, paid")
    .eq("id", parsed.data.verification_id)
    .eq("user_id", user.id)
    .maybeSingle();
  if (verificationError || !verification) {
    throw new Error(verificationError?.message ?? "Verification request not found.");
  }

  if (!ACTIVE_STATUSES.has(verification.status)) {
    throw new Error("Open a new verification request after checkout.");
  }

  const since = new Date(Date.now() - VERIFICATION_RETRY_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { count } = await admin
    .from("vcard_verifications")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id)
    .gte("submitted_at", since);
  if ((count ?? 0) > 3) {
    throw new Error("You have hit the verification submission limit for the last 30 days.");
  }

  const mediaIds = Array.from(
    new Set(rawDocuments.flatMap((doc) => (doc.mediaId ? [doc.mediaId] : [])))
  );
  const mediaRows = mediaIds.length
    ? await admin
        .from("vcard_media")
        .select("id, bucket, storage_path, mime, size_bytes")
        .eq("user_id", user.id)
        .in("id", mediaIds)
    : { data: [], error: null };
  if (mediaRows.error) throw new Error(mediaRows.error.message);

  const mediaById = new Map(
    (((mediaRows.data as MediaRow[] | null) ?? [])).map((media) => [media.id, media])
  );

  const sanitizedDocuments: VerificationDocument[] = rawDocuments.map((doc) => {
    if (FILE_DOCUMENT_KINDS.has(doc.kind)) {
      if (!doc.mediaId) throw new Error(`Missing uploaded file for ${doc.kind}.`);
      const media = mediaById.get(doc.mediaId);
      if (!media) throw new Error(`Upload record missing for ${doc.kind}.`);
      if (doc.storagePath && doc.storagePath !== media.storage_path) {
        throw new Error(`Upload path mismatch for ${doc.kind}.`);
      }
      return {
        kind: doc.kind,
        mediaId: media.id,
        storagePath: media.storage_path,
        bucket: media.bucket,
        mime: media.mime ?? undefined,
        sizeBytes: Number(media.size_bytes ?? 0),
        name: doc.name?.trim() || undefined,
      };
    }

    return {
      kind: doc.kind,
      value: doc.value?.trim(),
      name: doc.name?.trim() || undefined,
    };
  });

  const hashedDocuments = (
    await Promise.all(
      sanitizedDocuments.map((document) => hashUploadedVerificationDocument(admin, document))
    )
  ).flatMap((document) => (document ? [document] : []));

  const hashValues = Array.from(new Set(hashedDocuments.map((document) => document.sha256)));
  const { data: priorHashData, error: priorHashError } = hashValues.length
    ? await admin
        .from("vcard_verification_document_hashes")
        .select("user_id, verification_id, sha256")
        .in("sha256", hashValues)
        .neq("verification_id", verification.id)
    : { data: [], error: null };
  if (priorHashError) throw new Error(priorHashError.message);

  const retryCutoff = new Date(Date.now() - RISK_RETRY_LOOKBACK_DAYS * 24 * 60 * 60 * 1000).toISOString();
  const { data: recentRetryData, error: recentRetryError } = await admin
    .from("vcard_verifications")
    .select("id")
    .eq("user_id", user.id)
    .in("status", ["rejected", "revoked"])
    .not("decided_at", "is", null)
    .gte("decided_at", retryCutoff)
    .limit(1);
  if (recentRetryError) throw new Error(recentRetryError.message);

  const priorHashRows = (priorHashData as VerificationHashMatch[] | null) ?? [];
  const riskFlags = new Set<VerificationRiskFlag>();
  let riskScore = 0;
  const addRisk = (flag: VerificationRiskFlag, score: number) => {
    if (riskFlags.has(flag)) return;
    riskFlags.add(flag);
    riskScore += score;
  };

  if (hashValues.length !== hashedDocuments.length) {
    addRisk("duplicate_files_in_submission", 35);
  }
  if (priorHashRows.some((row) => row.user_id !== user.id)) {
    addRisk("cross_account_document_match", 90);
  }
  if (priorHashRows.some((row) => row.user_id === user.id)) {
    addRisk("repeat_document_submission", 15);
  }
  if ((count ?? 0) >= 2) {
    addRisk("high_submission_velocity", 20);
  }
  if ((recentRetryData?.length ?? 0) > 0) {
    addRisk("recent_rejection_retry", 20);
  }

  const now = new Date().toISOString();
  const { error } = await admin
    .from("vcard_verifications")
    .update({
      method: parsed.data.method,
      status: "pending",
      documents: sanitizedDocuments,
      document_hashes: hashedDocuments,
      reviewer_note: null,
      reason: null,
      decided_at: null,
      risk_flags: Array.from(riskFlags),
      risk_score: riskScore,
      submitted_at: now,
    })
    .eq("id", verification.id);
  if (error) throw new Error(error.message);

  const { error: deleteHashesError } = await admin
    .from("vcard_verification_document_hashes")
    .delete()
    .eq("verification_id", verification.id);
  if (deleteHashesError) throw new Error(deleteHashesError.message);

  if (hashedDocuments.length > 0) {
    const { error: insertHashesError } = await admin.from("vcard_verification_document_hashes").insert(
      hashedDocuments.map((document) => ({
        verification_id: verification.id,
        user_id: user.id,
        media_id: document.mediaId,
        document_kind: document.kind,
        sha256: document.sha256,
      }))
    );
    if (insertHashesError) throw new Error(insertHashesError.message);
  }

  await audit({
    action: "verification.submit",
    actorId: user.id,
    targetKind: "vcard_verifications",
    targetId: verification.id,
    diff: {
      method: parsed.data.method,
      paid: verification.paid,
      documentKinds: sanitizedDocuments.map((doc) => doc.kind),
      riskFlags: Array.from(riskFlags),
      riskScore,
    },
  });

  if (user.email) {
    const mail = await sendVerificationLifecycleEmail({
      to: user.email,
      username: user.username,
      kind: "submitted",
    });
    if (!mail.ok) {
      console.error("[verification.email] submit send failed", mail.error);
    }
  }

  revalidatePath("/account");
  revalidatePath("/account/verify");
  revalidatePath("/dashboard");
  revalidatePath("/admin/verifications");
}