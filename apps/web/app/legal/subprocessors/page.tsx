import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, breadcrumbs } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "Subprocessors",
  description: "Third parties VoidCard uses to provide the service.",
  path: "/legal/subprocessors",
});

const SUBPROCESSORS = [
  { vendor: "Supabase", purpose: "Postgres + Auth + Storage", region: "US-East", url: "https://supabase.com" },
  { vendor: "Stripe", purpose: "Payments + subscription billing", region: "US / Global", url: "https://stripe.com" },
  { vendor: "Vercel", purpose: "Hosting + edge runtime + analytics", region: "Global", url: "https://vercel.com" },
  { vendor: "Resend", purpose: "Transactional email", region: "US", url: "https://resend.com" },
  { vendor: "Upstash", purpose: "Redis (rate-limit, caches, salts)", region: "Global", url: "https://upstash.com" },
  { vendor: "Cloudflare", purpose: "Turnstile (anti-abuse) + DNS", region: "Global", url: "https://cloudflare.com" },
  { vendor: "PostHog", purpose: "Product analytics (consented only)", region: "EU", url: "https://posthog.com" },
  { vendor: "Sentry", purpose: "Error monitoring (PII-scrubbed)", region: "EU", url: "https://sentry.io" },
];

export default function SubprocessorsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-ivory-dim">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbs([
            { name: "Home", url: "/" },
            { name: "Legal", url: "/trust" },
            { name: "Subprocessors", url: "/legal/subprocessors" },
          ]),
        )}
      />
      <p className="text-xs uppercase tracking-[0.3em] text-ivory-mute">Legal</p>
      <h1 className="mt-3 font-display text-4xl text-gold-grad">Subprocessors</h1>
      <p className="mt-2 text-sm">Last updated 2026-05-01.</p>

      <p className="mt-6 text-sm">
        We&apos;ll give 30 days&apos; notice in-app before adding new subprocessors. To subscribe to changes, email{" "}
        <a href="mailto:legal@ed5enterprise.com" className="text-gold underline">legal@ed5enterprise.com</a>.
      </p>

      <table className="mt-8 w-full text-sm">
        <thead>
          <tr className="border-b border-ivory-mute/20 text-left">
            <th className="py-2">Vendor</th>
            <th className="py-2">Purpose</th>
            <th className="py-2">Region</th>
          </tr>
        </thead>
        <tbody>
          {SUBPROCESSORS.map((s) => (
            <tr key={s.vendor} className="border-b border-ivory-mute/10">
              <td className="py-3">
                <a href={s.url} className="text-gold underline" target="_blank" rel="noreferrer">{s.vendor}</a>
              </td>
              <td className="py-3">{s.purpose}</td>
              <td className="py-3">{s.region}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </main>
  );
}
