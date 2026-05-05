import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, breadcrumbs } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "Cookie policy",
  description: "What cookies VoidCard uses and how to control them.",
  path: "/legal/cookies",
});

export default function CookiesPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-ivory-dim">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbs([
            { name: "Home", url: "/" },
            { name: "Legal", url: "/trust" },
            { name: "Cookies", url: "/legal/cookies" },
          ]),
        )}
      />
      <p className="text-xs uppercase tracking-[0.3em] text-ivory-mute">Legal</p>
      <h1 className="mt-3 font-display text-4xl text-gold-grad">Cookie policy</h1>
      <p className="mt-2 text-sm">Version 2026-05-01.</p>

      <div className="mt-8 space-y-6 text-sm">
        <section>
          <h2 className="font-display text-xl text-ivory">Essential</h2>
          <p>Authentication, CSRF protection, plan + entitlement caching, language preference. Cannot be disabled.</p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ivory">Analytics (optional)</h2>
          <p>
            PostHog and Vercel Analytics. Used to understand which pages and features are used. Loaded only after you accept.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ivory">Marketing (optional)</h2>
          <p>Currently none enabled. If we add any (e.g., conversion pixels), we&apos;ll re-prompt for consent.</p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ivory">Your choices</h2>
          <p>
            Use the consent banner that appears on first visit. Re-open it any time by clearing site data, or by visiting{" "}
            <a className="text-gold underline" href="/account/privacy">/account/privacy</a>.
          </p>
        </section>
      </div>
    </main>
  );
}
