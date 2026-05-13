import "server-only";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";

export type SellerProduct = {
  id: string;
  owner_user_id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  image_urls: string[];
  variants: SellerProductVariant[];
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

export type SellerProductVariant = {
  id: string;
  name: string;
  price_delta_cents: number;
  inventory: number | null;
  active: boolean;
};

const SellerProductVariantInput = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(80),
  price_delta_cents: z.number().int().min(-10_000_000).max(10_000_000).default(0),
  inventory: z.number().int().min(0).nullable().default(null),
  active: z.boolean().default(true),
});

export const SellerProductInput = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(2000).nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  image_urls: z.array(z.string().url()).max(12).default([]),
  variants: z.array(SellerProductVariantInput).max(50).default([]),
  price_cents: z.number().int().min(0).max(10_000_000),
  currency: z.string().trim().length(3).default("usd"),
  inventory: z.number().int().min(0).nullable().optional(),
  shippable: z.boolean().default(false),
  digital: z.boolean().default(true),
  active: z.boolean().default(true),
});
export type SellerProductInput = z.infer<typeof SellerProductInput>;

type SellerProductRow = Omit<SellerProduct, "image_urls" | "variants"> & { image_urls?: unknown; variants?: unknown };

function normalizeImageUrls(value: unknown, imageUrl: string | null): string[] {
  const urls = Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
  if (urls.length > 0) return urls;
  return imageUrl ? [imageUrl] : [];
}

function normalizeProduct(row: SellerProductRow): SellerProduct {
  return {
    ...row,
    image_urls: normalizeImageUrls(row.image_urls, row.image_url),
    variants: SellerProductVariantInput.array().max(50).catch([]).parse(row.variants),
  };
}

export async function listSellerProducts(ownerUserId: string): Promise<SellerProduct[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_seller_products")
    .select("*")
    .eq("owner_user_id", ownerUserId)
    .order("position", { ascending: true })
    .order("created_at", { ascending: false });
  return ((data as SellerProductRow[] | null) ?? []).map(normalizeProduct);
}

export async function getSellerProduct(id: string): Promise<SellerProduct | null> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_seller_products")
    .select("*")
    .eq("id", id)
    .maybeSingle();
  return data ? normalizeProduct(data as SellerProductRow) : null;
}

export async function getSellerProductsByIds(ids: string[]): Promise<SellerProduct[]> {
  if (ids.length === 0) return [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_seller_products")
    .select("*")
    .in("id", ids)
    .eq("active", true);
  return ((data as SellerProductRow[] | null) ?? []).map(normalizeProduct);
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
  return normalizeProduct(data as SellerProductRow);
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
  return data ? normalizeProduct(data as SellerProductRow) : null;
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
