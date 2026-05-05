"use client";
import { useState, useTransition } from "react";

export default function NewShortLinkPage() {
  const [target, setTarget] = useState("");
  const [code, setCode] = useState("");
  const [msg, setMsg] = useState<{ kind: "ok" | "err"; text: string } | null>(null);
  const [pending, start] = useTransition();

  function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    start(async () => {
      try {
        const res = await fetch("/api/short", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ target, code: code || undefined }),
        });
        const data = await res.json().catch(() => ({}));
        if (res.ok) setMsg({ kind: "ok", text: `Created vc.ed5e.co/${data.code}` });
        else setMsg({ kind: "err", text: data?.error ?? "Could not create short link." });
      } catch {
        setMsg({ kind: "err", text: "Network error." });
      }
    });
  }

  return (
    <div className="mx-auto max-w-xl space-y-6">
      <header>
        <h1 className="font-display text-2xl text-gold-grad">New short link</h1>
        <p className="mt-1 text-sm text-ivory-dim">Create a trackable short URL. All taps appear in Insights.</p>
      </header>
      <form onSubmit={submit} className="card space-y-4 p-6">
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-ivory-mute">Destination URL</span>
          <input
            value={target} onChange={(e) => setTarget(e.target.value)}
            type="url" required placeholder="https://example.com/launch"
            className="mt-1 w-full rounded-pill border border-onyx-600 bg-onyx-900 px-4 py-2.5 outline-none focus:border-gold/60"
          />
        </label>
        <label className="block">
          <span className="text-xs uppercase tracking-widest text-ivory-mute">Custom code (optional)</span>
          <input
            value={code} onChange={(e) => setCode(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            placeholder="my-launch" maxLength={32}
            className="mt-1 w-full rounded-pill border border-onyx-600 bg-onyx-900 px-4 py-2.5 outline-none focus:border-gold/60"
          />
        </label>
        <button type="submit" disabled={pending} className="btn-gold w-full">
          {pending ? "Creating…" : "Create short link"}
        </button>
        {msg && (
          <p className={`text-sm ${msg.kind === "ok" ? "text-gold" : "text-danger"}`}>{msg.text}</p>
        )}
      </form>
    </div>
  );
}
