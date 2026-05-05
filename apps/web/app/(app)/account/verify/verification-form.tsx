"use client";

import { useState } from "react";
import type { VerificationDocument, VerificationMethod } from "@/lib/verification";

type SubmitAction = (formData: FormData) => void | Promise<void>;

type FileDocumentKind = "government_id" | "selfie" | "business_registration" | "trademark_proof";
type TextDocumentKind = "domain_ownership" | "trademark_registration" | "submission_note";

type UploadedDocument = {
  kind: FileDocumentKind;
  mediaId: string;
  storagePath: string;
  bucket: "vcard-private" | "vcard-public";
  mime?: string;
  sizeBytes?: number;
  name?: string;
};

const FILE_LABELS: Record<FileDocumentKind, string> = {
  government_id: "Government ID",
  selfie: "Selfie with today’s code",
  business_registration: "Business registration",
  trademark_proof: "Trademark proof (optional)",
};

function fileDocumentFromDefaults(
  documents: VerificationDocument[],
  kind: FileDocumentKind
): UploadedDocument | undefined {
  const existing = documents.find((doc) => doc.kind === kind && doc.mediaId && doc.storagePath && doc.bucket);
  if (!existing?.mediaId || !existing.storagePath || !existing.bucket) return undefined;
  return {
    kind,
    mediaId: existing.mediaId,
    storagePath: existing.storagePath,
    bucket: existing.bucket,
    mime: existing.mime,
    sizeBytes: existing.sizeBytes,
    name: existing.name,
  };
}

function textDocumentFromDefaults(documents: VerificationDocument[], kind: TextDocumentKind) {
  return documents.find((doc) => doc.kind === kind)?.value ?? "";
}

function uploadErrorMessage(code: unknown) {
  switch (code) {
    case "mime_not_allowed":
      return "Upload a PDF or image file.";
    case "storage_quota_exceeded":
      return "Storage quota exceeded for this account.";
    case "too_large":
      return "That file is too large.";
    default:
      return "Upload failed. Try again.";
  }
}

export function VerificationForm({
  submitAction,
  verificationId,
  defaultMethod,
  defaultDocuments,
  status,
}: {
  submitAction: SubmitAction;
  verificationId: string;
  defaultMethod: VerificationMethod;
  defaultDocuments: VerificationDocument[];
  status: "pending" | "needs_more_info";
}) {
  const [method, setMethod] = useState<VerificationMethod>(defaultMethod);
  const [fileDocuments, setFileDocuments] = useState<Partial<Record<FileDocumentKind, UploadedDocument>>>(() => ({
    government_id: fileDocumentFromDefaults(defaultDocuments, "government_id"),
    selfie: fileDocumentFromDefaults(defaultDocuments, "selfie"),
    business_registration: fileDocumentFromDefaults(defaultDocuments, "business_registration"),
    trademark_proof: fileDocumentFromDefaults(defaultDocuments, "trademark_proof"),
  }));
  const [textDocuments, setTextDocuments] = useState<Record<TextDocumentKind, string>>(() => ({
    domain_ownership: textDocumentFromDefaults(defaultDocuments, "domain_ownership"),
    trademark_registration: textDocumentFromDefaults(defaultDocuments, "trademark_registration"),
    submission_note: textDocumentFromDefaults(defaultDocuments, "submission_note"),
  }));
  const [uploading, setUploading] = useState<Partial<Record<FileDocumentKind, boolean>>>({});
  const [error, setError] = useState<string | null>(null);

  const isUploading = Object.values(uploading).some(Boolean);
  const documentPayload: VerificationDocument[] = [
    ...(fileDocuments.government_id ? [fileDocuments.government_id] : []),
    ...(fileDocuments.selfie ? [fileDocuments.selfie] : []),
    ...(fileDocuments.business_registration ? [fileDocuments.business_registration] : []),
    ...(fileDocuments.trademark_proof ? [fileDocuments.trademark_proof] : []),
    ...(textDocuments.domain_ownership.trim()
      ? [{ kind: "domain_ownership", value: textDocuments.domain_ownership.trim() }]
      : []),
    ...(textDocuments.trademark_registration.trim()
      ? [{ kind: "trademark_registration", value: textDocuments.trademark_registration.trim() }]
      : []),
    ...(textDocuments.submission_note.trim()
      ? [{ kind: "submission_note", value: textDocuments.submission_note.trim() }]
      : []),
  ];

  const readyForSubmit =
    !isUploading &&
    ((method === "individual" && !!fileDocuments.government_id && !!fileDocuments.selfie) ||
      (method === "business" && !!fileDocuments.business_registration && !!textDocuments.domain_ownership.trim()) ||
      (method === "brand" && !!textDocuments.trademark_registration.trim()));

  async function uploadDocument(kind: FileDocumentKind, file: File) {
    const mediaKind = file.type.startsWith("image/") ? "image" : "file";
    if (mediaKind === "file" && file.type !== "application/pdf") {
      setError("Upload a PDF or image file.");
      return;
    }

    setError(null);
    setUploading((current) => ({ ...current, [kind]: true }));

    try {
      const signResponse = await fetch("/api/media/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          mime: file.type || "application/octet-stream",
          sizeBytes: file.size,
          kind: mediaKind,
          visibility: "private",
        }),
      });
      const signBody = await signResponse.json().catch(() => ({}));
      if (!signResponse.ok || !signBody.ok) {
        throw new Error(uploadErrorMessage(signBody.error));
      }

      const uploadResponse = await fetch(signBody.signedUrl as string, {
        method: "PUT",
        headers: { "content-type": file.type || "application/octet-stream" },
        body: file,
      });
      if (!uploadResponse.ok) throw new Error("Upload failed. Try again.");

      const finalizeResponse = await fetch("/api/media/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          bucket: signBody.bucket,
          path: signBody.path,
          kind: mediaKind,
          mime: file.type || "application/octet-stream",
          sizeBytes: file.size,
        }),
      });
      const finalizeBody = await finalizeResponse.json().catch(() => ({}));
      if (!finalizeResponse.ok || !finalizeBody.ok) {
        throw new Error(uploadErrorMessage(finalizeBody.error));
      }

      setFileDocuments((current) => ({
        ...current,
        [kind]: {
          kind,
          mediaId: finalizeBody.media.id as string,
          storagePath: finalizeBody.media.storage_path as string,
          bucket: finalizeBody.media.bucket as "vcard-private" | "vcard-public",
          mime: file.type || "application/octet-stream",
          sizeBytes: file.size,
          name: file.name,
        },
      }));
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : "Upload failed. Try again.");
    } finally {
      setUploading((current) => ({ ...current, [kind]: false }));
    }
  }

  return (
    <form action={submitAction} className="card space-y-6 p-6">
      <input type="hidden" name="verification_id" value={verificationId} />
      <input type="hidden" name="method" value={method} />
      <input type="hidden" name="documents" value={JSON.stringify(documentPayload)} readOnly />

      <div className="space-y-3">
        <p className="text-xs uppercase tracking-[0.2em] text-ivory-mute">Verification method</p>
        <div className="grid gap-3 md:grid-cols-3">
          {([
            ["individual", "Individual", "ID front and selfie"],
            ["business", "Business", "Registration doc and DNS proof"],
            ["brand", "Brand owner", "Trademark number and supporting proof"],
          ] as const).map(([value, label, blurb]) => (
            <button
              key={value}
              type="button"
              onClick={() => setMethod(value)}
              className={[
                "rounded-card border p-4 text-left transition",
                method === value ? "border-gold/70 bg-onyx-900/70" : "border-onyx-700/60 bg-onyx-950/40",
              ].join(" ")}
            >
              <p className="font-display text-lg text-ivory">{label}</p>
              <p className="mt-1 text-sm text-ivory-dim">{blurb}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-4 text-sm text-ivory-dim">
        <p>
          {status === "needs_more_info"
            ? "Update the requested proof below and resubmit."
            : "Uploads go to the private verification bucket and stay off your public profile."}
        </p>

        {method === "individual" && (
          <div className="grid gap-4 md:grid-cols-2">
            {(["government_id", "selfie"] as const).map((kind) => (
              <label key={kind} className="rounded-card border border-onyx-700/60 bg-onyx-950/40 p-4">
                <span className="block text-xs uppercase tracking-[0.2em] text-ivory-mute">{FILE_LABELS[kind]}</span>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  className="mt-3 block w-full text-sm text-ivory-dim file:mr-3 file:rounded-pill file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-onyx-950"
                  onChange={(event) => {
                    const file = event.currentTarget.files?.[0];
                    event.currentTarget.value = "";
                    if (file) void uploadDocument(kind, file);
                  }}
                />
                <p className="mt-2 text-xs text-ivory-mute">
                  {uploading[kind]
                    ? "Uploading..."
                    : fileDocuments[kind]?.name
                      ? `Uploaded: ${fileDocuments[kind]?.name}`
                      : "Required"}
                </p>
              </label>
            ))}
          </div>
        )}

        {method === "business" && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-card border border-onyx-700/60 bg-onyx-950/40 p-4">
              <span className="block text-xs uppercase tracking-[0.2em] text-ivory-mute">{FILE_LABELS.business_registration}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="mt-3 block w-full text-sm text-ivory-dim file:mr-3 file:rounded-pill file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-onyx-950"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void uploadDocument("business_registration", file);
                }}
              />
              <p className="mt-2 text-xs text-ivory-mute">
                {uploading.business_registration
                  ? "Uploading..."
                  : fileDocuments.business_registration?.name
                    ? `Uploaded: ${fileDocuments.business_registration?.name}`
                    : "Required"}
              </p>
            </label>

            <label className="rounded-card border border-onyx-700/60 bg-onyx-950/40 p-4">
              <span className="block text-xs uppercase tracking-[0.2em] text-ivory-mute">Domain ownership proof</span>
              <textarea
                rows={4}
                value={textDocuments.domain_ownership}
                onChange={(event) =>
                  setTextDocuments((current) => ({ ...current, domain_ownership: event.target.value }))
                }
                placeholder="Paste the TXT record, registrar screenshot details, or the exact domain you control."
                className="input mt-3 w-full"
              />
            </label>
          </div>
        )}

        {method === "brand" && (
          <div className="grid gap-4 md:grid-cols-2">
            <label className="rounded-card border border-onyx-700/60 bg-onyx-950/40 p-4">
              <span className="block text-xs uppercase tracking-[0.2em] text-ivory-mute">Trademark registration number</span>
              <input
                value={textDocuments.trademark_registration}
                onChange={(event) =>
                  setTextDocuments((current) => ({ ...current, trademark_registration: event.target.value }))
                }
                placeholder="USPTO / WIPO / registration reference"
                className="input mt-3 w-full"
              />
            </label>

            <label className="rounded-card border border-onyx-700/60 bg-onyx-950/40 p-4">
              <span className="block text-xs uppercase tracking-[0.2em] text-ivory-mute">{FILE_LABELS.trademark_proof}</span>
              <input
                type="file"
                accept="image/*,application/pdf"
                className="mt-3 block w-full text-sm text-ivory-dim file:mr-3 file:rounded-pill file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-onyx-950"
                onChange={(event) => {
                  const file = event.currentTarget.files?.[0];
                  event.currentTarget.value = "";
                  if (file) void uploadDocument("trademark_proof", file);
                }}
              />
              <p className="mt-2 text-xs text-ivory-mute">
                {uploading.trademark_proof
                  ? "Uploading..."
                  : fileDocuments.trademark_proof?.name
                    ? `Uploaded: ${fileDocuments.trademark_proof?.name}`
                    : "Optional"}
              </p>
            </label>
          </div>
        )}

        <label className="block">
          <span className="block text-xs uppercase tracking-[0.2em] text-ivory-mute">Extra context for the reviewer</span>
          <textarea
            rows={3}
            value={textDocuments.submission_note}
            onChange={(event) =>
              setTextDocuments((current) => ({ ...current, submission_note: event.target.value }))
            }
            placeholder="Anything the reviewer should know before approving the badge."
            className="input mt-3 w-full"
          />
        </label>
      </div>

      {error && <p className="text-sm text-rose-300">{error}</p>}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-ivory-mute">
          {readyForSubmit
            ? "Everything required for this method is attached."
            : "Finish the required fields for the selected method before sending for review."}
        </p>
        <button type="submit" disabled={!readyForSubmit} className="btn-gold inline-flex disabled:cursor-not-allowed disabled:opacity-60">
          {status === "needs_more_info" ? "Resubmit for review" : "Send for review"}
        </button>
      </div>
    </form>
  );
}