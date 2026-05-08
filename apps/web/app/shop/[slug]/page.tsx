import Link from "next/link";
import { notFound } from "next/navigation";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CheckoutButton } from "@/components/checkout-button";
import { getCustomDesignAddonCents, getProductBySku, formatPrice, isCustomDesignAddonCardSku } from "@/lib/cms";
import { buildMetadata } from "@/lib/seo";
import { jsonLdScript, breadcrumbs } from "@/lib/jsonld";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = await getProductBySku(slug);
  if (!p) return buildMetadata({ title: "Product not found", description: "This product is unavailable.", path: `/shop/${slug}` });
  return buildMetadata({
    title: `${p.name} — VoidCard Shop`,
    description: p.blurb ?? p.description ?? `Order ${p.name} from VoidCard.`,
    path: `/shop/${slug}`,
  });
}

export default async function ProductPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams?: Promise<{ custom_design?: string; design_id?: string }>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const product = await getProductBySku(slug);
  if (!product || !product.active) notFound();
  const designId =
    typeof query?.design_id === "string" && /^[0-9a-f-]{36}$/i.test(query.design_id)
      ? query.design_id
      : undefined;
  const isCustomCard = product.sku === "card-custom";
  const supportsCustomDesignAddon = isCustomDesignAddonCardSku(product.sku);
  const customDesignAddonCents = supportsCustomDesignAddon ? await getCustomDesignAddonCents() : 0;
  const wantsCustomDesignAddon = supportsCustomDesignAddon && (query?.custom_design === "1" || Boolean(designId));
  const orderTotalCents = product.price_cents + (wantsCustomDesignAddon && designId ? customDesignAddonCents : 0);
  const designReturnTo = `/shop/${product.sku}${supportsCustomDesignAddon ? "?custom_design=1" : ""}`;
  const chooseDesignHref = `/cards/design?return_to=${encodeURIComponent(designReturnTo)}`;

  const requiresVerified = Boolean(
    (product.metadata as { requires_verified?: boolean } | null)?.requires_verified,
  );
  const includesVerified = Boolean(
    (product.metadata as { verified_included?: boolean } | null)?.verified_included,
  );

  return (
    <main className="min-h-screen bg-white text-ink">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={jsonLdScript(
          breadcrumbs([
            { name: "Home", url: "/" },
            { name: "Shop", url: "/shop" },
            { name: product.name, url: `/shop/${product.sku}` },
          ]),
        )}
      />
      <SiteHeader />

      <section className="mx-auto grid max-w-6xl gap-12 px-6 pb-16 pt-12 md:grid-cols-2">
        <div className="surface aspect-[4/5] overflow-hidden p-6">
          <div className="flex h-full items-center justify-center rounded-card bg-gold-grad/10 ring-1 ring-gold/30">
            <div className="font-display text-3xl text-ink">{product.name}</div>
          </div>
        </div>

        <div>
          <Link href="/shop" className="text-sm text-ink-500 hover:text-ink">← Back to shop</Link>
          <h1 className="mt-2 font-display text-4xl leading-tight tracking-tight">{product.name}</h1>
          <div className="mt-3 font-display text-3xl text-ink">{formatPrice(product.price_cents, product.currency)}</div>

          <p className="mt-5 text-base text-ink-500">{product.blurb ?? product.description}</p>

          <div className="mt-5 flex flex-wrap gap-2 text-xs text-ink-400">
            {product.finish && <span className="rounded-pill border border-paper-300 px-2.5 py-1">{product.finish}</span>}
            {product.ships && <span className="rounded-pill border border-paper-300 px-2.5 py-1">{product.ships}</span>}
            {product.badge && (
              <span className="rounded-pill bg-ink px-2.5 py-1 font-semibold text-white">{product.badge}</span>
            )}
            {includesVerified && (
              <span className="rounded-pill border border-gold/50 px-2.5 py-1 text-ink">Verified Badge included</span>
            )}
          </div>

          {requiresVerified && (
            <div className="mt-5 rounded-card border border-paper-300 bg-paper-50 p-4 text-sm text-ink-600">
              <strong>Verified Badge required.</strong> This product can only be ordered after you complete verification.{" "}
              <Link href="/account/verify" className="underline">Get Verified</Link>.
            </div>
          )}

          {supportsCustomDesignAddon && (
            <div className="mt-6 rounded-card border border-paper-300 bg-paper-50 p-4 text-sm text-ink-600">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">Custom design</p>
                  <p className="mt-1 text-ink-500">Use artwork from the VoidCard designer on this card.</p>
                </div>
                <span className="font-display text-lg text-ink">+{formatPrice(customDesignAddonCents, product.currency)}</span>
              </div>
              <div className="mt-4 flex flex-wrap gap-3">
                {wantsCustomDesignAddon ? (
                  <>
                    <Link href={chooseDesignHref} className="btn-primary" data-testid="card-addon-choose-design">
                      {designId ? "Change design" : "Choose design"}
                    </Link>
                    <Link href={`/shop/${product.sku}`} className="btn-ghost">
                      Standard design
                    </Link>
                  </>
                ) : (
                  <Link href={`/shop/${product.sku}?custom_design=1`} className="btn-ghost" data-testid="card-addon-select">
                    Add custom design
                  </Link>
                )}
              </div>
              {wantsCustomDesignAddon && designId && (
                <p className="mt-3 text-xs uppercase tracking-[0.16em] text-ink-400" data-testid="card-addon-selected">
                  Design selected
                </p>
              )}
            </div>
          )}

          <div className="mt-7 flex flex-wrap gap-3">
            {isCustomCard && !designId ? (
              <Link href={chooseDesignHref} className="btn-primary" data-testid="custom-card-choose-design">
                Choose design
              </Link>
            ) : wantsCustomDesignAddon && !designId ? (
              <Link href={chooseDesignHref} className="btn-primary" data-testid="card-addon-checkout-choose-design">
                Choose design to order
              </Link>
            ) : (
              <CheckoutButton
                kind="shop"
                sku={product.sku}
                designId={designId}
                customDesign={wantsCustomDesignAddon}
                label={`Order — ${formatPrice(orderTotalCents, product.currency)}`}
                className="btn-primary"
                testId={isCustomCard ? "custom-card-checkout" : wantsCustomDesignAddon ? "card-addon-checkout" : undefined}
              />
            )}
            {isCustomCard && designId && (
              <Link href={chooseDesignHref} className="btn-ghost">
                Change design
              </Link>
            )}
          </div>

          <ul className="mt-10 space-y-3 text-sm text-ink-500">
            <li>· Pairs in under 30 seconds with any iPhone or Android</li>
            <li>· Cards never expire — update your profile any time</li>
            <li>· 30-day refund on unused cards</li>
            <li>· Stripe-secured checkout</li>
          </ul>
        </div>
      </section>

      <SiteFooter />
    </main>
  );
}
