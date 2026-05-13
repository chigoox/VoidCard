"use client";

import { useEffect, useMemo, useRef, useState, useTransition, type CSSProperties } from "react";
import { createPortal } from "react-dom";
import { ArrowRight, ShoppingBag } from "lucide-react";

type StoreLayout = "grid" | "list";
type StoreShelf = "digital" | "physical";

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
const GOLD_GRADIENT = "linear-gradient(135deg, #F2D27A 0%, var(--vc-accent, #d4af37) 52%, #A47A2C 100%)";
const THEME_VARIABLES = ["--vc-bg", "--vc-bg-2", "--vc-fg", "--vc-fg-mute", "--vc-accent", "--vc-radius"] as const;

type ThemeStyle = CSSProperties & Partial<Record<(typeof THEME_VARIABLES)[number], string>>;

function readThemeStyle(element: HTMLElement | null): ThemeStyle {
  if (!element || typeof window === "undefined") return {};
  const computed = window.getComputedStyle(element);
  return THEME_VARIABLES.reduce<ThemeStyle>((style, variable) => {
    const value = computed.getPropertyValue(variable).trim();
    if (value) style[variable] = value;
    return style;
  }, {});
}

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

function matchesStoreShelf(product: PublicProduct, shelf: StoreShelf) {
  if (shelf === "digital") return product.digital;
  return product.shippable || !product.digital;
}

function productChannelLabel(product: PublicProduct) {
  if (product.digital) return "Digital";
  if (product.shippable) return "Physical";
  return "Featured";
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
  const [activeShelf, setActiveShelf] = useState<StoreShelf>("digital");
  const idsKey = useMemo(() => productIds.join(","), [productIds]);
  const sectionTitle = title.trim() || "Shop";

  useEffect(() => {
    let cancelled = false;
    if (productIds.length === 0) return;
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
          setError(null);
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

  const hasDigital = useMemo(() => (products ?? []).some((product) => matchesStoreShelf(product, "digital")), [products]);
  const hasPhysical = useMemo(() => (products ?? []).some((product) => matchesStoreShelf(product, "physical")), [products]);
  const showShelfToggle = hasDigital && hasPhysical;
  const visibleProducts = useMemo(() => {
    if (!products) return [];
    if (!showShelfToggle) return products;
    return products.filter((product) => matchesStoreShelf(product, activeShelf));
  }, [activeShelf, products, showShelfToggle]);
  const visibleCount = visibleProducts.length;
  const collectionLabel = showShelfToggle
    ? activeShelf === "digital"
      ? "Digital collection"
      : "Physical collection"
    : hasDigital
      ? "Digital collection"
      : "Curated shop";
  const layoutClassName = layout === "grid" ? "grid gap-4 sm:grid-cols-2" : "grid gap-4";

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
    <section
      data-vc-store
      className="relative overflow-hidden rounded-[28px] border px-4 py-5 sm:px-6 sm:py-6"
      style={{
        background:
          "radial-gradient(circle at top right, color-mix(in srgb, var(--vc-accent, #d4af37) 14%, transparent), transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--vc-bg-2, #141414) 96%, black), color-mix(in srgb, var(--vc-bg, #050505) 98%, transparent))",
        borderColor: SURFACE_BORDER,
        boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 36px 70px -50px rgba(0,0,0,0.92)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-28"
        style={{
          background: "linear-gradient(180deg, color-mix(in srgb, var(--vc-accent, #d4af37) 9%, transparent), transparent)",
        }}
      />
      <div className="relative space-y-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 space-y-3">
            <div className="flex items-center gap-3">
              <span
                className="inline-block h-px w-10 rounded-full"
                style={{ background: "color-mix(in srgb, var(--vc-accent, #d4af37) 72%, transparent)" }}
              />
              <span
                className="text-[10px] font-medium uppercase tracking-[0.34em]"
                style={{ color: "var(--vc-accent, #d4af37)" }}
              >
                {collectionLabel}
              </span>
            </div>
            <div className="space-y-2">
              <h3
                className="font-display text-[clamp(2.3rem,7vw,3.5rem)] leading-[0.9] tracking-[-0.04em]"
                style={{ color: "var(--vc-fg, #f7f3ea)" }}
              >
                {sectionTitle}
              </h3>
              <p className="max-w-md text-sm leading-6" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
                {visibleCount} {visibleCount === 1 ? "item" : "items"} ready for checkout.
              </p>
            </div>
          </div>
          <div className="relative shrink-0 pt-1">
            <div
              className="flex size-16 items-center justify-center rounded-full border"
              style={{
                borderColor: SURFACE_BORDER,
                background: "color-mix(in srgb, var(--vc-bg-2, #141414) 96%, transparent)",
                boxShadow: "0 16px 34px -24px rgba(0,0,0,0.92)",
              }}
              aria-hidden="true"
            >
              <ShoppingBag className="size-6" style={{ color: "var(--vc-accent, #d4af37)" }} />
            </div>
            <span
              className="absolute -right-1 -top-1 inline-flex min-w-7 items-center justify-center rounded-full px-2 py-1 text-[11px] font-semibold"
              style={{
                background: GOLD_GRADIENT,
                color: "var(--vc-bg, #050505)",
                boxShadow: "0 12px 26px -18px color-mix(in srgb, var(--vc-accent, #d4af37) 80%, transparent)",
              }}
            >
              {visibleCount}
            </span>
          </div>
        </div>

        {showShelfToggle ? (
          <div
            className="grid grid-cols-2 gap-2 rounded-full border p-1.5"
            style={{
              borderColor: SURFACE_BORDER,
              background: "color-mix(in srgb, var(--vc-bg, #050505) 86%, transparent)",
            }}
          >
            {([
              ["digital", "Digital"],
              ["physical", "Physical"],
            ] as const).map(([shelf, label]) => {
              const active = activeShelf === shelf;
              return (
                <button
                  key={shelf}
                  type="button"
                  onClick={() => setActiveShelf(shelf)}
                  className="rounded-full px-4 py-3 text-xs font-semibold uppercase tracking-[0.26em] transition"
                  style={{
                    background: active
                      ? "linear-gradient(180deg, color-mix(in srgb, var(--vc-accent, #d4af37) 18%, transparent), color-mix(in srgb, var(--vc-bg-2, #141414) 98%, transparent))"
                      : "transparent",
                    color: active ? "var(--vc-accent, #d4af37)" : "var(--vc-fg-mute, #a8a39a)",
                    border: active ? `1px solid ${SURFACE_BORDER}` : "1px solid transparent",
                    boxShadow: active ? "0 0 0 1px color-mix(in srgb, var(--vc-accent, #d4af37) 18%, transparent), 0 12px 24px -24px rgba(0,0,0,0.9)" : "none",
                  }}
                  aria-pressed={active}
                >
                  {label}
                </button>
              );
            })}
          </div>
        ) : null}

        {error ? (
          <p className="text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
            {error}
          </p>
        ) : null}

        {visibleProducts.length > 0 ? (
          <div className={layoutClassName}>
            {visibleProducts.map((p) => (
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
        ) : (
          <div
            className="rounded-[22px] border px-5 py-6 text-sm"
            style={{
              borderColor: SURFACE_BORDER,
              background: "color-mix(in srgb, var(--vc-bg-2, #141414) 94%, transparent)",
              color: "var(--vc-fg-mute, #a8a39a)",
            }}
          >
            No products available right now.
          </div>
        )}
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
  const [modalThemeStyle, setModalThemeStyle] = useState<ThemeStyle>({});
  const productRef = useRef<HTMLDivElement>(null);
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
  const channelLabel = productChannelLabel(product);
  const galleryThumbs = images.slice(0, 2);
  const remainingImageCount = Math.max(images.length - galleryThumbs.length, 0);
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

  function openDetails() {
    setModalThemeStyle(readThemeStyle(productRef.current));
    setModalOpen(true);
  }

  return (
    <>
      <div
        ref={productRef}
        data-vc-product={product.id}
        role="button"
        tabIndex={0}
        onClick={openDetails}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault();
            openDetails();
          }
        }}
        className={
          layout === "list"
            ? "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] border transition duration-300 hover:-translate-y-1 sm:grid sm:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]"
            : "group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-[28px] border transition duration-300 hover:-translate-y-1"
        }
        style={{
          background:
            "linear-gradient(180deg, color-mix(in srgb, var(--vc-bg-2, #141414) 98%, rgba(255,255,255,0.02)), color-mix(in srgb, var(--vc-bg, #050505) 96%, transparent))",
          border: `1px solid ${SURFACE_BORDER}`,
          color: "var(--vc-fg, #f7f3ea)",
          boxShadow:
            "0 1px 0 rgba(255,255,255,0.05) inset, 0 28px 56px -38px rgba(0,0,0,0.96), 0 0 0 1px color-mix(in srgb, var(--vc-accent, #d4af37) 8%, transparent)",
        }}
        aria-label={`View ${product.name} details`}
      >
        <div
          className={
            layout === "list"
              ? "relative aspect-[1/0.92] overflow-hidden sm:aspect-auto sm:min-h-[19rem]"
              : "relative aspect-[1/0.92] overflow-hidden"
          }
          style={{ background: "color-mix(in srgb, var(--vc-accent, #d4af37) 12%, var(--vc-bg, #0a0a0a))" }}
        >
          {images[visibleImageIndex] ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={images[visibleImageIndex]}
              alt={product.name}
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center px-3 text-center text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
              No image
            </div>
          )}
          <div
            className="absolute inset-x-0 bottom-0 h-24"
            style={{ background: "linear-gradient(to top, color-mix(in srgb, var(--vc-bg, #050505) 78%, transparent), transparent)" }}
          />
          <span
            className="absolute left-4 top-4 rounded-full border px-4 py-2 text-[11px] font-semibold uppercase tracking-[0.26em]"
            style={{
              background: outOfStock
                ? "rgba(127, 29, 29, 0.9)"
                : "color-mix(in srgb, var(--vc-bg, #050505) 86%, transparent)",
              color: outOfStock ? "#fee2e2" : "var(--vc-accent, #d4af37)",
              borderColor: outOfStock ? "rgba(254, 202, 202, 0.28)" : SURFACE_BORDER,
              backdropFilter: "blur(14px)",
            }}
          >
            {outOfStock ? "Sold out" : channelLabel}
          </span>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-4 p-4 sm:p-5">
          <div className="min-w-0 space-y-2">
            <p className="line-clamp-2 break-words font-display text-[clamp(1.9rem,5vw,2.35rem)] leading-[0.96] tracking-[-0.03em]">
              {product.name}
            </p>
            {showPrice ? (
              <p className="font-mono text-[1.9rem] font-semibold tracking-[-0.03em]" style={{ color: "var(--vc-accent, #d4af37)" }}>
                {fmtMoney(displayPriceCents, product.currency)}
              </p>
            ) : null}
          </div>
          {product.description ? (
            <p className="line-clamp-3 text-sm leading-7" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
              {product.description}
            </p>
          ) : null}
          {galleryThumbs.length > 1 || remainingImageCount > 0 ? (
            <div className="flex items-center gap-2" aria-label={`${product.name} images`} onClick={(event) => event.stopPropagation()}>
              {galleryThumbs.map((image, index) => (
                <button
                  key={`${product.id}-image-${index}`}
                  type="button"
                  onClick={() => setActiveImageIndex(index)}
                  className="size-14 overflow-hidden rounded-[14px] border sm:size-16"
                  style={{
                    borderColor: index === visibleImageIndex ? "var(--vc-accent, #d4af37)" : SURFACE_BORDER,
                    boxShadow: index === visibleImageIndex ? "0 0 0 1px color-mix(in srgb, var(--vc-accent, #d4af37) 45%, transparent)" : "none",
                    opacity: index === visibleImageIndex ? 1 : 0.72,
                  }}
                  aria-label={`Show image ${index + 1}`}
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={image} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />
                </button>
              ))}
              {remainingImageCount > 0 ? (
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    openDetails();
                  }}
                  className="flex size-14 items-center justify-center rounded-[14px] border text-xs font-semibold uppercase tracking-[0.18em] sm:size-16"
                  style={{
                    borderColor: SURFACE_BORDER,
                    color: "var(--vc-fg-mute, #a8a39a)",
                    background: "color-mix(in srgb, var(--vc-bg, #050505) 92%, transparent)",
                  }}
                  aria-label={`View ${remainingImageCount} more images`}
                >
                  +{remainingImageCount}
                </button>
              ) : null}
            </div>
          ) : null}
          {variants.length > 0 ? (
            <select
              value={selectedVariant?.id ?? ""}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => setSelectedVariantId(event.target.value)}
              className="w-full rounded-[16px] border px-4 py-3 text-sm outline-none"
              style={{
                background: "color-mix(in srgb, var(--vc-bg, #050505) 92%, transparent)",
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
          <div className="mt-auto pt-1">
            <button
              type="button"
              onClick={(event) => {
                event.stopPropagation();
                buy();
              }}
              disabled={pending || outOfStock}
              className="flex w-full items-center justify-between rounded-[18px] px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em] transition enabled:group-hover:brightness-110"
              style={{
                background: GOLD_GRADIENT,
                color: "var(--vc-bg, #050505)",
                boxShadow:
                  "0 16px 34px -22px color-mix(in srgb, var(--vc-accent, #d4af37) 92%, transparent), inset 0 1px 0 rgba(255,255,255,0.24)",
                opacity: pending ? 0.7 : 1,
              }}
              data-testid={`buy-${product.id}`}
            >
              <span>{pending ? "Opening…" : outOfStock ? "Sold out" : buttonLabel}</span>
              <ArrowRight className="size-4" strokeWidth={2.25} />
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
        themeStyle={modalThemeStyle}
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
  themeStyle,
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
  themeStyle: ThemeStyle;
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
      style={{
        ...themeStyle,
        background: "color-mix(in srgb, var(--vc-bg, #0a0a0a) 82%, transparent)",
      }}
    >
      <div
        className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-3xl flex-col overflow-hidden border shadow-2xl sm:max-h-[min(44rem,calc(100dvh-3rem))] sm:grid sm:grid-cols-[minmax(0,1fr)_minmax(18rem,0.9fr)]"
        style={{
          background:
            "radial-gradient(circle at top right, color-mix(in srgb, var(--vc-accent, #d4af37) 14%, transparent), transparent 34%), linear-gradient(180deg, color-mix(in srgb, var(--vc-bg-2, #141414) 97%, rgba(255,255,255,0.02)), color-mix(in srgb, var(--vc-bg, #050505) 96%, transparent))",
          borderColor: SURFACE_BORDER,
          borderRadius: "calc(var(--vc-radius, 14px) + 12px)",
          color: "var(--vc-fg, #f7f3ea)",
          boxShadow: "0 1px 0 rgba(255,255,255,0.05) inset, 0 36px 70px -50px rgba(0,0,0,0.92)",
        }}
      >
        <div className="min-h-0 overflow-y-auto sm:contents">
          <div className="space-y-2 p-3 sm:min-h-0 sm:overflow-y-auto sm:p-4">
            <div
              className="relative aspect-square overflow-hidden rounded-[14px] border"
              style={{
                borderColor: SURFACE_BORDER,
                borderRadius: "20px",
                background: "var(--vc-bg, #050505)",
              }}
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
                className="absolute left-3 top-3 rounded-full border px-3 py-1.5 text-[11px] font-medium uppercase tracking-[0.18em]"
                style={{
                  background: outOfStock
                    ? "rgba(127, 29, 29, 0.9)"
                    : "color-mix(in srgb, var(--vc-bg, #050505) 82%, transparent)",
                  color: outOfStock ? "#fee2e2" : "var(--vc-accent, #d4af37)",
                  borderColor: outOfStock ? "rgba(254, 202, 202, 0.28)" : SURFACE_BORDER,
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
                    className="aspect-square overflow-hidden rounded-[14px] border"
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
                <h3 className="font-display text-[2rem] leading-[0.94] tracking-[-0.03em]">{product.name}</h3>
                {showPrice ? (
                  <p className="font-mono text-[1.6rem] font-semibold tracking-[-0.03em]" style={{ color: "var(--vc-accent, #d4af37)" }}>
                    {fmtMoney(displayPriceCents, product.currency)}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="flex size-10 shrink-0 items-center justify-center rounded-full border text-lg leading-none"
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
                  className="w-full rounded-[16px] border px-4 py-3 text-sm outline-none"
                  style={{
                    background: "color-mix(in srgb, var(--vc-bg, #050505) 92%, transparent)",
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
              className="mt-auto flex items-center justify-between rounded-[18px] px-5 py-4 text-sm font-semibold uppercase tracking-[0.24em]"
              style={{
                background: GOLD_GRADIENT,
                color: "var(--vc-bg, #050505)",
                boxShadow:
                  "0 16px 34px -22px color-mix(in srgb, var(--vc-accent, #d4af37) 92%, transparent), inset 0 1px 0 rgba(255,255,255,0.24)",
                opacity: pending || outOfStock ? 0.72 : 1,
              }}
            >
              <span>{pending ? "Opening…" : outOfStock ? "Sold out" : buttonLabel}</span>
              <ArrowRight className="size-4" strokeWidth={2.25} />
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
