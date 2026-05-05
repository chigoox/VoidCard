import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, breadcrumbs } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "API v1 — VoidCard developer docs",
  description: "Programmatic access to your VoidCard profile. Bearer-token authenticated, 120 req/min, REST + webhooks.",
  path: "/docs/api",
});

export default function ApiDocsPage() {
  return (
    <main className="min-h-screen bg-onyx-grad">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbs([
            { name: "Home", url: "/" },
            { name: "Docs", url: "/docs" },
            { name: "API", url: "/docs/api" },
          ]),
        )}
      />
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-sm uppercase tracking-[0.2em] text-gold">Docs</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">Public API v1</h1>
        <p className="mt-3 text-ivory-dim">
          Programmatic access to your VoidCard profile. Pro plan and above. Bearer-token authenticated.
        </p>

        <section className="mt-12 space-y-6 text-ivory-dim">
          <Block title="Base URL">
            <code className="text-gold">https://vcard.ed5enterprise.com/api/v1</code>
          </Block>

          <Block title="Authentication">
            Pass your API key as a bearer token:
            <Pre>{`Authorization: Bearer vk_live_xxxxxxxxxxxxxxxxx`}</Pre>
            Generate keys in <code className="text-gold">Settings → API</code>. Each key is hashed at rest;
            you can only see the secret once at creation.
          </Block>

          <Block title="Rate limit">
            120 requests / minute / key. <code className="text-gold">429</code> returns a{" "}
            <code className="text-gold">Retry-After</code> header.
          </Block>

          <Block title="Endpoints">
            <ul className="mt-2 space-y-2">
              <li><code className="text-gold">GET /me</code> — current profile snapshot</li>
              <li><code className="text-gold">GET /profiles/:handle</code> — public profile data</li>
              <li><code className="text-gold">POST /sections</code> — create a section</li>
              <li><code className="text-gold">PATCH /sections/:id</code> — update a section</li>
              <li><code className="text-gold">DELETE /sections/:id</code> — remove a section</li>
              <li><code className="text-gold">GET /analytics?from=…&to=…</code> — taps + views by day</li>
            </ul>
          </Block>

          <Block title="Webhooks">
            Subscribe to events at <code className="text-gold">Settings → Webhooks</code>. HTTPS endpoints only,
            unless you have the Verified Badge.
            <Pre>{`POST https://your.app/hook
X-VoidCard-Signature: t=1716762000,v1=…
{
  "type": "tap.created",
  "data": { "source": "nfc", "card_id": "uuid" }
}`}</Pre>
          </Block>
        </section>
      </article>
      <SiteFooter />
    </main>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="font-display text-xl text-ivory">{title}</h2>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Pre({ children }: { children: string }) {
  return (
    <pre className="mt-3 overflow-x-auto rounded-card border border-onyx-700 bg-onyx-950 p-4 text-xs leading-relaxed text-ivory-dim">
      <code>{children}</code>
    </pre>
  );
}
