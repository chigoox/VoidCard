"use client";

import { useEffect, useMemo, useState, useTransition } from "react";

type StoreLayout = "grid" | "list";

type PublicProduct = {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[] | null;
  variants: PublicProductVariant[] | null;
  price_cents: number;
  currency: string;
  inventory: number | null;
};

type PublicProductVariant = {
  id: string;
  name: string;
  price_delta_cents: number;
  inventory: number | null;
  active: boolean;
};

const SURFACE_BORDER = "color-mix(in srgb, var(--vc-accent, #d4af37) 24%, transparent)";

function fmtMoney(cents: number, currency: string) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: currency.toUpperCase(),
      minimumFractionDigits: 2,
    }).format(cents / 100);
  } catch {
    return `$${(cents / 100).toFixed(2)}`;
  }
}

export function StoreSectionClient({
  title,
  productIds,
  layout,
  showPrice,
  buttonLabel,
  username,
}: {
  title: string;
  productIds: string[];
  layout: StoreLayout;
  showPrice: boolean;
  buttonLabel: string;
  username?: string;
}) {
  const [products, setProducts] = useState<PublicProduct[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const idsKey = useMemo(() => productIds.join(","), [productIds]);

  useEffect(() => {
    let cancelled = false;
    if (productIds.length === 0) {
      setProducts([]);
      return;
    }
    setError(null);
    fetch(`/api/seller/products?ids=${encodeURIComponent(idsKey)}`)
      .then((r) => r.json())
      .then((d: { ok?: boolean; products?: PublicProduct[]; error?: string }) => {
        if (cancelled) return;
        if (d.ok) {
          // preserve user-defined order
          const byId = new Map((d.products ?? []).map((p) => [p.id, p]));
          const ordered = productIds
            .map((id) => byId.get(id))
            .filter((p): p is PublicProduct => Boolean(p));
          setProducts(ordered);
        } else {
          setError(d.error ?? "Could not load products.");
          setProducts([]);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not load products.");
        setProducts([]);
      });
    return () => {
      cancelled = true;
    };
  }, [idsKey, productIds]);

  if (productIds.length === 0) {
    return (
      <div
        className="p-4 text-center text-sm"
        style={{
          border: `1px dashed ${SURFACE_BORDER}`,
          borderRadius: "var(--vc-radius, 14px)",
          color: "var(--vc-fg-mute, #a8a39a)",
        }}
      >
        No products selected for this store.
      </div>
    );
  }

  if (products === null) {
    return (
      <div
        className="p-4 text-center text-xs"
        style={{
          border: `1px solid ${SURFACE_BORDER}`,
          borderRadius: "var(--vc-radius, 14px)",
          color: "var(--vc-fg-mute, #a8a39a)",
        }}
      >
        Loading store…
      </div>
    );
  }

  return (
    <section data-vc-store className="space-y-3">
      {title ? (
        <h3
          className="font-display text-base"
          style={{ color: "var(--vc-fg, #f7f3ea)" }}
        >
          {title}
        </h3>
      ) : null}
      {error ? (
        <p className="text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
          {error}
        </p>
      ) : null}
      <div
        className={
          layout === "grid"
            ? "grid grid-cols-2 gap-3"
            : "flex flex-col gap-3"
        }
      >
        {products.map((p) => (
          <ProductCard
            key={p.id}
            product={p}
            layout={layout}
            showPrice={showPrice}
            buttonLabel={buttonLabel}
            username={username}
          />
        ))}
      </div>
    </section>
  );
}

function ProductCard({
  product,
  layout,
  showPrice,
  buttonLabel,
  username,
}: {
  product: PublicProduct;
  layout: StoreLayout;
  showPrice: boolean;
  buttonLabel: string;
  username?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const images = useMemo(
    () => (product.image_urls && product.image_urls.length > 0 ? product.image_urls : product.image_url ? [product.image_url] : []),
    [product.image_url, product.image_urls],
  );
  const variants = useMemo(() => (product.variants ?? []).filter((variant) => variant.active), [product.variants]);
  const [activeImageIndex, setActiveImageIndex] = useState(0);
  const [selectedVariantId, setSelectedVariantId] = useState(variants[0]?.id ?? "");
  const visibleImageIndex = images.length === 0 ? 0 : Math.min(activeImageIndex, images.length - 1);
  const selectedVariant = variants.find((variant) => variant.id === selectedVariantId) ?? variants[0] ?? null;
  const displayPriceCents = product.price_cents + (selectedVariant?.price_delta_cents ?? 0);
  const outOfStock =
    (product.inventory !== null && product.inventory <= 0) ||
    (selectedVariant?.inventory !== null && selectedVariant?.inventory !== undefined && selectedVariant.inventory <= 0);

  function buy() {
    setError(null);
    start(async () => {
      const res = await fetch("/api/stripe/connect/checkout", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ productId: product.id, variantId: selectedVariant?.id, qty: 1, profileUsername: username }),
      });
      const data = (await res.json().catch(() => ({}))) as {
        ok?: boolean;
        url?: string;
        error?: string;
      };
      if (data.ok && data.url) {
        window.location.assign(data.url);
        return;
      }
      setError(data.error ?? "Could not start checkout.");
    });
  }

  return (
    <div
      data-vc-product={product.id}
      className={layout === "list" ? "flex gap-3 p-3" : "flex flex-col gap-2 p-3"}
      style={{
        background: "var(--vc-bg-2, #141414)",
        border: `1px solid ${SURFACE_BORDER}`,
        borderRadius: "var(--vc-radius, 14px)",
        color: "var(--vc-fg, #f7f3ea)",
      }}
    >
      {images[visibleImageIndex] ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={images[visibleImageIndex]}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className={
            layout === "list"
              ? "size-20 shrink-0 object-cover"
              : "h-32 w-full object-cover"
          }
          style={{ borderRadius: "calc(var(--vc-radius, 14px) - 4px)" }}
        />
      ) : null}
      <div className="flex flex-1 flex-col gap-1">
        <p className="font-display text-sm">{product.name}</p>
        {images.length > 1 ? (
          <div className="flex gap-1 py-1" aria-label={`${product.name} images`}>
            {images.map((image, index) => (
              <button
                key={`${product.id}-image-${index}`}
                type="button"
                onClick={() => setActiveImageIndex(index)}
                className="size-8 overflow-hidden rounded-[6px] border"
                style={{
                  borderColor: index === visibleImageIndex ? "var(--vc-accent, #d4af37)" : SURFACE_BORDER,
                  opacity: index === visibleImageIndex ? 1 : 0.72,
                }}
                aria-label={`Show image ${index + 1}`}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
              </button>
            ))}
          </div>
        ) : null}
        {product.description ? (
          <p
            className="line-clamp-2 text-xs"
            style={{ color: "var(--vc-fg-mute, #a8a39a)" }}
          >
            {product.description}
          </p>
        ) : null}
        {variants.length > 0 ? (
          <select
            value={selectedVariant?.id ?? ""}
            onChange={(event) => setSelectedVariantId(event.target.value)}
            className="mt-1 w-full rounded-[8px] border px-2 py-1.5 text-xs outline-none"
            style={{
              background: "var(--vc-bg, #0a0a0a)",
              borderColor: SURFACE_BORDER,
              color: "var(--vc-fg, #f7f3ea)",
            }}
            aria-label={`${product.name} variant`}
          >
            {variants.map((variant) => (
              <option key={variant.id} value={variant.id} disabled={variant.inventory !== null && variant.inventory <= 0}>
                {variant.name}{variant.price_delta_cents ? ` (${variant.price_delta_cents > 0 ? "+" : ""}${fmtMoney(variant.price_delta_cents, product.currency)})` : ""}
              </option>
            ))}
          </select>
        ) : null}
        <div className="mt-auto flex items-center justify-between gap-2 pt-1">
          {showPrice ? (
            <span
              className="font-mono text-sm"
              style={{ color: "var(--vc-accent, #d4af37)" }}
            >
              {fmtMoney(displayPriceCents, product.currency)}
            </span>
          ) : (
            <span />
          )}
          <button
            type="button"
            onClick={buy}
            disabled={pending || outOfStock}
            className="rounded-pill px-3 py-1.5 text-xs font-medium uppercase tracking-[0.18em]"
            style={{
              background: "var(--vc-accent, #d4af37)",
              color: "var(--vc-bg, #0a0a0a)",
              opacity: pending ? 0.7 : 1,
            }}
            data-testid={`buy-${product.id}`}
          >
            {pending ? "Opening…" : outOfStock ? "Sold out" : buttonLabel}
          </button>
        </div>
        {error ? (
          <p className="text-[11px]" style={{ color: "#fca5a5" }}>
            {error}
          </p>
        ) : null}
      </div>
    </div>
  );
}
