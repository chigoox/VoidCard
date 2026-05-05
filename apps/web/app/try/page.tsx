"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";

type LinkRow = { id: string; label: string; href: string };

const STARTER: LinkRow[] = [
  { id: "1", label: "Book a service", href: "https://example.com/book" },
  { id: "2", label: "Instagram", href: "https://instagram.com/" },
  { id: "3", label: "TikTok", href: "https://tiktok.com/" },
  { id: "4", label: "Save my contact", href: "/vcf" },
];

export default function TryEditorPage() {
  const [name, setName] = useState("Your Name");
  const [handle, setHandle] = useState("yourhandle");
  const [bio, setBio] = useState("Founder · creator · always shipping.");
  const [accent, setAccent] = useState<"gold" | "ivory" | "danger" | "success">("gold");
  const [links, setLinks] = useState<LinkRow[]>(STARTER);

  const accentClass = useMemo(() => {
    switch (accent) {
      case "ivory":
        return "from-ivory to-ivory-dim";
      case "danger":
        return "from-danger to-warning";
      case "success":
        return "from-success to-gold";
      default:
        return "from-gold-100 via-gold-400 to-gold-600";
    }
  }, [accent]);

  function updateLink(id: string, patch: Partial<LinkRow>) {
    setLinks((prev) => prev.map((l) => (l.id === id ? { ...l, ...patch } : l)));
  }

  function addLink() {
    setLinks((prev) => [
      ...prev,
      { id: crypto.randomUUID(), label: "New link", href: "https://" },
    ]);
  }

  function removeLink(id: string) {
    setLinks((prev) => prev.filter((l) => l.id !== id));
  }

  return (
    <main className="min-h-screen bg-onyx-grad">
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pb-10 pt-16 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-gold">Try the editor</p>
        <h1 className="mt-3 font-display text-4xl leading-tight tracking-tight md:text-5xl">
          No signup. Just <span className="text-gold-grad">play</span>.
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-ivory-dim">
          Edit on the left. Watch the live preview on the right. Like what you see?{" "}
          <Link href="/signup" className="text-gold hover:underline">Claim your handle.</Link>
        </p>
      </section>

      <section className="mx-auto grid max-w-7xl gap-10 px-6 pb-24 lg:grid-cols-[1fr_auto] lg:items-start">
        {/* Editor */}
        <div className="card space-y-6 p-6">
          <Field label="Display name">
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              maxLength={64}
            />
          </Field>

          <Field label="Handle">
            <div className="flex items-center gap-2">
              <span className="text-ivory-mute">vcard.ed5enterprise.com/u/</span>
              <input
                value={handle}
                onChange={(e) =>
                  setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 32))
                }
                className="input flex-1"
              />
            </div>
          </Field>

          <Field label="Bio">
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="input min-h-[80px]"
              maxLength={240}
            />
          </Field>

          <Field label="Accent">
            <div className="flex gap-2">
              {(["gold", "ivory", "danger", "success"] as const).map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => setAccent(a)}
                  aria-pressed={accent === a}
                  className={`size-9 rounded-pill ring-1 ring-onyx-600 transition ${
                    accent === a ? "ring-2 ring-gold" : ""
                  } ${swatchClass(a)}`}
                  aria-label={`Accent ${a}`}
                />
              ))}
            </div>
          </Field>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="font-display text-lg">Links</h3>
              <button type="button" onClick={addLink} className="btn-ghost text-xs">
                + Add link
              </button>
            </div>
            <div className="space-y-3">
              {links.map((l) => (
                <div key={l.id} className="grid grid-cols-[1fr_1fr_auto] gap-2">
                  <input
                    value={l.label}
                    onChange={(e) => updateLink(l.id, { label: e.target.value })}
                    className="input"
                    placeholder="Label"
                  />
                  <input
                    value={l.href}
                    onChange={(e) => updateLink(l.id, { href: e.target.value })}
                    className="input"
                    placeholder="https://"
                  />
                  <button
                    type="button"
                    onClick={() => removeLink(l.id)}
                    className="rounded-pill border border-onyx-600 px-3 text-sm text-ivory-mute hover:border-danger hover:text-danger"
                    aria-label={`Remove ${l.label}`}
                  >
                    ×
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="border-t border-onyx-700/60 pt-6">
            <Link href="/signup" className="btn-gold w-full justify-center">
              Save this as my profile
            </Link>
            <p className="mt-2 text-center text-xs text-ivory-mute">
              Free forever · no credit card
            </p>
          </div>
        </div>

        {/* Preview */}
        <div className="flex justify-center">
          <div className="phone-frame">
            <div className="flex h-full flex-col bg-onyx-950 p-6">
              <div className="flex flex-col items-center pt-12">
                <div className={`size-24 rounded-full bg-gradient-to-br ${accentClass}`} />
                <h2 className="mt-4 font-display text-2xl">{name || "Your Name"}</h2>
                <p className="mt-1 text-sm text-ivory-dim">@{handle || "handle"}</p>
                {bio && (
                  <p className="mt-3 max-w-[280px] text-center text-sm text-ivory-dim">{bio}</p>
                )}
              </div>
              <div className="mt-7 space-y-3 overflow-y-auto">
                {links.map((l) => (
                  <div
                    key={l.id}
                    className="card flex items-center justify-between px-4 py-3.5 text-sm"
                  >
                    <span className="truncate">{l.label || "Untitled"}</span>
                    <span className={accent === "gold" ? "text-gold" : "text-ivory"}>→</span>
                  </div>
                ))}
              </div>
              <div className="mt-auto pb-2 pt-6 text-center text-[10px] uppercase tracking-widest text-ivory-mute">
                Powered by VoidCard
              </div>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-ivory-mute">
        {label}
      </span>
      {children}
    </label>
  );
}

function swatchClass(a: "gold" | "ivory" | "danger" | "success") {
  switch (a) {
    case "ivory":
      return "bg-ivory";
    case "danger":
      return "bg-danger";
    case "success":
      return "bg-success";
    default:
      return "bg-gold-grad";
  }
}
