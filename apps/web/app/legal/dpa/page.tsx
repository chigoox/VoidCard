import Link from "next/link";
import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, breadcrumbs } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "Data Processing Addendum",
  description: "VoidCard Data Processing Addendum (DPA) for customers under GDPR/UK-GDPR/CCPA.",
  path: "/legal/dpa",
});

export default function DpaPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16 text-ivory-dim">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbs([
            { name: "Home", url: "/" },
            { name: "Legal", url: "/trust" },
            { name: "DPA", url: "/legal/dpa" },
          ]),
        )}
      />
      <p className="text-xs uppercase tracking-[0.3em] text-ivory-mute">Legal</p>
      <h1 className="mt-3 font-display text-4xl text-gold-grad">Data Processing Addendum</h1>
      <p className="mt-2 text-sm">Version 2026-05-01</p>

      <div className="prose prose-invert mt-8 max-w-none space-y-6 text-sm">
        <p>
          This Data Processing Addendum (&quot;DPA&quot;) forms part of the VoidCard Terms of Service between you (&quot;Customer&quot;) and
          ED5 Enterprise (&quot;Processor&quot;) governing processing of personal data on Customer&apos;s behalf.
        </p>

        <h2 className="font-display text-xl text-ivory">1. Roles and scope</h2>
        <p>
          Customer is the data controller. Processor processes personal data only on documented instructions consistent with the
          Service. Processing is limited to providing the Service, including hosting, analytics (when consented), payments,
          and email delivery.
        </p>

        <h2 className="font-display text-xl text-ivory">2. Subprocessors</h2>
        <p>
          A current list is maintained at <Link href="/legal/subprocessors" className="text-gold underline">/legal/subprocessors</Link>.
          Processor will provide 30 days&apos; notice of new subprocessors via in-product banner; Customer may object and terminate.
        </p>

        <h2 className="font-display text-xl text-ivory">3. Security measures</h2>
        <p>
          TLS 1.2+ in transit, AES-256 at rest, RLS-isolated data per user, daily-rotating IP-hash salt for analytics,
          per-request CSP nonce, Stripe-handled card data (PCI SAQ-A), least-privilege service-role keys, audit log of admin
          actions, secret rotation per <Link href="/docs/SECURITY.md" className="text-gold underline">SECURITY.md</Link>.
        </p>

        <h2 className="font-display text-xl text-ivory">4. Data subject rights</h2>
        <p>
          Processor provides self-serve export and deletion at{" "}
          <Link href="/account/privacy" className="text-gold underline">/account/privacy</Link>. Processor will assist Customer with
          additional rights requests within statutory timelines.
        </p>

        <h2 className="font-display text-xl text-ivory">5. International transfers</h2>
        <p>
          Personal data may be transferred to the United States. Standard Contractual Clauses (EU 2021/914) and the UK Addendum
          apply where required.
        </p>

        <h2 className="font-display text-xl text-ivory">6. Personal data breach</h2>
        <p>
          Processor will notify Customer without undue delay (target: 72 hours from confirmation of a reportable incident),
          including known scope, affected categories, and remediation steps.
        </p>

        <h2 className="font-display text-xl text-ivory">7. Audit</h2>
        <p>
          Customer may request reasonable evidence of compliance once per year (e.g., the latest pen-test summary or SOC 2
          report once available).
        </p>

        <h2 className="font-display text-xl text-ivory">8. Return or deletion</h2>
        <p>
          On termination, Processor deletes Customer Data within 30 days of contract end except where law requires retention.
        </p>

        <p className="text-xs text-ivory-mute">
          For execution copies email <a href="mailto:legal@ed5enterprise.com" className="text-gold underline">legal@ed5enterprise.com</a>.
        </p>
      </div>
    </main>
  );
}
