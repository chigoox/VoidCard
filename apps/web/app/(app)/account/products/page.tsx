import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { listSellerProducts } from "@/lib/seller-products";
import { getSellerAccount } from "@/lib/stripe-connect";
import { DeleteProductButton } from "./client";

export const dynamic = "force-dynamic";

function formatMoney(cents: number, currency: string) {
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

export default async function ProductsIndex() {
  const u = await requireUser();
  const [products, account] = await Promise.all([
    listSellerProducts(u.id),
    getSellerAccount(u.id),
  ]);

  return (
    <div className="space-y-5" data-testid="products-page">
      <header className="flex items-end justify-between">
        <div>
          <p className="text-[11px] uppercase tracking-[0.3em] text-ivory-mute">Catalog</p>
          <h1 className="font-display text-2xl text-gold-grad">Your products</h1>
          <p className="text-sm text-ivory-dim">
            Items you can sell from any Store section on your profile.
          </p>
        </div>
        <Link href="/account/products/new" className="btn-gold" data-testid="new-product">
          + New product
        </Link>
      </header>

      {!account ? (
        <div className="card border-amber-400/40 bg-amber-500/5 p-4 text-sm text-amber-100">
          You haven&apos;t connected Stripe yet.{" "}
          <Link href="/account/payments" className="underline-offset-2 hover:underline">
            Connect with Stripe
          </Link>{" "}
          to start accepting payments.
        </div>
      ) : null}

      {products.length === 0 ? (
        <div className="card p-8 text-center text-sm text-ivory-dim">
          <p className="font-display text-base text-ivory">No products yet</p>
          <p className="mt-2">Create your first product to sell on your profile.</p>
          <div className="mt-4">
            <Link href="/account/products/new" className="btn-gold">
              Create product
            </Link>
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 md:grid-cols-2" data-testid="products-list">
          {products.map((p) => {
            const imageUrl = p.image_urls[0] ?? p.image_url;
            return (
            <li
              key={p.id}
              className="card flex items-start gap-3 p-4"
              data-testid={`product-row-${p.id}`}
            >
              {imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imageUrl}
                  alt=""
                  className="size-16 shrink-0 rounded-card object-cover"
                />
              ) : (
                <div
                  aria-hidden
                  className="size-16 shrink-0 rounded-card border border-onyx-700 bg-onyx-950"
                />
              )}
              <div className="min-w-0 flex-1 space-y-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="truncate font-display text-base">{p.name}</p>
                  <span className="font-mono text-sm text-gold">
                    {formatMoney(p.price_cents, p.currency)}
                  </span>
                </div>
                <p className="line-clamp-2 text-xs text-ivory-mute">
                  {p.description ?? "—"}
                </p>
                <div className="flex flex-wrap gap-2 pt-1 text-[11px] uppercase tracking-[0.24em] text-ivory-mute">
                  <span>
                    {p.active ? (
                      <span className="text-emerald-300">Active</span>
                    ) : (
                      <span className="text-ivory-dim">Inactive</span>
                    )}
                  </span>
                  <span>·</span>
                  <span>{p.shippable ? "Ships" : p.digital ? "Digital" : "Service"}</span>
                  {p.inventory !== null ? (
                    <>
                      <span>·</span>
                      <span>{p.inventory} in stock</span>
                    </>
                  ) : null}
                  {p.image_urls.length > 1 ? (
                    <>
                      <span>·</span>
                      <span>{p.image_urls.length} images</span>
                    </>
                  ) : null}
                  {p.variants.length > 0 ? (
                    <>
                      <span>·</span>
                      <span>{p.variants.length} variants</span>
                    </>
                  ) : null}
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <Link
                    href={`/account/products/${p.id}`}
                    className="btn-ghost px-2 py-1 text-xs"
                  >
                    Edit
                  </Link>
                  <DeleteProductButton id={p.id} name={p.name} />
                </div>
              </div>
            </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
