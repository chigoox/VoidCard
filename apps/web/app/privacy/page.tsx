import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, breadcrumbs } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "What VoidCard collects, how we use it, and how to control or delete it.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbs([
            { name: "Home", url: "/" },
            { name: "Privacy", url: "/privacy" },
          ]),
        )}
      />
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Legal</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">Privacy Policy</h1>
        <p className="mt-3 text-sm text-ink-400">Last updated: May 2026</p>

        <aside className="mt-8 rounded-card border border-gold/30 bg-paper-50 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-700">In plain English</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li className="flex gap-2"><span className="text-ink-700">·</span> We store your email and what you put on your profile. That&rsquo;s it.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> We never sell your data. Ever.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> Delete your account from Settings → Danger. Personal data is purged within 30 seconds.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> Export your data any time as a one-click ZIP.</li>
          </ul>
        </aside>

        <div className="mt-10 space-y-6 text-ink-500">
          <Section title="What we collect">
            Account data (email, handle), profile content you publish, and pseudonymous analytics events
            (page views, taps, referrers). We never sell your data.
          </Section>
          <Section title="Cookies">
            One auth cookie scoped to <code className="text-ink-700">.ed5enterprise.com</code> for SSO,
            plus first-party analytics. No cross-site tracking.
          </Section>
          <Section title="Third parties">
            Supabase (auth + DB), Stripe (billing), Resend (email), Vercel (hosting), PostHog (analytics),
            Sentry (error tracking), Upstash (rate-limit cache). All under DPA.
          </Section>
          <Section title="Your rights">
            Export your data any time from{" "}
            <a href="/account/privacy" className="text-ink-700 hover:underline">Account → Privacy &amp; data</a>.
            Delete your account and we will purge personal data within 30 days, keeping only what we must retain for
            legal/financial reasons.
          </Section>
          <Section title="Children">
            VoidCard is not for children under 13. We do not knowingly collect their data.
          </Section>
          <Section title="Contact">
            <a href="mailto:privacy@vcard.ed5enterprise.com" className="text-ink-700">privacy@vcard.ed5enterprise.com</a>
          </Section>
        </div>
      </article>
      <SiteFooter />
    </main>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-2xl text-ink">{title}</h2>
      <p className="mt-2">{children}</p>
    </section>
  );
}
