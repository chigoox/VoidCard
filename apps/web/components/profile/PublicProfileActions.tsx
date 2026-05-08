"use client";

import { Download, Share2 } from "lucide-react";
import { useState } from "react";

export function PublicProfileActions({
  displayName,
  profileUrl,
  vcardUrl,
}: {
  displayName: string;
  profileUrl: string;
  vcardUrl: string;
}) {
  const [copied, setCopied] = useState(false);

  async function shareProfile() {
    const shareData = {
      title: displayName,
      text: `${displayName} on VoidCard`,
      url: profileUrl,
    };
    try {
      if (navigator.share) {
        await navigator.share(shareData);
        return;
      }
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      try {
        await navigator.clipboard.writeText(profileUrl);
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1800);
      } catch {}
    }
  }

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2" data-vc-profile-actions>
      <a
        href={vcardUrl}
        className="inline-flex min-h-12 items-center justify-center gap-2 rounded-card bg-[#5fd96f] px-4 py-3 text-sm font-semibold text-[#06230b] shadow-[0_12px_32px_-18px_rgba(95,217,111,0.8)] transition hover:brightness-105 active:scale-[0.99]"
        data-testid="public-save-contact"
      >
        <Download className="size-4" aria-hidden />
        Save Contact
      </a>
      <button
        type="button"
        onClick={shareProfile}
        className="inline-flex min-h-12 min-w-12 items-center justify-center rounded-card bg-[#5fd96f] px-3 text-[#06230b] shadow-[0_12px_32px_-18px_rgba(95,217,111,0.8)] transition hover:brightness-105 active:scale-[0.98]"
        aria-label={copied ? "Profile link copied" : "Share profile"}
        data-testid="public-share-profile"
      >
        <Share2 className="size-4" aria-hidden />
      </button>
      {copied ? <p className="col-span-2 text-center text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>Link copied</p> : null}
    </div>
  );
}
