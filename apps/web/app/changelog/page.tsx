import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Changelog",
  description: "What's shipping in VoidCard. Public, dated, and honest.",
  path: "/changelog",
});

type Entry = { date: string; version: string; items: string[] };

const ENTRIES: Entry[] = [
  {
    date: "May 2026",
    version: "0.1.0 — Public preview",
    items: [
      "Marketing site: home, pricing, shop, try-the-editor",
      "Onyx-Gold design tokens · Tailwind + custom CSS",
      "Magic-link auth via Supabase SSR (SSO across .ed5enterprise.com)",
      "Public profile route /u/[username] with section renderers",
      "Public API v1 with bearer auth + Upstash rate-limiting",
      "Stripe webhook → entitlements wiring",
      "Playwright E2E baseline",
    ],
  },
];

export default function ChangelogPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Changelog</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">What&apos;s shipping</h1>
        <p className="mt-3 text-ink-500">
          Honest, in-progress, real. We post here every time something lands in production.
        </p>

        <div className="mt-12 space-y-10">
          {ENTRIES.map((e) => (
            <section key={e.version} className="surface p-6">
              <div className="flex items-baseline justify-between">
                <h2 className="font-display text-2xl">{e.version}</h2>
                <span className="text-sm text-ink-400">{e.date}</span>
              </div>
              <ul className="mt-4 space-y-2 text-ink-500">
                {e.items.map((it) => (
                  <li key={it} className="flex gap-2">
                    <span className="text-ink-700">+</span>
                    <span>{it}</span>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}
