import Image from "next/image";
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

      <form action={upsertProduct} className="card grid gap-5 p-6" encType="multipart/form-data">
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

        {/* Product image */}
        <div className="space-y-3 rounded-card border border-onyx-700/60 p-4">
          <span className="block text-xs uppercase tracking-widest text-ivory-mute">Product image</span>
          {p?.image_url && (
            <div className="relative h-48 w-full overflow-hidden rounded-card bg-onyx-900">
              <Image
                src={p.image_url}
                alt={p.name}
                fill
                className="object-contain"
                unoptimized={p.image_url.startsWith("blob:")}
              />
            </div>
          )}
          <label className="block">
            <span className="text-xs text-ivory-mute">Upload new image (JPEG, PNG, WebP, AVIF, GIF · max 10 MB)</span>
            <input
              name="image_file"
              type="file"
              accept="image/jpeg,image/png,image/webp,image/avif,image/gif"
              className="mt-1.5 block w-full text-sm text-ivory-mute file:mr-3 file:rounded-pill file:border-0 file:bg-onyx-700 file:px-3 file:py-1.5 file:text-xs file:text-ivory hover:file:bg-onyx-600"
            />
          </label>
          <Field label="Or paste image URL" hint="Leave blank to keep the uploaded file or existing image.">
            <input
              name="image_url"
              type="url"
              defaultValue={p?.image_url ?? ""}
              className="input"
              placeholder="https://..."
            />
          </Field>
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

