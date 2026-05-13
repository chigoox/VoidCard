import "client-only";

export type UploadedMediaAsset = {
  id: string;
  kind: "image" | "video";
  mime: string | null;
  url: string;
  createdAt: string;
};

export function uploadErrorMessage(code: unknown) {
  switch (code) {
    case "mime_not_allowed":
      return "That file type is not allowed.";
    case "storage_quota_exceeded":
      return "Storage quota exceeded for this account.";
    case "too_large":
      return "That file is too large.";
    default:
      return "Upload failed. Try again.";
  }
}

export async function uploadMediaAsset(file: File, kind: "image" | "video"): Promise<UploadedMediaAsset> {
  const signResponse = await fetch("/api/media/sign", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      filename: file.name,
      mime: file.type || "application/octet-stream",
      sizeBytes: file.size,
      kind,
      visibility: "public",
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
  if (!uploadResponse.ok) {
    throw new Error("Upload failed. Try again.");
  }

  const finalizeResponse = await fetch("/api/media/finalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      bucket: signBody.bucket,
      path: signBody.path,
      kind,
      mime: file.type || "application/octet-stream",
      sizeBytes: file.size,
    }),
  });
  const finalizeBody = await finalizeResponse.json().catch(() => ({}));
  if (!finalizeResponse.ok || !finalizeBody.ok || typeof finalizeBody.url !== "string") {
    throw new Error(uploadErrorMessage(finalizeBody.error));
  }

  return {
    id: String(finalizeBody.media.id),
    kind,
    mime: file.type || null,
    url: finalizeBody.url as string,
    createdAt: new Date().toISOString(),
  };
}
