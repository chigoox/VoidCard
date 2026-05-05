export const VERIFICATION_METHODS = ["individual", "business", "brand"] as const;

export type VerificationMethod = (typeof VERIFICATION_METHODS)[number];

export const VERIFICATION_RISK_FLAGS = [
  "cross_account_document_match",
  "repeat_document_submission",
  "duplicate_files_in_submission",
  "high_submission_velocity",
  "recent_rejection_retry",
] as const;

export type VerificationRiskFlag = (typeof VERIFICATION_RISK_FLAGS)[number];

export const ACTIVE_VERIFICATION_STATUSES = ["pending", "approved", "needs_more_info"] as const;

export const VERIFICATION_RETRY_DAYS = 30;

export type VerificationDocument = {
  kind: string;
  mediaId?: string;
  storagePath?: string;
  bucket?: "vcard-private" | "vcard-public";
  mime?: string;
  sizeBytes?: number;
  name?: string;
  value?: string;
};

function asNonEmptyString(value: unknown, maxLength: number): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;
  return trimmed.slice(0, maxLength);
}

export function isActiveVerificationStatus(status: string): status is (typeof ACTIVE_VERIFICATION_STATUSES)[number] {
  return (ACTIVE_VERIFICATION_STATUSES as readonly string[]).includes(status);
}

export function coerceVerificationRiskFlags(input: unknown): VerificationRiskFlag[] {
  if (!Array.isArray(input)) return [];

  const allowedFlags = new Set<string>(VERIFICATION_RISK_FLAGS);
  return input.flatMap((entry) => {
    if (typeof entry !== "string") return [];
    return allowedFlags.has(entry) ? [entry as VerificationRiskFlag] : [];
  });
}

export function coerceVerificationDocuments(input: unknown): VerificationDocument[] {
  if (!Array.isArray(input)) return [];

  return input.flatMap((entry) => {
    if (!entry || typeof entry !== "object") return [];

    const doc = entry as Record<string, unknown>;
    const kind = asNonEmptyString(doc.kind, 60);
    if (!kind) return [];

    const normalized: VerificationDocument = { kind };
    const mediaId = asNonEmptyString(doc.mediaId, 36);
    const storagePath = asNonEmptyString(doc.storagePath, 500);
    const bucket = doc.bucket === "vcard-private" || doc.bucket === "vcard-public" ? doc.bucket : undefined;
    const mime = asNonEmptyString(doc.mime, 100);
    const name = asNonEmptyString(doc.name, 200);
    const value = asNonEmptyString(doc.value, 500);

    if (mediaId) normalized.mediaId = mediaId;
    if (storagePath) normalized.storagePath = storagePath;
    if (bucket) normalized.bucket = bucket;
    if (mime) normalized.mime = mime;
    if (typeof doc.sizeBytes === "number" && Number.isFinite(doc.sizeBytes) && doc.sizeBytes > 0) {
      normalized.sizeBytes = Math.round(doc.sizeBytes);
    }
    if (name) normalized.name = name;
    if (value) normalized.value = value;

    return [normalized];
  });
}