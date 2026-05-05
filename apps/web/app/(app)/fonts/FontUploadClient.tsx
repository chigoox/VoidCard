"use client";

import "client-only";

import { useState, useTransition } from "react";
import { createFontRecord } from "./actions";

type UploadState = {
  family: string;
  weight: string;
  style: "normal" | "italic";
  file: File | null;
};

function uploadErrorMessage(code: unknown) {
  switch (code) {
    case "mime_not_allowed":
      return "Upload a .woff2 font file.";
    case "storage_quota_exceeded":
      return "Storage quota exceeded for this account.";
    case "too_large":
      return "That font file is too large.";
    default:
      return "Upload failed. Try again.";
  }
}

export default function FontUploadClient() {
  const [state, setState] = useState<UploadState>({
    family: "",
    weight: "400",
    style: "normal",
    file: null,
  });
  const [message, setMessage] = useState<string | null>(null);
  const [pending, start] = useTransition();

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!state.file) {
      setMessage("Choose a .woff2 file first.");
      return;
    }

    start(async () => {
      try {
        const signResponse = await fetch("/api/media/sign", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            filename: state.file?.name,
            mime: state.file?.type || "font/woff2",
            sizeBytes: state.file?.size,
            kind: "file",
            visibility: "public",
          }),
        });
        const signBody = await signResponse.json().catch(() => ({}));
        if (!signResponse.ok || !signBody.ok) {
          throw new Error(uploadErrorMessage(signBody.error));
        }

        const uploadResponse = await fetch(signBody.signedUrl as string, {
          method: "PUT",
          headers: { "content-type": state.file?.type || "font/woff2" },
          body: state.file,
        });
        if (!uploadResponse.ok) throw new Error("Upload failed. Try again.");

        const finalizeResponse = await fetch("/api/media/finalize", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            bucket: signBody.bucket,
            path: signBody.path,
            kind: "file",
            mime: state.file?.type || "font/woff2",
            sizeBytes: state.file?.size,
          }),
        });
        const finalizeBody = await finalizeResponse.json().catch(() => ({}));
        if (!finalizeResponse.ok || !finalizeBody.ok || typeof finalizeBody.url !== "string") {
          throw new Error(uploadErrorMessage(finalizeBody.error));
        }

        await createFontRecord({
          family: state.family,
          weight: Number(state.weight),
          style: state.style,
          url: finalizeBody.url,
          bytes: state.file?.size,
        });
        setState({ family: "", weight: "400", style: "normal", file: null });
        setMessage("Uploaded.");
        window.location.reload();
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Upload failed. Try again.");
      }
    });
  }

  return (
    <form onSubmit={onSubmit} className="card flex flex-wrap items-end gap-3 p-4" data-testid="font-create-form">
      <div>
        <label className="block text-xs uppercase tracking-widest text-ivory-mute">Family name</label>
        <input
          value={state.family}
          onChange={(event) => setState((current) => ({ ...current, family: event.target.value }))}
          required
          maxLength={80}
          className="input"
          placeholder="My Sans"
          data-testid="font-family-input"
        />
      </div>
      <div>
        <label className="block text-xs uppercase tracking-widest text-ivory-mute">Weight</label>
        <select
          value={state.weight}
          onChange={(event) => setState((current) => ({ ...current, weight: event.target.value }))}
          className="input"
          data-testid="font-weight-input"
        >
          <option value="100">100</option>
          <option value="300">300</option>
          <option value="400">400</option>
          <option value="500">500</option>
          <option value="600">600</option>
          <option value="700">700</option>
          <option value="900">900</option>
        </select>
      </div>
      <div>
        <label className="block text-xs uppercase tracking-widest text-ivory-mute">Style</label>
        <select
          value={state.style}
          onChange={(event) => setState((current) => ({ ...current, style: event.target.value as "normal" | "italic" }))}
          className="input"
          data-testid="font-style-input"
        >
          <option value="normal">normal</option>
          <option value="italic">italic</option>
        </select>
      </div>
      <div className="min-w-[240px] flex-1">
        <label className="block text-xs uppercase tracking-widest text-ivory-mute">WOFF2 file</label>
        <input
          type="file"
          accept=".woff2,font/woff2"
          className="mt-1 block w-full text-sm text-ivory-dim file:mr-3 file:rounded-pill file:border-0 file:bg-gold file:px-3 file:py-1.5 file:text-onyx-950"
          data-testid="font-file-input"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0] ?? null;
            setState((current) => ({ ...current, file }));
          }}
        />
      </div>
      <button type="submit" className="btn-primary" data-testid="font-create-submit" disabled={pending}>
        {pending ? "Uploading…" : "Upload font"}
      </button>
      {message ? <span className="text-xs text-ivory-mute" data-testid="font-upload-message">{message}</span> : null}
    </form>
  );
}