"use client";

import { Download, Share2 } from "lucide-react";
import { useState } from "react";

export function PublicProfileActions({
  displayName,
  profileUrl,
  vcardUrl,
  showSaveContact = true,
}: {
  displayName: string;
  profileUrl: string;
  vcardUrl: string;
  showSaveContact?: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const actionStyle = {
    background: "var(--vc-accent, #d4af37)",
    color: "var(--vc-bg, #0a0a0a)",
    boxShadow: "0 12px 32px -18px color-mix(in srgb, var(--vc-accent, #d4af37) 80%, transparent)",
  };

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
    <div className={showSaveContact ? "grid grid-cols-[minmax(0,1fr)_auto] gap-2" : "grid grid-cols-1 gap-2"} data-vc-profile-actions>
      {showSaveContact ? (
        <a
          href={vcardUrl}
          className="inline-flex min-h-12 items-center justify-center gap-2 rounded-card px-4 py-3 text-sm font-semibold transition hover:brightness-105 active:scale-[0.99]"
          style={actionStyle}
          data-testid="public-save-contact"
        >
          <Download className="size-4" aria-hidden />
          Save Contact
        </a>
      ) : null}
      <button
        type="button"
        onClick={shareProfile}
        className={showSaveContact ? "inline-flex min-h-12 min-w-12 items-center justify-center rounded-card px-3 transition hover:brightness-105 active:scale-[0.98]" : "inline-flex min-h-12 items-center justify-center gap-2 rounded-card px-4 py-3 text-sm font-semibold transition hover:brightness-105 active:scale-[0.98]"}
        style={actionStyle}
        aria-label={copied ? "Profile link copied" : "Share profile"}
        data-testid="public-share-profile"
      >
        <Share2 className="size-4" aria-hidden />
        {showSaveContact ? null : <span>Share Profile</span>}
      </button>
      {copied ? <p className={showSaveContact ? "col-span-2 text-center text-xs" : "text-center text-xs"} style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>Link copied</p> : null}
    </div>
  );
}
