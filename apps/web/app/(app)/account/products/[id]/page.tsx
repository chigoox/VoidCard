import Link from "next/link";
import { notFound } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { getSellerProduct } from "@/lib/seller-products";
import { ProductForm } from "../ProductForm";

export const dynamic = "force-dynamic";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const u = await requireUser();
  const { id } = await params;
  const product = await getSellerProduct(id);
  if (!product || product.owner_user_id !== u.id) notFound();

  return (
    <div className="space-y-5">
      <header>
        <Link
          href="/account/products"
          className="text-xs uppercase tracking-[0.24em] text-ivory-mute hover:text-ivory"
        >
          ← Products
        </Link>
        <h1 className="font-display text-2xl text-gold-grad">Edit product</h1>
        <p className="text-sm text-ivory-dim">{product.name}</p>
      </header>
      <ProductForm
        mode="edit"
        product={{
          id: product.id,
          name: product.name,
          description: product.description ?? "",
          image_url: product.image_url ?? "",
          price_cents: product.price_cents,
          currency: product.currency,
          inventory: product.inventory,
          shippable: product.shippable,
          digital: product.digital,
          active: product.active,
        }}
      />
    </div>
  );
}
