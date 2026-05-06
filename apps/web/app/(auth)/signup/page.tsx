"use client";
import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "../_components/auth-shell";

const USERNAME_RE = /^[a-z0-9_.-]{3,32}$/;

type Feedback = { kind: "ok" | "err"; text: string };

function normalizeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function buildCallbackPath(username: string, nextPath: string | null) {
  const params = new URLSearchParams();
  params.set("username", username);
  if (nextPath) params.set("next", nextPath);
  return `/auth/callback?${params.toString()}`;
}

function SignupPageFallback() {
  return (
    <AuthShell
      eyebrow="Claim your handle"
      title="Start your stack"
      description="Create an account with email and password, keep the fallback magic-link path, or jump in with Google. Free includes every theme, every section type, and full analytics."
      footer={
        <p className="text-center text-sm text-ivory-mute">
          Already have one? <Link className="text-gold hover:underline" href="/login">Sign in</Link>
        </p>
      }
    >
      <div className="h-[34rem] animate-pulse rounded-[2rem] border border-onyx-800 bg-onyx-900/40" />
    </AuthShell>
  );
}

function SignupPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [msg, setMsg] = useState<Feedback | null>(null);
  const [pending, start] = useTransition();

  const nextPath = normalizeInternalPath(searchParams.get("next"));

  function validateUsername(value: string) {
    return USERNAME_RE.test(value.trim().toLowerCase());
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    if (!validateUsername(username)) {
      setMsg({ kind: "err", text: "Username must be 3-32 lowercase letters, digits, dot, dash or underscore." });
      return;
    }
    if (password.length < 8) {
      setMsg({ kind: "err", text: "Password must be at least 8 characters." });
      return;
    }
    if (password !== confirmPassword) {
      setMsg({ kind: "err", text: "Passwords do not match." });
      return;
    }
    start(async () => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, username, password, next: nextPath }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          if (data?.needsEmailConfirmation) {
            setMsg({ kind: "ok", text: "Check your inbox to confirm your account." });
          } else {
            router.replace(buildCallbackPath(username.trim().toLowerCase(), nextPath));
          }
        }
        else if (res.status === 429) setMsg({ kind: "err", text: "Too many requests. Slow down." });
        else setMsg({ kind: "err", text: data?.error ?? "Something went wrong." });
      } catch {
        setMsg({ kind: "err", text: "Network error." });
      }
    });
  }

  function sendSignupMagicLink() {
    setMsg(null);
    if (!validateUsername(username)) {
      setMsg({ kind: "err", text: "Choose a valid username before requesting a sign-up link." });
      return;
    }
    start(async () => {
      try {
        const res = await fetch("/api/auth/signup", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, username, next: nextPath }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setMsg({ kind: "ok", text: "Check your inbox to confirm." });
        else if (res.status === 429) setMsg({ kind: "err", text: "Too many requests. Slow down." });
        else setMsg({ kind: "err", text: data?.error ?? "Something went wrong." });
      } catch {
        setMsg({ kind: "err", text: "Network error." });
      }
    });
  }

  function signUpWithGoogle() {
    setMsg(null);
    const normalizedUsername = username.trim().toLowerCase();
    if (normalizedUsername && !validateUsername(normalizedUsername)) {
      setMsg({ kind: "err", text: "Fix the username first or leave it blank and VoidCard will generate one." });
      return;
    }

    start(async () => {
      const redirectTo = new URL("/auth/callback", window.location.origin);
      if (normalizedUsername) redirectTo.searchParams.set("username", normalizedUsername);
      if (nextPath) redirectTo.searchParams.set("next", nextPath);

      const supabase = createClient();
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirectTo.toString(),
          queryParams: { access_type: "offline", prompt: "select_account" },
        },
      });

      if (error) {
        setMsg({ kind: "err", text: error.message });
      }
    });
  }

  return (
    <AuthShell
      eyebrow="Claim your handle"
      title="Start your stack"
      description="Create an account with email and password, keep the fallback magic-link path, or jump in with Google. Free includes every theme, every section type, and full analytics."
      footer={
        <p className="text-center text-sm text-ivory-mute">
          Already have one? <Link className="text-gold hover:underline" href={nextPath ? `/login?next=${encodeURIComponent(nextPath)}` : "/login"}>Sign in</Link>
        </p>
      }
    >
      <form onSubmit={submitPassword} className="space-y-4" noValidate>
        <label className="block">
          <span className="text-xs uppercase tracking-[0.24em] text-ivory-mute">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="signup-email"
            className="input mt-2 rounded-pill border-onyx-600 bg-onyx-900/70 px-4 py-3"
            placeholder="you@studio.com"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-[0.24em] text-ivory-mute">Username</span>
          <div className="mt-2 flex items-center rounded-pill border border-onyx-600 bg-onyx-900/70 px-4 py-3 focus-within:border-gold/60">
            <span className="text-ivory-mute">@</span>
            <input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              required
              data-testid="signup-username"
              className="ml-2 flex-1 bg-transparent outline-none placeholder:text-ivory-mute"
              placeholder="your-handle"
            />
          </div>
        </label>

        <div className="grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="text-xs uppercase tracking-[0.24em] text-ivory-mute">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="signup-password"
              autoComplete="new-password"
              className="input mt-2 rounded-pill border-onyx-600 bg-onyx-900/70 px-4 py-3"
              placeholder="At least 8 characters"
            />
          </label>
          <label className="block">
            <span className="text-xs uppercase tracking-[0.24em] text-ivory-mute">Confirm</span>
            <input
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              data-testid="signup-confirm"
              autoComplete="new-password"
              className="input mt-2 rounded-pill border-onyx-600 bg-onyx-900/70 px-4 py-3"
              placeholder="Repeat password"
            />
          </label>
        </div>

        <button type="submit" disabled={pending} data-testid="signup-submit" className="btn-gold w-full justify-center">
          {pending ? "Creating…" : "Create account"}
        </button>
      </form>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <button
          type="button"
          disabled={pending}
          data-testid="signup-google"
          onClick={signUpWithGoogle}
          className="btn-ghost w-full justify-center border-onyx-600 bg-onyx-950/60"
        >
          <span className="inline-flex size-6 items-center justify-center rounded-full border border-gold/25 text-xs text-gold">G</span>
          Continue with Google
        </button>
        <button
          type="button"
          disabled={pending}
          data-testid="signup-magic"
          onClick={sendSignupMagicLink}
          className="btn-ghost w-full justify-center border-onyx-600 bg-onyx-950/60"
        >
          Email me a sign-up link
        </button>
      </div>

      <p className="mt-3 text-xs leading-5 text-ivory-mute">
        Google can auto-generate a handle if you leave the username blank. If you already know the
        handle you want, enter it first and we’ll pass it through the callback.
      </p>

      {msg && (
        <p data-testid="signup-msg" className={`mt-4 text-sm ${msg.kind === "ok" ? "text-gold" : "text-danger"}`}>
          {msg.text}
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-onyx-800 bg-onyx-900/40 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-gold/80">Free forever</p>
          <p className="mt-2 text-sm text-ivory-dim">All 12 themes, full custom CSS, all 17 section types, wallet pass, embed, and analytics.</p>
        </div>
        <div className="rounded-card border border-onyx-800 bg-onyx-900/40 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-gold/80">Provisioned on callback</p>
          <p className="mt-2 text-sm text-ivory-dim">We create or resume your primary profile record when auth completes, not in client state.</p>
        </div>
      </div>
    </AuthShell>
  );
}

export default function SignupPage() {
  return (
    <Suspense fallback={<SignupPageFallback />}>
      <SignupPageContent />
    </Suspense>
  );
}
