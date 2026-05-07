"use client";

import { useTransition } from "react";

export function CreditsBuyButtons({
  sku,
  credits,
  price,
  testid,
}: {
  sku: string;
  credits: number;
  price: string;
  testid: string;
}) {
  const [pending, start] = useTransition();
  function buy() {
    start(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind: "shop", sku }),
        });
        const j = await res.json();
        if (j?.url) window.location.href = j.url as string;
      } catch {
        // ignore
      }
    });
  }
  return (
    <button
      type="button"
      onClick={buy}
      disabled={pending}
      className="card relative flex flex-col items-start gap-1 rounded-card border border-onyx-700 bg-onyx-950/60 p-4 text-left transition hover:border-gold/60 disabled:opacity-60"
      data-testid={testid}
    >
      <span className="text-xs uppercase tracking-widest text-ivory-mute">{credits} credits</span>
      <span className="font-display text-2xl text-gold-grad">{price}</span>
      <span className="text-xs text-ivory-mute">{(parseFloat(price.replace(/[^\d.]/g, "")) / credits).toFixed(2)}¢ per image</span>
      <span className="mt-2 inline-flex items-center gap-1 text-xs text-gold">
        {pending ? "Loading…" : "Buy →"}
      </span>
    </button>
  );
}
