"use client";
import { useTransition } from "react";

export function CheckoutButton({
  kind, sku, plan, label, className = "btn-gold", referral, designId, customDesign, testId,
}: {
  kind: "shop" | "subscribe";
  sku?: string;
  plan?: string;
  label: string;
  className?: string;
  referral?: string;
  designId?: string;
  customDesign?: boolean;
  testId?: string;
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
          body: JSON.stringify({ kind, sku, plan, referral, designId, customDesign }),
        });
        const data = await res.json().catch(() => ({}));
        if (data.url) {
          window.location.href = data.url;
        } else if (data.error === "verified_required") {
          window.location.href = "/account/verify";
        } else if (data.error === "design_required" || data.error === "design_not_found") {
          const returnTo = sku ? `/shop/${sku}${customDesign ? "?custom_design=1" : ""}` : "/shop";
          window.location.href = `/cards/design?return_to=${encodeURIComponent(returnTo)}`;
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
    <button type="button" onClick={go} disabled={pending} className={className} data-testid={testId}>
      {pending ? "…" : label}
    </button>
  );
}
