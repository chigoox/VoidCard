"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { createProductAction, updateProductAction } from "./actions";

const INPUT_CLASS_NAME =
  "w-full rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2.5 text-sm text-ivory outline-none transition focus:border-gold/60";
const TEXTAREA_CLASS_NAME = `${INPUT_CLASS_NAME} min-h-[112px] resize-y`;

export type ProductFormValues = {
  id?: string;
  name: string;
  description: string;
  image_url: string;
  price_cents: number;
  currency: string;
  inventory: number | null;
  shippable: boolean;
  digital: boolean;
  active: boolean;
};

const EMPTY: ProductFormValues = {
  name: "",
  description: "",
  image_url: "",
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
  const [imageUrl, setImageUrl] = useState(initial.image_url);
  const [priceCents, setPriceCents] = useState(initial.price_cents);
  const [currency, setCurrency] = useState(initial.currency);
  const [inventory, setInventory] = useState<string>(
    initial.inventory === null ? "" : String(initial.inventory),
  );
  const [shippable, setShippable] = useState(initial.shippable);
  const [digital, setDigital] = useState(initial.digital);
  const [active, setActive] = useState(initial.active);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const router = useRouter();

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

      <label className="block space-y-1">
        <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">
          Image URL (optional)
        </span>
        <input
          name="image_url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          className={INPUT_CLASS_NAME}
          placeholder="https://…"
        />
      </label>

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
