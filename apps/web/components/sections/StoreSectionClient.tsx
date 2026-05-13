"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { createPortal } from "react-dom";

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
  shippable: boolean;
  digital: boolean;
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
  const [modalOpen, setModalOpen] = useState(false);
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

  useEffect(() => {
    if (!modalOpen) return;
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") setModalOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [modalOpen]);

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
    <>
      <div
        data-vc-product={product.id}
        role="button"
        tabIndex={0}
        onClick={() => setModalOpen(true)}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            setModalOpen(true);
          }
        }}
        className={layout === "list" ? "group flex cursor-pointer gap-3 p-3 transition hover:-translate-y-0.5" : "group flex cursor-pointer flex-col gap-2 p-3 transition hover:-translate-y-0.5"}
        style={{
          background: "var(--vc-bg-2, #141414)",
          border: `1px solid ${SURFACE_BORDER}`,
          borderRadius: "var(--vc-radius, 14px)",
          color: "var(--vc-fg, #f7f3ea)",
          boxShadow: "0 14px 30px color-mix(in srgb, var(--vc-bg, #0a0a0a) 28%, transparent)",
        }}
        aria-label={`View ${product.name} details`}
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
            <div className="flex gap-1 py-1" aria-label={`${product.name} images`} onClick={(event) => event.stopPropagation()}>
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
              onClick={(event) => event.stopPropagation()}
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
              onClick={(event) => {
                event.stopPropagation();
                buy();
              }}
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
      <ProductDetailsModal
        open={modalOpen}
        product={product}
        images={images}
        activeImageIndex={visibleImageIndex}
        setActiveImageIndex={setActiveImageIndex}
        variants={variants}
        selectedVariantId={selectedVariant?.id ?? ""}
        setSelectedVariantId={setSelectedVariantId}
        selectedVariant={selectedVariant}
        displayPriceCents={displayPriceCents}
        showPrice={showPrice}
        buttonLabel={buttonLabel}
        pending={pending}
        outOfStock={outOfStock}
        error={error}
        onBuy={buy}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function ProductDetailsModal({
  open,
  product,
  images,
  activeImageIndex,
  setActiveImageIndex,
  variants,
  selectedVariantId,
  setSelectedVariantId,
  selectedVariant,
  displayPriceCents,
  showPrice,
  buttonLabel,
  pending,
  outOfStock,
  error,
  onBuy,
  onClose,
}: {
  open: boolean;
  product: PublicProduct;
  images: string[];
  activeImageIndex: number;
  setActiveImageIndex: (index: number) => void;
  variants: PublicProductVariant[];
  selectedVariantId: string;
  setSelectedVariantId: (id: string) => void;
  selectedVariant: PublicProductVariant | null;
  displayPriceCents: number;
  showPrice: boolean;
  buttonLabel: string;
  pending: boolean;
  outOfStock: boolean;
  error: string | null;
  onBuy: () => void;
  onClose: () => void;
}) {
  if (!open || typeof document === "undefined") return null;

  const activeImage = images[activeImageIndex] ?? images[0] ?? null;
  const availabilityLabel = outOfStock
    ? "Sold out"
    : selectedVariant?.inventory !== null && selectedVariant?.inventory !== undefined
      ? `${selectedVariant.inventory} available`
      : product.inventory !== null
        ? `${product.inventory} available`
        : "Available";

  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/75 p-3 backdrop-blur-sm sm:items-center sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label={`${product.name} details`}
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden rounded-[18px] border shadow-2xl sm:max-h-[min(44rem,calc(100dvh-3rem))] sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)]"
        style={{
          background: "var(--vc-bg-2, #141414)",
          borderColor: SURFACE_BORDER,
          color: "var(--vc-fg, #f7f3ea)",
        }}
      >
        <div className="min-h-0 overflow-y-auto sm:contents">
          <div className="space-y-2 p-3 sm:min-h-0 sm:overflow-y-auto sm:p-4">
            <div
              className="relative aspect-square overflow-hidden rounded-[14px] border"
              style={{ borderColor: SURFACE_BORDER, background: "var(--vc-bg, #0a0a0a)" }}
            >
              {activeImage ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={activeImage} alt={product.name} className="h-full w-full object-cover" loading="eager" decoding="async" />
              ) : (
                <div className="flex h-full items-center justify-center px-6 text-center text-sm" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
                  No product image
                </div>
              )}
              <span
                className="absolute left-3 top-3 rounded-pill px-3 py-1 text-[11px] font-medium uppercase tracking-[0.18em]"
                style={{
                  background: outOfStock ? "#7f1d1d" : "var(--vc-accent, #d4af37)",
                  color: outOfStock ? "#fee2e2" : "var(--vc-bg, #0a0a0a)",
                }}
              >
                {availabilityLabel}
              </span>
            </div>
            {images.length > 1 ? (
              <div className="grid grid-cols-5 gap-2" aria-label={`${product.name} gallery`}>
                {images.map((image, index) => (
                  <button
                    key={`${product.id}-modal-image-${index}`}
                    type="button"
                    onClick={() => setActiveImageIndex(index)}
                    className="aspect-square overflow-hidden rounded-[10px] border"
                    style={{
                      borderColor: index === activeImageIndex ? "var(--vc-accent, #d4af37)" : SURFACE_BORDER,
                      opacity: index === activeImageIndex ? 1 : 0.68,
                    }}
                    aria-label={`Show image ${index + 1}`}
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                  </button>
                ))}
              </div>
            ) : null}
          </div>
          <div className="flex min-h-0 flex-col gap-4 overflow-y-auto border-t p-4 sm:border-l sm:border-t-0 sm:p-5" style={{ borderColor: SURFACE_BORDER }}>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 space-y-1">
                <h3 className="font-display text-xl leading-tight">{product.name}</h3>
                {showPrice ? (
                  <p className="font-mono text-lg" style={{ color: "var(--vc-accent, #d4af37)" }}>
                    {fmtMoney(displayPriceCents, product.currency)}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="shrink-0 rounded-full border px-3 py-1 text-lg leading-none"
                style={{ borderColor: SURFACE_BORDER, color: "var(--vc-fg, #f7f3ea)" }}
                aria-label="Close product details"
              >
                ×
              </button>
            </div>

            <div className="flex flex-wrap gap-2 text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
              {product.digital ? <span className="rounded-pill border px-2.5 py-1" style={{ borderColor: SURFACE_BORDER }}>Digital</span> : null}
              {product.shippable ? <span className="rounded-pill border px-2.5 py-1" style={{ borderColor: SURFACE_BORDER }}>Ships</span> : null}
              {variants.length > 0 ? <span className="rounded-pill border px-2.5 py-1" style={{ borderColor: SURFACE_BORDER }}>{variants.length} options</span> : null}
            </div>

            {product.description ? (
              <p className="whitespace-pre-line text-sm leading-6" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
                {product.description}
              </p>
            ) : null}

            {variants.length > 0 ? (
              <label className="block space-y-2">
                <span className="text-[11px] uppercase tracking-[0.22em]" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>Option</span>
                <select
                  value={selectedVariantId}
                  onChange={(event) => setSelectedVariantId(event.target.value)}
                  className="w-full rounded-[10px] border px-3 py-2 text-sm outline-none"
                  style={{
                    background: "var(--vc-bg, #0a0a0a)",
                    borderColor: SURFACE_BORDER,
                    color: "var(--vc-fg, #f7f3ea)",
                  }}
                >
                  {variants.map((variant) => (
                    <option key={variant.id} value={variant.id} disabled={variant.inventory !== null && variant.inventory <= 0}>
                      {variant.name}{variant.price_delta_cents ? ` (${variant.price_delta_cents > 0 ? "+" : ""}${fmtMoney(variant.price_delta_cents, product.currency)})` : ""}
                    </option>
                  ))}
                </select>
              </label>
            ) : null}

            {error ? <p className="text-xs" style={{ color: "#fca5a5" }}>{error}</p> : null}

            <button
              type="button"
              onClick={onBuy}
              disabled={pending || outOfStock}
              className="mt-auto rounded-pill px-4 py-3 text-sm font-semibold uppercase tracking-[0.18em]"
              style={{
                background: "var(--vc-accent, #d4af37)",
                color: "var(--vc-bg, #0a0a0a)",
                opacity: pending || outOfStock ? 0.72 : 1,
              }}
            >
              {pending ? "Opening…" : outOfStock ? "Sold out" : buttonLabel}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
