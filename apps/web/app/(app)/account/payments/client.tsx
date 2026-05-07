"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

async function postJson(url: string, body: unknown = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({})) as Promise<{ ok?: boolean; url?: string; error?: string }>;
}

export function ConnectStripeButton({ label }: { label: string }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    start(async () => {
      const data = await postJson("/api/stripe/connect/onboard");
      if (data.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error ?? "Could not start onboarding.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="btn-gold"
        data-testid="connect-stripe"
      >
        {pending ? "Opening Stripe…" : label}
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

export function ManageStripeButton() {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function onClick() {
    setError(null);
    start(async () => {
      const data = await postJson("/api/stripe/connect/dashboard");
      if (data.ok && data.url) {
        window.open(data.url, "_blank", "noopener,noreferrer");
        return;
      }
      setError(data.error ?? "Could not open Stripe dashboard.");
    });
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={onClick}
        disabled={pending}
        className="btn-ghost"
        data-testid="manage-stripe"
      >
        {pending ? "Opening…" : "Open Stripe dashboard"}
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </div>
  );
}

export function DisconnectStripeButton() {
  const [confirming, setConfirming] = useState(false);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  function disconnect() {
    setError(null);
    start(async () => {
      const data = await postJson("/api/stripe/connect/disconnect");
      if (data.ok) {
        router.refresh();
        return;
      }
      setError(data.error ?? "Could not disconnect.");
    });
  }

  if (!confirming) {
    return (
      <button
        type="button"
        className="btn-ghost text-xs text-ivory-mute"
        onClick={() => setConfirming(true)}
        data-testid="disconnect-stripe"
      >
        Disconnect Stripe
      </button>
    );
  }
  return (
    <span className="flex flex-wrap items-center gap-1">
      <button
        type="button"
        className="btn-ghost px-2 py-1 text-xs text-red-300"
        disabled={pending}
        onClick={disconnect}
        data-testid="disconnect-confirm"
      >
        {pending ? "Disconnecting…" : "Confirm disconnect"}
      </button>
      <button
        type="button"
        className="btn-ghost px-2 py-1 text-xs"
        disabled={pending}
        onClick={() => setConfirming(false)}
      >
        Cancel
      </button>
      {error ? <p className="text-xs text-red-300">{error}</p> : null}
    </span>
  );
}
