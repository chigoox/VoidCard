import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, breadcrumbs } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "Terms of Service",
  description: "The contract that governs your use of VoidCard.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-white text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbs([
            { name: "Home", url: "/" },
            { name: "Terms", url: "/terms" },
          ]),
        )}
      />
      <SiteHeader />
      <article className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Legal</p>
        <h1 className="mt-3 font-display text-5xl tracking-tight">Terms of Service</h1>
        <p className="mt-3 text-sm text-ink-400">Last updated: May 2026</p>

        <aside className="mt-8 rounded-card border border-gold/30 bg-paper-50 p-6">
          <p className="text-xs uppercase tracking-[0.2em] text-ink-700">In plain English</p>
          <ul className="mt-3 space-y-2 text-sm text-ink-500">
            <li className="flex gap-2"><span className="text-ink-700">·</span> Free is free, forever — no caps, no upsell modals on Free features.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> You own everything you publish. We just host it for you.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> Cancel any time. Cancel button is the same size as the upgrade button.</li>
            <li className="flex gap-2"><span className="text-ink-700">·</span> 30-day no-questions-asked refund on physical cards.</li>
          </ul>
        </aside>

        <div className="prose prose-invert mt-10 space-y-6 text-ink-500">
          <Section title="1. Who we are">
            VoidCard is a product of ED5 Enterprise. By using VoidCard you agree to these Terms.
          </Section>
          <Section title="2. Your account">
            You are responsible for activity under your handle. Pick a strong password or use a magic link.
            You must be 13+ to use VoidCard.
          </Section>
          <Section title="3. Content">
            You retain ownership of everything you publish. You grant us a license to host, display, and back up
            your content as needed to run the service.
          </Section>
          <Section title="4. Acceptable use">
            No spam, malware, illegal content, or impersonation. We may suspend accounts that violate these rules.
          </Section>
          <Section title="5. Plans & billing">
            Free is free. Pro and Team are billed monthly via Stripe. Cancel any time — your account stays on the
            paid plan until the end of the current period.
          </Section>
          <Section title="6. Refunds">
            Physical cards: refundable within 14 days if unused. Verified Badge: non-refundable once granted.
            Subscriptions: prorated on request within 7 days of charge.
          </Section>
          <Section title="7. Termination">
            Either of us may end this agreement any time. We will give you 30 days to export your data.
          </Section>
          <Section title="8. Liability">
            VoidCard is provided as-is. Our liability is capped at fees you paid us in the prior 12 months.
          </Section>
          <Section title="9. Contact">
            Questions? <a href="mailto:hello@vcard.ed5enterprise.com" className="text-ink-700">hello@vcard.ed5enterprise.com</a>
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
