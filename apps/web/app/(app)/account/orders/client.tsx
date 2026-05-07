"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

export function RefundButton({ orderId }: { orderId: string }) {
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function refund() {
    setError(null);
    start(async () => {
      const res = await fetch("/api/seller/orders/refund", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ orderId }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Refund failed.");
        return;
      }
      router.refresh();
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn-ghost px-2 py-1 text-xs"
        onClick={() => setConfirming(true)}
        data-testid={`refund-${orderId}`}
      >
        Refund
      </button>
    );
  }

  return (
    <span className="flex items-center gap-1">
      <button
        type="button"
        className="btn-ghost px-2 py-1 text-xs text-red-300"
        disabled={pending}
        onClick={refund}
        data-testid={`refund-confirm-${orderId}`}
      >
        {pending ? "Refunding…" : "Confirm refund"}
      </button>
      <button
        type="button"
        className="btn-ghost px-2 py-1 text-xs"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        Cancel
      </button>
      {error ? <span className="text-[10px] text-red-300">{error}</span> : null}
    </span>
  );
}

export function FulfillButton({ orderId }: { orderId: string }) {
  const [open, setOpen] = useState(false);
  const [tracking, setTracking] = useState("");
  const [carrier, setCarrier] = useState("");
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function fulfill() {
    setError(null);
    start(async () => {
      const res = await fetch("/api/seller/orders/fulfill", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          orderId,
          trackingNumber: tracking.trim() || undefined,
          carrier: carrier.trim() || undefined,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!data.ok) {
        setError(data.error ?? "Could not mark fulfilled.");
        return;
      }
      router.refresh();
    });
  }

  if (!open) {
    return (
      <button
        type="button"
        className="btn-ghost px-2 py-1 text-xs"
        onClick={() => setOpen(true)}
        data-testid={`fulfill-${orderId}`}
      >
        Mark fulfilled
      </button>
    );
  }
  return (
    <div className="flex flex-col items-end gap-1">
      <input
        type="text"
        placeholder="Tracking #"
        value={tracking}
        onChange={(e) => setTracking(e.target.value)}
        className="w-40 rounded-card border border-onyx-700 bg-onyx-950 px-2 py-1 text-xs text-ivory outline-none focus:border-gold/60"
        data-testid={`tracking-${orderId}`}
      />
      <input
        type="text"
        placeholder="Carrier (USPS, UPS…)"
        value={carrier}
        onChange={(e) => setCarrier(e.target.value)}
        className="w-40 rounded-card border border-onyx-700 bg-onyx-950 px-2 py-1 text-xs text-ivory outline-none focus:border-gold/60"
      />
      <span className="flex gap-1">
        <button
          type="button"
          className="btn-ghost px-2 py-1 text-xs text-emerald-300"
          disabled={pending}
          onClick={fulfill}
          data-testid={`fulfill-confirm-${orderId}`}
        >
          {pending ? "Saving…" : "Confirm"}
        </button>
        <button
          type="button"
          className="btn-ghost px-2 py-1 text-xs"
          disabled={pending}
          onClick={() => setOpen(false)}
        >
          Cancel
        </button>
      </span>
      {error ? <span className="text-[10px] text-red-300">{error}</span> : null}
    </div>
  );
}