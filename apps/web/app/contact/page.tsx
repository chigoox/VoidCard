import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { buildMetadata } from "@/lib/seo";

export const metadata = buildMetadata({
  title: "Contact",
  description: "Talk to the VoidCard team about your NFC card, link-in-bio, or shop setup.",
  path: "/contact",
});

export default function ContactPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-6 py-20">
        <p className="text-xs uppercase tracking-[0.3em] text-ink-400">Contact</p>
        <h1 className="mt-3 font-display text-4xl text-ink">Talk to a human.</h1>
        <p className="mt-4 text-ink-500">
          Press, partnerships, support, or a custom-art card you want printed — pick the right inbox.
        </p>

        <div className="mt-10 grid gap-4 md:grid-cols-2">
          <a href="mailto:support@ed5enterprise.com" className="surface p-6 hover:border-gold/50">
            <p className="font-semibold text-ink">Support</p>
            <p className="mt-1 text-sm text-ink-400">support@ed5enterprise.com</p>
            <p className="mt-3 text-sm text-ink-500">Lost card, billing, refund, account help.</p>
          </a>
          <a href="mailto:sales@ed5enterprise.com" className="surface p-6 hover:border-gold/50">
            <p className="font-semibold text-ink">Sales & Teams</p>
            <p className="mt-1 text-sm text-ink-400">sales@ed5enterprise.com</p>
            <p className="mt-3 text-sm text-ink-500">10+ seats, custom artwork, bulk orders.</p>
          </a>
          <a href="mailto:press@ed5enterprise.com" className="surface p-6 hover:border-gold/50">
            <p className="font-semibold text-ink">Press</p>
            <p className="mt-1 text-sm text-ink-400">press@ed5enterprise.com</p>
            <p className="mt-3 text-sm text-ink-500">Brand kit, embargoed news, interviews.</p>
          </a>
          <a href="https://discord.gg/s3Nk2qb8tJ" target="_blank" rel="noreferrer" className="surface p-6 hover:border-gold/50">
            <p className="font-semibold text-ink">Community</p>
            <p className="mt-1 text-sm text-ink-400">Discord</p>
            <p className="mt-3 text-sm text-ink-500">Show off your card, swap themes, request features.</p>
          </a>
        </div>

        <p className="mt-10 text-xs text-ink-400">
          VoidCard is part of ED5 Enterprise. Mailing address available on request.
        </p>
      </main>
      <SiteFooter />
    </>
  );
}
