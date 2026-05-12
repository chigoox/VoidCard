"use client";

import "client-only";

import { Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { capture } from "@/lib/posthog-browser";
import { ONBOARDING_TOTAL_STEPS } from "@/lib/onboarding-constants";
import { BLANK_VIBE_ID, VIBES } from "@/lib/onboarding-vibes";
import {
  addInitialLinks,
  applyVibe,
  checkUsernameAvailability,
  claimUsername,
  dismissOnboarding,
  finishOnboarding,
  saveAvatar,
} from "./actions";

type LinkDraft = { label: string; url: string };

type Props = {
  initialStep: number;
  initialUsername: string | null;
  initialDisplayName: string | null;
  initialAvatarUrl: string | null;
  nextHref: string;
};

const INPUT_CLASS =
  "w-full rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2.5 text-sm text-ivory outline-none transition focus:border-gold/60";

const USERNAME_RE = /^[a-z0-9_.-]{3,32}$/;

export default function OnboardingClient({
  initialStep,
  initialUsername,
  initialDisplayName,
  initialAvatarUrl,
  nextHref,
}: Props) {
  const router = useRouter();
  const [step, setStepState] = useState(Math.max(0, Math.min(ONBOARDING_TOTAL_STEPS, initialStep)));
  const [pending, startTransition] = useTransition();

  // Step 1
  const [username, setUsername] = useState(initialUsername ?? "");
  const [displayName, setDisplayName] = useState(initialDisplayName ?? "");
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken" | "reserved" | "invalid">("idle");
  const checkRef = useRef<number>(0);

  // Step 2
  const [avatarUrl, setAvatarUrl] = useState<string | null>(initialAvatarUrl);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [avatarError, setAvatarError] = useState<string | null>(null);

  // Step 3
  const [vibe, setVibe] = useState<string>("creator");

  // Step 4
  const [links, setLinks] = useState<LinkDraft[]>([{ label: "", url: "" }]);

  // Step 5
  const [pushAccepted, setPushAccepted] = useState<"idle" | "granted" | "denied">("idle");
  const [confettiOn, setConfettiOn] = useState(false);

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void capture("onboarding_step_view", { step });
  }, [step]);

  const progressPct = useMemo(() => Math.round((step / ONBOARDING_TOTAL_STEPS) * 100), [step]);

  function go(next: number) {
    setError(null);
    setStepState(Math.max(0, Math.min(ONBOARDING_TOTAL_STEPS, next)));
  }

  async function handleSkip() {
    void capture("onboarding_skip", { from_step: step });
    startTransition(async () => {
      await dismissOnboarding();
      router.replace(nextHref);
    });
  }

  // ---------- Step 0 / 1: username ----------
  useEffect(() => {
    const value = username.trim().toLowerCase();
    if (!value) {
      setUsernameStatus("idle");
      return;
    }
    if (!USERNAME_RE.test(value)) {
      setUsernameStatus("invalid");
      return;
    }
    setUsernameStatus("checking");
    const ticket = ++checkRef.current;
    const handle = window.setTimeout(async () => {
      const result = await checkUsernameAvailability(value);
      if (ticket !== checkRef.current) return;
      if (result.ok) setUsernameStatus("available");
      else if (result.error === "username_reserved") setUsernameStatus("reserved");
      else if (result.error === "invalid_username") setUsernameStatus("invalid");
      else setUsernameStatus("taken");
    }, 280);
    return () => window.clearTimeout(handle);
  }, [username]);

  function submitUsername() {
    if (!USERNAME_RE.test(username.trim().toLowerCase())) {
      setError("Username must be 3–32 characters, lowercase letters, numbers, dot, dash, underscore.");
      return;
    }
    if (usernameStatus === "taken" || usernameStatus === "reserved") {
      setError("That username is unavailable. Try another.");
      return;
    }
    startTransition(async () => {
      const res = await claimUsername({ username: username.trim().toLowerCase(), displayName: displayName.trim() || undefined });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      void capture("onboarding_username_claimed");
      go(2);
    });
  }

  // ---------- Step 2: avatar ----------
  async function uploadAvatar(file: File) {
    setAvatarError(null);
    if (!file.type.startsWith("image/")) {
      setAvatarError("Please pick an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setAvatarError("Avatar must be 5 MB or smaller.");
      return;
    }
    setAvatarUploading(true);
    try {
      const sign = await fetch("/api/media/sign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ filename: file.name, mime: file.type, sizeBytes: file.size, kind: "image", visibility: "public" }),
      }).then((r) => r.json());
      if (!sign.ok) throw new Error(sign.error ?? "sign_failed");
      const put = await fetch(sign.signedUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
      if (!put.ok) throw new Error("upload_failed");
      const finalize = await fetch("/api/media/finalize", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ bucket: sign.bucket, path: sign.path, kind: "image", mime: file.type, sizeBytes: file.size }),
      }).then((r) => r.json());
      if (!finalize.ok || typeof finalize.url !== "string") throw new Error(finalize.error ?? "finalize_failed");
      setAvatarUrl(finalize.url as string);
      void capture("onboarding_avatar_uploaded");
    } catch (err) {
      setAvatarError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setAvatarUploading(false);
    }
  }

  function submitAvatar() {
    startTransition(async () => {
      const res = await saveAvatar({ avatarUrl });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      go(3);
    });
  }

  // ---------- Step 3: vibe ----------
  function submitVibe() {
    startTransition(async () => {
      const res = await applyVibe({ vibeId: vibe });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      void capture("onboarding_vibe_applied", { vibe });
      go(4);
    });
  }

  // ---------- Step 4: links ----------
  function updateLink(index: number, patch: Partial<LinkDraft>) {
    setLinks((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }
  function addLinkRow() {
    setLinks((prev) => (prev.length >= 3 ? prev : [...prev, { label: "", url: "" }]));
  }
  function removeLinkRow(index: number) {
    setLinks((prev) => prev.filter((_, i) => i !== index));
  }

  function submitLinks() {
    const cleaned = links.map((l) => ({ label: l.label.trim(), url: l.url.trim() })).filter((l) => l.label && l.url);
    startTransition(async () => {
      const res = await addInitialLinks({ links: cleaned });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      void capture("onboarding_links_added", { count: cleaned.length });
      go(5);
    });
  }

  // ---------- Step 5: finish ----------
  async function requestPush() {
    if (typeof window === "undefined" || !("Notification" in window)) {
      setPushAccepted("denied");
      return;
    }
    const result = await Notification.requestPermission();
    setPushAccepted(result === "granted" ? "granted" : "denied");
    void capture("onboarding_push_prompted", { result });
  }

  function submitFinish(publish: boolean) {
    startTransition(async () => {
      const res = await finishOnboarding({ publish });
      if (!res.ok) {
        setError(res.error);
        return;
      }
      void capture("onboarding_completed", { published: publish });
      setConfettiOn(true);
      window.setTimeout(() => {
        router.replace(nextHref);
      }, 1500);
    });
  }

  function handleGoToPair() {
    startTransition(async () => {
      await dismissOnboarding();
      router.replace("/cards/pair");
    });
  }

  function shareProfile() {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}/u/${initialUsername ?? username}`;
    const nav = window.navigator as Navigator & { share?: (data: { title?: string; url?: string }) => Promise<void> };
    if (typeof nav.share === "function") {
      nav.share({ title: "My VoidCard", url }).catch(() => {});
    } else if (nav.clipboard) {
      nav.clipboard.writeText(url).catch(() => {});
    }
    void capture("onboarding_shared");
  }

  return (
    <div className="space-y-6" data-testid="onboarding-page" data-step={step}>
      <header className="card p-6 sm:p-8">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <p className="text-xs uppercase tracking-[0.24em] text-gold">Welcome</p>
            <h1 className="mt-2 text-balance font-display text-3xl text-gold-grad">Let&rsquo;s set up your VoidCard</h1>
            <p className="mt-2 text-sm text-ivory-dim">
              Step {Math.min(step + 1, ONBOARDING_TOTAL_STEPS)} of {ONBOARDING_TOTAL_STEPS}
            </p>
          </div>
          <button
            type="button"
            className="btn-ghost min-h-11 px-3 py-2 text-xs sm:min-h-0"
            onClick={handleSkip}
            disabled={pending}
            data-testid="onboarding-skip"
          >
            Skip for now
          </button>
        </div>
        <div className="mt-4 h-2 overflow-hidden rounded-full bg-onyx-950">
          <div className="h-full bg-gold transition-all" style={{ width: `${progressPct}%` }} data-testid="onboarding-progress" />
        </div>
      </header>

      {error ? (
        <p className="card border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100" role="alert" data-testid="onboarding-error">
          {error}
        </p>
      ) : null}

      {step <= 1 ? (
        <section className="card space-y-4 p-6" data-testid="step-username">
          <header>
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Step 1 — Claim your username</p>
            <p className="mt-1 text-sm text-ivory-dim">This becomes your public URL: <code className="text-ivory">/u/{username || "you"}</code></p>
          </header>
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Username</span>
            <input
              className={INPUT_CLASS}
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              maxLength={32}
              autoComplete="off"
              data-testid="username-input"
            />
            <span
              className={`mt-1 block text-xs ${
                usernameStatus === "available"
                  ? "text-emerald-300"
                  : usernameStatus === "checking"
                  ? "text-ivory-dim"
                  : usernameStatus === "idle"
                  ? "text-ivory-dim"
                  : "text-red-300"
              }`}
              data-testid="username-status"
            >
              {usernameStatus === "available"
                ? "Available."
                : usernameStatus === "checking"
                ? "Checking…"
                : usernameStatus === "taken"
                ? "Already taken."
                : usernameStatus === "reserved"
                ? "Reserved username."
                : usernameStatus === "invalid"
                ? "3–32 lowercase letters, numbers, ., -, _."
                : "Pick something memorable."}
            </span>
          </label>
          <label className="block space-y-1">
            <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Display name (optional)</span>
            <input
              className={INPUT_CLASS}
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              maxLength={80}
              data-testid="displayname-input"
            />
          </label>
          <div className="flex justify-end">
            <button
              type="button"
              className="btn-gold w-full sm:w-auto"
              onClick={submitUsername}
              disabled={pending || usernameStatus === "checking" || usernameStatus === "invalid" || usernameStatus === "taken" || usernameStatus === "reserved"}
              data-testid="username-continue"
            >
              {pending ? "Saving…" : "Continue"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 2 ? (
        <section className="card space-y-4 p-6" data-testid="step-avatar">
          <header>
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Step 2 — Add an avatar</p>
            <p className="mt-1 text-sm text-ivory-dim">PNG or JPG, up to 5 MB. Square images crop best.</p>
          </header>
          <div className="flex flex-wrap items-center gap-4">
            <div className="size-24 overflow-hidden rounded-full border border-onyx-700 bg-onyx-950">
              {avatarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatarUrl} alt="Avatar preview" className="size-full object-cover" />
              ) : (
                <div className="grid size-full place-items-center text-3xl text-ivory-dim">?</div>
              )}
            </div>
            <label className="btn-ghost cursor-pointer px-3 py-2 text-xs">
              <input
                type="file"
                accept="image/*"
                hidden
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) void uploadAvatar(file);
                }}
                data-testid="avatar-input"
              />
              {avatarUploading ? "Uploading…" : avatarUrl ? "Replace" : "Upload"}
            </label>
            {avatarUrl ? (
              <button type="button" className="text-xs text-ivory-dim hover:text-red-300" onClick={() => setAvatarUrl(null)}>
                Remove
              </button>
            ) : null}
          </div>
          {avatarError ? <p className="text-xs text-red-300">{avatarError}</p> : null}
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button type="button" className="btn-ghost" onClick={() => go(1)} disabled={pending}>Back</button>
            <button
              type="button"
              className="btn-gold"
              onClick={submitAvatar}
              disabled={pending || avatarUploading}
              data-testid="avatar-continue"
            >
              {avatarUrl ? "Continue" : "Skip avatar"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="card space-y-4 p-6" data-testid="step-vibe">
          <header>
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Step 3 — Pick a vibe</p>
            <p className="mt-1 text-sm text-ivory-dim">We&rsquo;ll seed your draft profile with a starter layout you can edit later.</p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {VIBES.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setVibe(v.id);
                  void capture("onboarding_vibe_selected", { vibe: v.id });
                }}
                className={`rounded-card border p-3 text-left transition ${
                  vibe === v.id ? "border-gold/70 bg-gold/5" : "border-ivory/10 hover:border-ivory/30"
                }`}
                data-testid={`vibe-${v.id}`}
                aria-pressed={vibe === v.id}
              >
                <p className="text-sm font-medium text-ivory">{v.label}</p>
                <p className="mt-1 text-xs text-ivory-dim">{v.blurb}</p>
              </button>
            ))}
            <button
              type="button"
              onClick={() => setVibe(BLANK_VIBE_ID)}
              className={`rounded-card border p-3 text-left transition ${
                vibe === BLANK_VIBE_ID ? "border-gold/70 bg-gold/5" : "border-ivory/10 hover:border-ivory/30"
              }`}
              data-testid={`vibe-${BLANK_VIBE_ID}`}
              aria-pressed={vibe === BLANK_VIBE_ID}
            >
              <p className="text-sm font-medium text-ivory">Blank canvas</p>
              <p className="mt-1 text-xs text-ivory-dim">Start empty and build it yourself.</p>
            </button>
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button type="button" className="btn-ghost" onClick={() => go(2)} disabled={pending}>Back</button>
            <button type="button" className="btn-gold" onClick={submitVibe} disabled={pending} data-testid="vibe-continue">
              {pending ? "Applying…" : "Continue"}
            </button>
          </div>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="card space-y-4 p-6" data-testid="step-links">
          <header>
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Step 4 — Add up to 3 links</p>
            <p className="mt-1 text-sm text-ivory-dim">The first things visitors should see. You can edit these any time.</p>
          </header>
          <ul className="space-y-2">
            {links.map((link, i) => (
              <li key={i} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto]">
                <input
                  className={INPUT_CLASS}
                  placeholder="Label"
                  aria-label={`Link ${i + 1} label`}
                  value={link.label}
                  maxLength={80}
                  onChange={(e) => updateLink(i, { label: e.target.value })}
                  data-testid={`link-label-${i}`}
                />
                <input
                  className={INPUT_CLASS}
                  placeholder="https://example.com"
                  aria-label={`Link ${i + 1} URL`}
                  value={link.url}
                  onChange={(e) => updateLink(i, { url: e.target.value })}
                  data-testid={`link-url-${i}`}
                />
                <button
                  type="button"
                  className="btn-ghost min-h-11 text-xs sm:min-h-0"
                  onClick={() => removeLinkRow(i)}
                  disabled={links.length === 1}
                  aria-label={`Remove link ${i + 1}`}
                >
                  <Trash2 className="size-4" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          <button
            type="button"
            className="btn-ghost px-3 py-2 text-xs"
            onClick={addLinkRow}
            disabled={links.length >= 3}
            data-testid="link-add-row"
          >
            + Add link
          </button>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-between">
            <button type="button" className="btn-ghost" onClick={() => go(3)} disabled={pending}>Back</button>
            <button type="button" className="btn-gold" onClick={submitLinks} disabled={pending} data-testid="links-continue">
              {pending ? "Saving…" : "Continue"}
            </button>
          </div>
        </section>
      ) : null}

      {step >= 5 ? (
        <section className="card space-y-4 p-6" data-testid="step-finish">
          <header>
            <p className="text-xs uppercase tracking-widest text-ivory-mute">Step 5 — Pair a card &amp; finish</p>
            <p className="mt-1 text-sm text-ivory-dim">Your draft profile is ready. Pair an NFC card now or come back later.</p>
          </header>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={handleGoToPair}
              disabled={pending}
              className="card flex flex-col gap-2 border-ivory/10 p-4 text-left hover:border-ivory/30 disabled:opacity-60"
              data-testid="pair-card-link"
            >
              <p className="text-sm font-medium text-ivory">I have a VoidCard</p>
              <p className="text-xs text-ivory-dim">Open the pairing flow and tap your card.</p>
            </button>
            <Link href="/shop" className="card flex flex-col gap-2 border-ivory/10 p-4 hover:border-ivory/30" data-testid="buy-card-link">
              <p className="text-sm font-medium text-ivory">Buy one later</p>
              <p className="text-xs text-ivory-dim">No problem — your profile works without a card.</p>
            </Link>
          </div>
          <div className="flex flex-wrap items-center gap-3 rounded-card border border-ivory/10 bg-onyx-950 p-3 text-xs text-ivory-dim">
            <span>Get a notification when someone taps your card.</span>
            <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={requestPush} data-testid="push-opt-in">
              {pushAccepted === "granted" ? "Enabled" : pushAccepted === "denied" ? "Dismissed" : "Enable web push"}
            </button>
          </div>
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
            <button type="button" className="btn-ghost" onClick={() => go(4)} disabled={pending}>Back</button>
            <div className="grid gap-2 sm:flex">
              <button type="button" className="btn-ghost" onClick={shareProfile} data-testid="share-profile">
                Share
              </button>
              <button
                type="button"
                className="btn-gold"
                onClick={() => submitFinish(true)}
                disabled={pending}
                data-testid="finish-publish"
              >
                {pending ? "Publishing…" : "Publish & finish"}
              </button>
              <button
                type="button"
                className="btn-ghost"
                onClick={() => submitFinish(false)}
                disabled={pending}
                data-testid="finish-draft"
              >
                Save draft
              </button>
            </div>
          </div>
          {confettiOn ? (
            <div aria-hidden className="safe-modal-frame pointer-events-none fixed inset-0 z-50 grid place-items-center">
              <div className="rounded-card bg-onyx-950/80 px-6 py-4 text-2xl text-gold-grad shadow-2xl backdrop-blur" data-testid="confetti">
                You&rsquo;re live ✨
              </div>
            </div>
          ) : null}
        </section>
      ) : null}

      <input type="hidden" data-testid="onboarding-current-step" value={step} readOnly />
    </div>
  );
}
