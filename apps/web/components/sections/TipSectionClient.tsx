"use client";

import "client-only";

import { useState, useTransition } from "react";

const SURFACE_BORDER = "color-mix(in srgb, var(--vc-accent, #d4af37) 24%, transparent)";

export function TipSectionClient({
  stripeAccountId,
  amounts,
  username,
}: {
  stripeAccountId: string;
  amounts: number[];
  username?: string;
}) {
  const [pendingAmount, setPendingAmount] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const connected = /^acct_[A-Za-z0-9]+$/.test(stripeAccountId);

  function startTip(amountCents: number) {
    if (!connected) {
      setError("Tips are not connected yet.");
      return;
    }

    setError(null);
    setPendingAmount(amountCents);
    start(async () => {
      try {
        const response = await fetch("/api/stripe/tip/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ stripeAccountId, amountCents, profileUsername: username }),
        });
        const body = (await response.json().catch(() => ({}))) as { ok?: boolean; url?: string; error?: string };
        if (body.ok && body.url) {
          window.location.assign(body.url);
          return;
        }
        setError(body.error === "seller_not_ready" ? "Tips are not ready for this profile yet." : "Could not open tip checkout.");
      } catch {
        setError("Could not open tip checkout.");
      } finally {
        setPendingAmount(null);
      }
    });
  }

  return (
    <div
      className="p-4"
      style={{
        background: "var(--vc-bg-2, #141414)",
        border: `1px solid ${SURFACE_BORDER}`,
        borderRadius: "var(--vc-radius, 14px)",
        color: "var(--vc-fg, #f7f3ea)",
        boxShadow: "0 18px 48px -28px rgba(0, 0, 0, 0.45)",
      }}
    >
      <p className="mb-2 text-sm uppercase tracking-widest" style={{ color: "var(--vc-accent, #d4af37)" }}>Leave a tip</p>
      <div className="flex gap-2">
        {amounts.map((amount) => (
          <button
            key={amount}
            type="button"
            className="flex-1 rounded-pill px-3 py-2.5 text-sm disabled:cursor-not-allowed disabled:opacity-55"
            style={{
              border: `1px solid ${SURFACE_BORDER}`,
              borderRadius: "var(--vc-radius, 14px)",
              color: "var(--vc-accent, #d4af37)",
              background: "transparent",
            }}
            onClick={() => startTip(amount)}
            disabled={pending || !connected}
            data-testid={`tip-${amount}`}
          >
            {pendingAmount === amount ? "Opening..." : `$${(amount / 100).toFixed(0)}`}
          </button>
        ))}
      </div>
      {error ? <p className="mt-2 text-xs" style={{ color: "#fca5a5" }}>{error}</p> : null}
    </div>
  );
}