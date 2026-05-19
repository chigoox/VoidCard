import "client-only";

export type UploadedMediaAsset = {
  id: string;
  kind: "image" | "video";
  mime: string | null;
  url: string;
  createdAt: string;
};

type UploadMediaAssetOptions = {
  onProgress?: (progress: number) => void;
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

function uploadSignedFile(
  signedUrl: string,
  file: File,
  contentType: string,
  onProgress?: (progress: number) => void,
) {
  return new Promise<void>((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open("PUT", signedUrl);
    xhr.setRequestHeader("content-type", contentType);
    xhr.upload.onprogress = (event) => {
      if (!onProgress || !event.lengthComputable || event.total <= 0) return;
      onProgress(Math.max(0, Math.min(100, Math.round((event.loaded / event.total) * 100))));
    };
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        onProgress?.(100);
        resolve();
        return;
      }
      reject(new Error("Upload failed. Try again."));
    };
    xhr.onerror = () => reject(new Error("Upload failed. Try again."));
    xhr.onabort = () => reject(new Error("Upload cancelled."));
    xhr.send(file);
  });
}

export async function uploadMediaAsset(
  file: File,
  kind: "image" | "video",
  options: UploadMediaAssetOptions = {},
): Promise<UploadedMediaAsset> {
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

  options.onProgress?.(0);
  await uploadSignedFile(
    signBody.signedUrl as string,
    file,
    file.type || "application/octet-stream",
    options.onProgress,
  );

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
