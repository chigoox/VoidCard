"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ProductImagesField } from "@/components/media/ProductImagesField";
import { createProductAction, updateProductAction } from "./actions";

const INPUT_CLASS_NAME =
  "w-full rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2.5 text-sm text-ivory outline-none transition focus:border-gold/60";
const TEXTAREA_CLASS_NAME = `${INPUT_CLASS_NAME} min-h-[112px] resize-y`;

export type ProductFormValues = {
  id?: string;
  name: string;
  description: string;
  image_url: string;
  image_urls: string[];
  variants: ProductVariantFormValue[];
  price_cents: number;
  currency: string;
  inventory: number | null;
  shippable: boolean;
  digital: boolean;
  active: boolean;
};

export type ProductVariantFormValue = {
  id: string;
  name: string;
  price_delta_cents: number;
  inventory: number | null;
  active: boolean;
};

const EMPTY: ProductFormValues = {
  name: "",
  description: "",
  image_url: "",
  image_urls: [],
  variants: [],
  price_cents: 1000,
  currency: "usd",
  inventory: null,
  shippable: false,
  digital: true,
  active: true,
};

export function ProductForm({
  mode,
  product,
}: {
  mode: "create" | "edit";
  product?: ProductFormValues;
}) {
  const initial = product ?? EMPTY;
  const [name, setName] = useState(initial.name);
  const [description, setDescription] = useState(initial.description);
  const [priceCents, setPriceCents] = useState(initial.price_cents);
  const [currency, setCurrency] = useState(initial.currency);
  const [variants, setVariants] = useState<ProductVariantFormValue[]>(initial.variants);
  const [inventory, setInventory] = useState<string>(
    initial.inventory === null ? "" : String(initial.inventory),
  );
  const [shippable, setShippable] = useState(initial.shippable);
  const [digital, setDigital] = useState(initial.digital);
  const [active, setActive] = useState(initial.active);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

  function addVariant() {
    setVariants((current) => [
      ...current,
      {
        id: typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `variant-${Date.now()}`,
        name: "New option",
        price_delta_cents: 0,
        inventory: null,
        active: true,
      },
    ].slice(0, 50));
  }

  function updateVariant(index: number, next: Partial<ProductVariantFormValue>) {
    setVariants((current) => current.map((variant, currentIndex) => currentIndex === index ? { ...variant, ...next } : variant));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    const form = new FormData(event.currentTarget);
    start(async () => {
      const action =
        mode === "create"
          ? await createProductAction(form)
          : await updateProductAction(initial.id!, form);
      if (!action.ok) {
        setError(action.error ?? "Could not save.");
        return;
      }
      router.push("/account/products");
      router.refresh();
    });
  }

  return (
    <form onSubmit={onSubmit} className="card space-y-4 p-5" data-testid="product-form">
      <div className="grid gap-3 md:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Name</span>
          <input
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={INPUT_CLASS_NAME}
            required
            data-testid="product-name"
          />
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">
            Price (USD cents)
          </span>
          <input
            name="price_cents"
            type="number"
            min={0}
            step={1}
            value={priceCents}
            onChange={(e) => setPriceCents(Number(e.target.value || 0))}
            className={INPUT_CLASS_NAME}
            required
            data-testid="product-price"
          />
          <span className="text-[11px] text-ivory-mute">
            ${(priceCents / 100).toFixed(2)} {currency.toUpperCase()}
          </span>
        </label>
      </div>

      <label className="block space-y-1">
        <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">
          Description (optional)
        </span>
        <textarea
          name="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={TEXTAREA_CLASS_NAME}
          maxLength={2000}
        />
      </label>

      <ProductImagesField initialImages={initial.image_urls.length > 0 ? initial.image_urls : initial.image_url ? [initial.image_url] : []} />

      <div className="space-y-3 rounded-card border border-onyx-800 bg-onyx-950/40 p-3">
        <input type="hidden" name="variants_json" value={JSON.stringify(variants)} />
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Variants</span>
          <button type="button" className="btn-ghost px-3 py-1.5 text-xs" onClick={addVariant} disabled={variants.length >= 50}>
            Add variant
          </button>
        </div>
        {variants.length === 0 ? (
          <p className="text-xs text-ivory-mute">Add options like size, color, or finish. Variant stock can stay blank for unlimited.</p>
        ) : (
          <div className="space-y-2">
            {variants.map((variant, index) => (
              <div key={variant.id} className="grid gap-2 rounded-card border border-onyx-800 bg-onyx-950/60 p-3 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Name</span>
                  <input
                    value={variant.name}
                    onChange={(event) => updateVariant(index, { name: event.target.value })}
                    className={INPUT_CLASS_NAME}
                    placeholder="Black / XL / Metal"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Price delta</span>
                  <input
                    type="number"
                    step={1}
                    value={variant.price_delta_cents}
                    onChange={(event) => updateVariant(index, { price_delta_cents: Number(event.target.value || 0) })}
                    className={INPUT_CLASS_NAME}
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Stock</span>
                  <input
                    type="number"
                    min={0}
                    value={variant.inventory === null ? "" : String(variant.inventory)}
                    onChange={(event) => updateVariant(index, { inventory: event.target.value === "" ? null : Number(event.target.value) })}
                    className={INPUT_CLASS_NAME}
                    placeholder="Unlimited"
                  />
                </label>
                <div className="flex items-end gap-2">
                  <label className="mb-2 flex items-center gap-2 text-sm text-ivory">
                    <input
                      type="checkbox"
                      checked={variant.active}
                      onChange={(event) => updateVariant(index, { active: event.target.checked })}
                      className="size-4 rounded border-onyx-700 bg-onyx-950"
                    />
                    Active
                  </label>
                  <button type="button" className="btn-ghost mb-1 px-2 py-1 text-xs" onClick={() => setVariants((current) => current.filter((_, currentIndex) => currentIndex !== index))}>
                    Remove
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Currency</span>
          <select
            name="currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            className={INPUT_CLASS_NAME}
          >
            {["usd", "eur", "gbp", "cad", "aud"].map((c) => (
              <option key={c} value={c}>
                {c.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1">
          <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">
            Inventory (blank = unlimited)
          </span>
          <input
            name="inventory"
            type="number"
            min={0}
            value={inventory}
            onChange={(e) => setInventory(e.target.value)}
            className={INPUT_CLASS_NAME}
          />
        </label>
        <div className="space-y-1">
          <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">Type</span>
          <div className="flex flex-wrap gap-3 pt-1 text-sm text-ivory">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="digital"
                checked={digital}
                onChange={(e) => setDigital(e.target.checked)}
                className="size-4 rounded border-onyx-700 bg-onyx-950"
              />
              Digital
            </label>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                name="shippable"
                checked={shippable}
                onChange={(e) => setShippable(e.target.checked)}
                className="size-4 rounded border-onyx-700 bg-onyx-950"
              />
              Shippable
            </label>
          </div>
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm text-ivory">
        <input
          type="checkbox"
          name="active"
          checked={active}
          onChange={(e) => setActive(e.target.checked)}
          className="size-4 rounded border-onyx-700 bg-onyx-950"
        />
        Active (available for purchase)
      </label>

      {error ? (
        <p className="text-xs text-red-300" role="alert">
          {error}
        </p>
      ) : null}

      <div className="flex items-center gap-2">
        <button
          type="submit"
          className="btn-gold"
          disabled={pending}
          data-testid="product-save"
        >
          {pending ? "Saving…" : mode === "create" ? "Create product" : "Save changes"}
        </button>
      </div>
    </form>
  );
}
