"use client";
import { useTransition } from "react";

export function CheckoutButton({
  kind, sku, plan, label, className = "btn-gold", referral,
}: {
  kind: "shop" | "subscribe";
  sku?: string;
  plan?: string;
  label: string;
  className?: string;
  referral?: string;
}) {
  const [pending, start] = useTransition();
  function fallbackNext() {
    if (kind === "shop") {
      return sku === "verified-badge" ? "/account/verify" : `/shop/${sku}`;
    }
    return `/billing/${plan}`;
  }
  function go() {
    start(async () => {
      try {
        const res = await fetch("/api/stripe/checkout", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ kind, sku, plan, referral }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.url) {
          window.location.href = data.url;
        } else {
          // Fallback: send to signup with desired next route.
          const next = fallbackNext();
          window.location.href = `/signup?next=${encodeURIComponent(next)}`;
        }
      } catch {
        const next = fallbackNext();
        window.location.href = `/signup?next=${encodeURIComponent(next)}`;
      }
    });
  }
  return (
    <button type="button" onClick={go} disabled={pending} className={className}>
      {pending ? "…" : label}
    </button>
  );
}
