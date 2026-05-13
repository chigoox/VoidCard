import Image from "next/image";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CheckoutButton } from "@/components/checkout-button";
import { TrustStrip } from "@/components/trust-strip";
import { listProducts, formatPrice, isCustomDesignAddonCardSku, type DbProduct } from "@/lib/cms";
import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, breadcrumbs } from "@/lib/jsonld";

export const metadata = buildMetadata({
  title: "Shop — Metal NFC business cards from $19",
  description:
    "Real metal NFC cards, designer bundles, and team packs. Hand someone metal, not a URL. Includes Verified Badge.",
  path: "/shop",
});

export const dynamic = "force-dynamic";

const FALLBACK: DbProduct[] = [
  { id: "f-card-pvc",       sku: "card-pvc",       name: "VoidCard PVC",     blurb: "Matte black PVC with gold-foil VoidCard mark. The everyday hand-off.",                          finish: "PVC · Gold foil",          ships: "Ships in 3–5 days",  badge: null,                image_url: null, image_urls: [], price_cents: 1900, currency: "usd", description: null, stripe_price_id: null, active: true, position: 10, metadata: { verified_included: false } },
  { id: "f-card-metal",     sku: "card-metal",     name: "VoidCard Metal",   blurb: "Brushed stainless with a laser-etched monogram. Heavy in the hand.",                            finish: "Stainless · Laser etched", ships: "Ships in 5–7 days",  badge: "Includes Verified", image_url: null, image_urls: [], price_cents: 2900, currency: "usd", description: null, stripe_price_id: null, active: true, position: 20, metadata: { verified_included: true } },
  { id: "f-card-custom",    sku: "card-custom",    name: "Custom Art",       blurb: "Your art, your finish. Requires Verified Badge before order.",                                  finish: "Custom · Foil/etch/print", ships: "Ships in 10–14 days",badge: "Verified-only",     image_url: null, image_urls: [], price_cents: 4900, currency: "usd", description: null, stripe_price_id: null, active: true, position: 30, metadata: { verified_included: true, requires_verified: true } },
  { id: "f-keychain",       sku: "keychain",       name: "Keychain",         blurb: "NFC keychain in onyx leather. Same tap-to-share, fits on your keys.",                           finish: "Leather · NFC",            ships: "Ships in 3–5 days",  badge: null,                image_url: null, image_urls: [], price_cents: 1500, currency: "usd", description: null, stripe_price_id: null, active: true, position: 40, metadata: {} },
  { id: "f-stickers-5",     sku: "stickers-5",     name: "Stickers (5)",     blurb: "Pack of five NFC stickers. Stick them on laptops, guitars, lockers.",                           finish: "5× NFC vinyl",             ships: "Ships in 3–5 days",  badge: null,                image_url: null, image_urls: [], price_cents:  900, currency: "usd", description: null, stripe_price_id: null, active: true, position: 50, metadata: {} },
  { id: "f-bundle-starter", sku: "bundle-starter", name: "Starter Bundle",   blurb: "1 metal card + keychain + 5 stickers. Best value for new founders.",                            finish: "Bundle",                   ships: "Ships in 5–7 days",  badge: "Includes Verified", image_url: null, image_urls: [], price_cents: 3500, currency: "usd", description: null, stripe_price_id: null, active: true, position: 60, metadata: { verified_included: true } },
  { id: "f-team-5pack",     sku: "team-5pack",     name: "Team 5-Pack",      blurb: "Five metal cards, brand kit ready. Built for studios and crews.",                               finish: "5× Stainless",             ships: "Ships in 7–10 days", badge: "Includes Verified", image_url: null, image_urls: [], price_cents: 7900, currency: "usd", description: null, stripe_price_id: null, active: true, position: 70, metadata: { verified_included: true } },
  { id: "f-verified-badge", sku: "verified-badge", name: "Verified Badge",   blurb: "One-time upgrade. Required for custom art, apex domain, and non-HTTPS webhooks.",                finish: "Digital",                  ships: "Instant",            badge: null,                image_url: null, image_urls: [], price_cents:  500, currency: "usd", description: null, stripe_price_id: null, active: true, position: 90, metadata: { digital: true } },
];

export default async function ShopPage() {
  const fromDb = await listProducts();
  const products: DbProduct[] = fromDb.length > 0 ? fromDb : FALLBACK;

  return (
    <main className="min-h-screen bg-white text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbs([
            { name: "Home", url: "/" },
            { name: "Shop", url: "/shop" },
          ]),
        )}
      />
      <SiteHeader />

      <section className="mx-auto max-w-7xl px-6 pb-12 pt-20 text-center">
        <p className="text-sm uppercase tracking-[0.2em] text-ink-700">Shop</p>
        <h1 className="mt-3 font-display text-5xl leading-tight tracking-tight md:text-6xl">
          Hand someone <span className="text-ink">metal</span>, not a URL.
        </h1>
        <p className="mx-auto mt-5 max-w-2xl text-lg text-ink-500">
          Every card pairs to your profile in one tap. Update your links any time —
          the card never expires.
        </p>
        <div className="mt-7 flex flex-wrap justify-center gap-3">
          <Link href="/u/voidluxury" className="btn-outline">See what a tap opens</Link>
          <Link href="/why-voidcard" className="btn-outline">Why it stays free</Link>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-6 pb-16 md:grid-cols-2 lg:grid-cols-3">
        {products.map((sku) => {
          const imageUrl = sku.image_urls[0] ?? sku.image_url;
          return (
          <div key={sku.id} className="surface flex flex-col p-6">
            <div className="relative aspect-[16/10] overflow-hidden rounded-card bg-white text-ink ring-1 ring-paper-200">
              {imageUrl ? (
                <Image
                  src={imageUrl}
                  alt={sku.name}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                />
              ) : (
                <div className="flex h-full items-center justify-center">
                  <div className="rounded-card bg-gold-grad/10 px-6 py-3 font-display text-2xl text-ink ring-1 ring-gold/40">
                    {sku.name}
                  </div>
                </div>
              )}
            </div>
            <div className="mt-5 flex items-start justify-between gap-3">
              <h2 className="font-display text-xl">{sku.name}</h2>
              <span className="font-display text-2xl text-ink">{formatPrice(sku.price_cents, sku.currency)}</span>
            </div>
            <p className="mt-2 text-sm text-ink-500">{sku.blurb ?? sku.description}</p>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-ink-400">
              {sku.finish && <span className="rounded-pill border border-paper-300 px-2.5 py-1">{sku.finish}</span>}
              {sku.ships && <span className="rounded-pill border border-paper-300 px-2.5 py-1">{sku.ships}</span>}
              {sku.badge && (
                <span className="rounded-pill bg-ink px-2.5 py-1 font-semibold text-white">
                  {sku.badge}
                </span>
              )}
            </div>
            {sku.sku === "card-custom" ? (
              <Link href="/cards/design" className="btn-primary mt-5 self-start">
                Design card
              </Link>
            ) : isCustomDesignAddonCardSku(sku.sku) ? (
              <Link href={`/shop/${sku.sku}`} className="btn-primary mt-5 self-start">
                Order
              </Link>
            ) : (
              <CheckoutButton
                kind="shop"
                sku={sku.sku}
                label={sku.sku === "verified-badge" ? "Get Verified" : "Order"}
                className="btn-primary mt-5 self-start"
              />
            )}
          </div>
          );
        })}
      </section>

      {/* Buyer assurance */}
      <section className="mx-auto max-w-5xl px-6 pb-16">
        <div className="grid gap-4 md:grid-cols-4">
          {[
            { t: "30-day refund", d: "Unused cards, no questions asked." },
            { t: "Pairs in 30 seconds", d: "Tap to phone, sign in, done." },
            { t: "Cards never expire", d: "Update your links any time, forever." },
            { t: "Stripe-secured", d: "We never see your card details." },
          ].map((b) => (
            <div key={b.t} className="rounded-card border border-paper-200 bg-paper-50 p-5">
              <p className="font-display text-lg text-ink">{b.t}</p>
              <p className="mt-1 text-sm text-ink-500">{b.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-6 pb-24 text-center text-sm text-ink-400">
        <p>
          Need 25+ cards or co-branded packaging?{" "}
          <Link href="/contact" className="text-ink-700 hover:underline">Talk to us</Link>.
        </p>
      </section>

      <TrustStrip />
      <SiteFooter />
    </main>
  );
}
