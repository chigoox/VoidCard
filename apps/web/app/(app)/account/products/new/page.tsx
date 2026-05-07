import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { ProductForm } from "../ProductForm";
import { getSellerAccount } from "@/lib/stripe-connect";

export const dynamic = "force-dynamic";

export default async function NewProductPage() {
  const u = await requireUser();
  const account = await getSellerAccount(u.id);
  return (
    <div className="space-y-5">
      <header>
        <Link href="/account/products" className="text-xs uppercase tracking-[0.24em] text-ivory-mute hover:text-ivory">
          ← Products
        </Link>
        <h1 className="font-display text-2xl text-gold-grad">New product</h1>
        <p className="text-sm text-ivory-dim">
          Set a name, price, and image. You can add this product to a Store section after saving.
        </p>
      </header>
      {!account ? (
        <div className="card border-amber-400/40 bg-amber-500/5 p-4 text-sm text-amber-100">
          Connect Stripe first on the{" "}
          <Link href="/account/payments" className="underline-offset-2 hover:underline">
            Payments page
          </Link>
          .
        </div>
      ) : (
        <ProductForm mode="create" />
      )}
    </div>
  );
}
