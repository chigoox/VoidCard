import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { ProductForm } from "../product-form";
import type { DbProduct } from "@/lib/cms";

export const dynamic = "force-dynamic";

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const sb = createAdminClient();
  const { data } = await sb.from("vcard_products").select("*").eq("id", id).maybeSingle();
  if (!data) notFound();
  return <ProductForm product={data as DbProduct} title={`Edit · ${(data as DbProduct).name}`} />;
}
