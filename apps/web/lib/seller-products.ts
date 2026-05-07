import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type SellerProduct = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  price_cents: number;
  currency: string;
  inventory: number | null;
  shippable: boolean;
  digital: boolean;
  active: boolean;
  position: number;
  created_at: string;
  updated_at: string;
};

export const SellerProductInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  price_cents: z.number().int().min(0).max(10_000_000),
  currency: z.string().trim().length(3).default("usd"),
  inventory: z.number().int().min(0).nullable().optional(),
  shippable: z.boolean().default(false),
  digital: z.boolean().default(true),
  active: z.boolean().default(true),
});
export type SellerProductInput = z.infer<typeof SellerProductInput>;

export async function listSellerProducts(ownerUserId: string): Promise<SellerProduct[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_seller_products")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  return (data as SellerProduct[] | null) ?? [];
}

export async function getSellerProduct(id: string): Promise<SellerProduct | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_seller_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return (data as SellerProduct | null) ?? null;
}

export async function getSellerProductsByIds(ids: string[]): Promise<SellerProduct[]> {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_seller_products")
    .select("*")
    .in("id", ids)
    .eq("active", true);
  return (data as SellerProduct[] | null) ?? [];
}

export async function insertSellerProduct(
  ownerUserId: string,
  input: SellerProductInput,
): Promise<SellerProduct> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vcard_seller_products")
    .insert({ owner_user_id: ownerUserId, ...input })
    .select("*")
    .single();
  if (error || !data) throw new Error(error?.message ?? "insert_failed");
  return data as SellerProduct;
}

export async function updateSellerProduct(
  ownerUserId: string,
  id: string,
  input: Partial<SellerProductInput>,
): Promise<SellerProduct | null> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vcard_seller_products")
    .update({ ...input, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_user_id", ownerUserId)
    .select("*")
    .single();
  if (error) return null;
  return (data as SellerProduct | null) ?? null;
}

export async function deleteSellerProduct(ownerUserId: string, id: string): Promise<boolean> {
  const admin = createAdminClient();
  const { error } = await admin
    .from("vcard_seller_products")
    .delete()
    .eq("id", id)
    .eq("owner_user_id", ownerUserId);
  return !error;
}
