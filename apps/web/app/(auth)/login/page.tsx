"use client";
import { Suspense, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { AuthShell } from "../_components/auth-shell";

type Feedback = { kind: "ok" | "err"; text: string };

const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "Google sign-in was cancelled before it could finish.",
  invalid_grant: "That sign-in link expired. Request a fresh one.",
  session: "Your session could not be restored. Sign in again.",
};

function normalizeInternalPath(value: string | null) {
  if (!value || !value.startsWith("/") || value.startsWith("//")) return null;
  return value;
}

function buildCallbackPath(nextPath: string | null) {
  const params = new URLSearchParams();
  if (nextPath) params.set("next", nextPath);
  const query = params.toString();
  return query ? `/auth/callback?${query}` : "/auth/callback";
}

function LoginPageFallback() {
  return (
    <AuthShell
      eyebrow="Return to your stack"
      title="Welcome back"
      description="Use password, magic link, or Google. The callback route finishes the profile lookup, onboarding resume, and destination redirect for you."
      footer={
        <p className="text-center text-sm text-ivory-mute">
          New here? <Link className="text-gold hover:underline" href="/signup">Create an account</Link>
        </p>
      }
    >
      <div className="h-[32rem] animate-pulse rounded-[2rem] border border-onyx-800 bg-onyx-900/40" />
    </AuthShell>
  );
}

function LoginPageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mode, setMode] = useState<"password" | "magic">("password");
  const [msg, setMsg] = useState<Feedback | null>(null);
  const [pending, start] = useTransition();

  const nextPath = normalizeInternalPath(searchParams.get("next"));
  const routeError = searchParams.get("error");
  const feedback = msg ?? (routeError ? { kind: "err", text: ERROR_MESSAGES[routeError] ?? routeError.replace(/_/g, " ") } : null);

  function submitMagicLink(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      try {
        const res = await fetch("/api/auth/magic-link", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ email, next: nextPath }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setMsg({ kind: "ok", text: "Check your inbox for the magic link." });
        else if (res.status === 429) setMsg({ kind: "err", text: "Too many requests. Slow down." });
        else setMsg({ kind: "err", text: data?.error ?? "Something went wrong." });
      } catch {
        setMsg({ kind: "err", text: "Network error." });
      }
    });
  }

  function submitPassword(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      const supabase = createClient();
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) {
        setMsg({ kind: "err", text: error.message });
        return;
      }
      router.replace(buildCallbackPath(nextPath));
    });
  }

  function signInWithGoogle() {
    setMsg(null);
    start(async () => {
      const redirectTo = new URL("/auth/callback", window.location.origin);
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
      eyebrow="Return to your stack"
      title="Welcome back"
      description="Use password, magic link, or Google. The callback route finishes the profile lookup, onboarding resume, and destination redirect for you."
      footer={
        <p className="text-center text-sm text-ivory-mute">
          New here? <Link className="text-gold hover:underline" href={nextPath ? `/signup?next=${encodeURIComponent(nextPath)}` : "/signup"}>Create an account</Link>
        </p>
      }
    >
      <div className="grid grid-cols-2 rounded-pill border border-onyx-700 bg-onyx-900/70 p-1">
        <button
          type="button"
          data-testid="login-mode-password"
          className={`rounded-pill px-4 py-2 text-sm transition ${mode === "password" ? "bg-gold text-onyx-950" : "text-ivory-mute hover:text-ivory"}`}
          onClick={() => {
            setMode("password");
            setMsg(null);
          }}
        >
          Password
        </button>
        <button
          type="button"
          data-testid="login-mode-magic"
          className={`rounded-pill px-4 py-2 text-sm transition ${mode === "magic" ? "bg-gold text-onyx-950" : "text-ivory-mute hover:text-ivory"}`}
          onClick={() => {
            setMode("magic");
            setMsg(null);
          }}
        >
          Magic link
        </button>
      </div>

      <form onSubmit={mode === "password" ? submitPassword : submitMagicLink} className="mt-6 space-y-4">
        <label className="block">
          <span className="text-xs uppercase tracking-[0.24em] text-ivory-mute">Email</span>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            data-testid="login-email"
            className="input mt-2 rounded-pill border-onyx-600 bg-onyx-900/70 px-4 py-3"
            placeholder="you@studio.com"
          />
        </label>

        {mode === "password" ? (
          <label className="block">
            <span className="text-xs uppercase tracking-[0.24em] text-ivory-mute">Password</span>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              data-testid="login-password"
              autoComplete="current-password"
              className="input mt-2 rounded-pill border-onyx-600 bg-onyx-900/70 px-4 py-3"
              placeholder="Enter your password"
            />
          </label>
        ) : (
          <div className="rounded-card border border-onyx-800 bg-onyx-900/45 p-4 text-sm text-ivory-dim">
            We’ll email a one-tap sign-in link to this address. No password required.
          </div>
        )}

        <button
          type="submit"
          disabled={pending}
          data-testid={mode === "password" ? "login-password-submit" : "login-submit"}
          className="btn-gold w-full justify-center"
        >
          {pending ? "Working…" : mode === "password" ? "Sign in with password" : "Send magic link"}
        </button>
      </form>

      <div className="mt-4 rounded-[1.6rem] border border-onyx-800 bg-onyx-900/50 p-4">
        <button
          type="button"
          data-testid="login-google"
          disabled={pending}
          onClick={signInWithGoogle}
          className="btn-ghost w-full justify-center border-onyx-600 bg-onyx-950/60"
        >
          <span className="inline-flex size-6 items-center justify-center rounded-full border border-gold/25 text-xs text-gold">G</span>
          Continue with Google
        </button>
        <p className="mt-3 text-center text-xs leading-5 text-ivory-mute">
          Use Google if you want the fastest path back to your dashboard and paired cards.
        </p>
      </div>

      {feedback && (
        <p data-testid="login-msg" className={`mt-4 text-sm ${feedback.kind === "ok" ? "text-gold" : "text-danger"}`}>
          {feedback.text}
        </p>
      )}

      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <div className="rounded-card border border-onyx-800 bg-onyx-900/40 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-gold/80">Profiles</p>
          <p className="mt-2 text-sm text-ivory-dim">Resume onboarding if you left mid-build, otherwise land straight in your dashboard.</p>
        </div>
        <div className="rounded-card border border-onyx-800 bg-onyx-900/40 p-4">
          <p className="text-xs uppercase tracking-[0.24em] text-gold/80">Pairing</p>
          <p className="mt-2 text-sm text-ivory-dim">Your paired cards, wallet pass, and lead capture stay tied to the same account.</p>
        </div>
      </div>
    </AuthShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginPageFallback />}>
      <LoginPageContent />
    </Suspense>
  );
}
