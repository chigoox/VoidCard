"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

async function postJson(url: string, body: unknown = {}) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return res.json().catch(() => ({})) as Promise<{
    ok?: boolean;
    url?: string;
    error?: string;
    message?: string;
    revenueShareBps?: number;
  }>;
}

function displayError(data: { error?: string; message?: string }, fallback: string) {
  if (data.message) return data.message;
  switch (data.error) {
    case "stripe_not_configured":
      return "Stripe Connect is not configured yet. Add STRIPE_SECRET_KEY to your environment, restart the app, then try again.";
    case "stripe_invalid_key":
      return "Stripe rejected the configured API key. Check STRIPE_SECRET_KEY in your environment.";
    case "seller_accounts_table_missing":
      return "Seller payments are not set up in this database yet. Apply Supabase migration 0042_vcard_seller.sql, then refresh the schema cache.";
    case "stripe_connect_not_enabled":
      return "Stripe Connect is not enabled on this Stripe account yet. Enable Connect in the Stripe Dashboard, then try again.";
    case "onboarding_incomplete":
      return "Finish Stripe onboarding before opening the Express dashboard.";
    case "not_connected":
      return "Connect Stripe before opening the Express dashboard.";
    case "schema_missing":
      return "Revenue sharing needs the latest seller payments migration. Apply migration 0052_vcard_seller_revenue_share.sql, then refresh the schema cache.";
    default:
      return data.error ?? fallback;
  }
}

function percentFromBps(bps: number) {
  return Math.max(0, Math.min(100, Math.round(bps / 100)));
}

function bpsFromPercent(percent: number) {
  return Math.max(0, Math.min(100, Math.round(percent))) * 100;
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
      setError(displayError(data, "Could not start onboarding."));
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
      setError(displayError(data, "Could not open Stripe dashboard."));
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

export function RevenueShareControl({ initialBps, disabled = false }: { initialBps: number; disabled?: boolean }) {
  const [bps, setBps] = useState(bpsFromPercent(percentFromBps(initialBps)));
  const [savedBps, setSavedBps] = useState(bpsFromPercent(percentFromBps(initialBps)));
  const [lastEnabledBps, setLastEnabledBps] = useState(savedBps > 0 ? savedBps : 1000);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const router = useRouter();

  const percent = percentFromBps(bps);
  const changed = bps !== savedBps;

  function setPercent(nextPercent: number) {
    const nextBps = bpsFromPercent(nextPercent);
    setBps(nextBps);
    if (nextBps > 0) setLastEnabledBps(nextBps);
    setSaved(false);
  }

  function toggleEnabled(enabled: boolean) {
    setBps(enabled ? lastEnabledBps || 1000 : 0);
    setSaved(false);
  }

  function save() {
    setError(null);
    setSaved(false);
    start(async () => {
      const data = await postJson("/api/stripe/connect/revenue-share", { revenueShareBps: bps });
      if (data.ok && typeof data.revenueShareBps === "number") {
        const normalized = bpsFromPercent(percentFromBps(data.revenueShareBps));
        setBps(normalized);
        setSavedBps(normalized);
        if (normalized > 0) setLastEnabledBps(normalized);
        setSaved(true);
        router.refresh();
        return;
      }
      setError(displayError(data, "Could not save revenue share."));
    });
  }

  return (
    <div className="rounded-card border border-onyx-800 bg-onyx-950/45 p-4" data-testid="revenue-share-control">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-display text-base">Voluntary revenue share</p>
          <p className="mt-1 text-xs text-ivory-mute">VoidCard platform fee: 0%. Your current share: <span className="text-ivory">{percent}%</span>.</p>
        </div>
        <label className="inline-flex items-center gap-2 text-xs text-ivory-dim">
          <input
            type="checkbox"
            checked={bps > 0}
            disabled={disabled || pending}
            onChange={(event) => toggleEnabled(event.target.checked)}
            className="h-4 w-4 accent-gold"
            data-testid="revenue-share-toggle"
          />
          Enabled
        </label>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-[1fr_auto] md:items-center">
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={percent}
          disabled={disabled || pending}
          onChange={(event) => setPercent(Number(event.target.value))}
          className="w-full accent-gold"
          data-testid="revenue-share-range"
        />
        <label className="flex items-center gap-2 text-xs text-ivory-mute">
          <input
            type="number"
            min={0}
            max={100}
            step={1}
            value={percent}
            disabled={disabled || pending}
            onChange={(event) => setPercent(Number(event.target.value))}
            className="w-20 rounded-card border border-onyx-700 bg-onyx-900 px-3 py-2 text-right font-mono text-sm text-ivory outline-none focus:border-gold/70"
            data-testid="revenue-share-percent"
          />
          %
        </label>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <button
          type="button"
          className="btn-gold px-3 py-1.5 text-xs"
          disabled={disabled || pending || !changed}
          onClick={save}
          data-testid="revenue-share-save"
        >
          {pending ? "Saving..." : "Save share"}
        </button>
        {disabled ? <p className="text-xs text-ivory-mute">Connect Stripe to save this setting.</p> : null}
        {saved ? <p className="text-xs text-emerald-200" data-testid="revenue-share-saved">Saved</p> : null}
        {error ? <p className="text-xs text-red-300" role="alert">{error}</p> : null}
      </div>
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
      setError(displayError(data, "Could not disconnect."));
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
