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
