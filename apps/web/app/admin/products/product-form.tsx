import Link from "next/link";
import { upsertProduct } from "./actions";
import { type DbProduct } from "@/lib/cms";

type Props = {
  product?: DbProduct;
  title: string;
};

export function ProductForm({ product, title }: Props) {
  const p = product;
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl text-gold-grad">{title}</h1>
        <Link href="/admin/products" className="text-sm text-ivory-mute hover:text-ivory">← Back</Link>
      </div>

      <form action={upsertProduct} className="card grid gap-5 p-6">
        {p?.id && <input type="hidden" name="id" value={p.id} />}

        <div className="grid gap-4 md:grid-cols-2">
          <Field label="SKU" hint="lowercase, dashes, e.g. card-pvc">
            <input name="sku" required defaultValue={p?.sku} className="input" pattern="[a-z0-9-]{2,40}" />
          </Field>
          <Field label="Name">
            <input name="name" required defaultValue={p?.name} className="input" />
          </Field>
        </div>

        <Field label="Blurb" hint="Shown on the shop card.">
          <textarea name="blurb" rows={2} defaultValue={p?.blurb ?? ""} className="input" />
        </Field>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Finish"><input name="finish" defaultValue={p?.finish ?? ""} className="input" /></Field>
          <Field label="Ships"><input name="ships" defaultValue={p?.ships ?? ""} className="input" /></Field>
          <Field label="Badge"><input name="badge" defaultValue={p?.badge ?? ""} className="input" placeholder="e.g. Includes Verified" /></Field>
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <Field label="Price (cents)">
            <input name="price_cents" type="number" min={0} required defaultValue={p?.price_cents ?? 0} className="input" />
          </Field>
          <Field label="Currency"><input name="currency" required defaultValue={p?.currency ?? "usd"} className="input" /></Field>
          <Field label="Position"><input name="position" type="number" defaultValue={p?.position ?? 100} className="input" /></Field>
        </div>

        {/* Stripe Price ID is no longer required: checkout uses inline price_data from this row. */}
        <input type="hidden" name="stripe_price_id" value={p?.stripe_price_id ?? ""} />

        <Field label="Metadata (JSON)" hint='e.g. {"verified_included":true,"shippable":false}'>
          <textarea
            name="metadata_json"
            rows={4}
            defaultValue={JSON.stringify(p?.metadata ?? {}, null, 2)}
            className="input font-mono text-xs"
          />
        </Field>

        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="active" defaultChecked={p?.active ?? true} className="h-4 w-4" />
          <span>Active (visible in shop)</span>
        </label>

        <div className="flex gap-3">
          <button type="submit" className="btn-gold">Save</button>
          <Link href="/admin/products" className="btn-ghost">Cancel</Link>
        </div>
      </form>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-ivory-mute">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <span className="mt-1 block text-xs text-ivory-mute">{hint}</span>}
    </label>
  );
}
