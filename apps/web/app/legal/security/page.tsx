import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, breadcrumbs } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "Security & vulnerability disclosure",
  description: "How to report a security issue and our safe-harbor policy.",
  path: "/legal/security",
});

export default function SecurityLegalPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-ivory-dim">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbs([
            { name: "Home", url: "/" },
            { name: "Legal", url: "/trust" },
            { name: "Security", url: "/legal/security" },
          ]),
        )}
      />
      <p className="text-xs uppercase tracking-[0.3em] text-ivory-mute">Legal</p>
      <h1 className="mt-3 font-display text-4xl text-gold-grad">Security & disclosure</h1>

      <div className="mt-8 space-y-6 text-sm">
        <section>
          <h2 className="font-display text-xl text-ivory">Reporting</h2>
          <p>
            Email <a href="mailto:security@ed5enterprise.com" className="text-gold underline">security@ed5enterprise.com</a>.
            Machine-readable metadata is at{" "}
            <a href="/.well-known/security.txt" className="text-gold underline">/.well-known/security.txt</a>.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ivory">Safe harbor</h2>
          <p>
            We will not pursue legal action against good-faith researchers who avoid privacy violations and service disruption,
            don&apos;t exploit beyond what&apos;s needed to demonstrate the issue, and give us reasonable time (default 90 days) to
            remediate before public disclosure.
          </p>
        </section>
        <section>
          <h2 className="font-display text-xl text-ivory">In scope</h2>
          <ul className="list-disc pl-5">
            <li><code>vcard.ed5enterprise.com</code> and its API.</li>
            <li>Public profile pages at <code>/u/&lt;username&gt;</code>.</li>
            <li>Embed widget at <code>/embed.js</code>.</li>
          </ul>
        </section>
        <section id="hall-of-fame">
          <h2 className="font-display text-xl text-ivory">Hall of fame</h2>
          <p>Coming soon — first 25 valid reports get the gold.</p>
        </section>
      </div>
    </main>
  );
}
