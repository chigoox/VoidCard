"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";

const ProductSchema = z.object({
  sku: z.string().regex(/^[a-z0-9-]{2,40}$/, "SKU must be lowercase letters, numbers, and dashes"),
  name: z.string().min(1).max(120),
  blurb: z.string().max(400).nullable().optional(),
  finish: z.string().max(80).nullable().optional(),
  ships: z.string().max(80).nullable().optional(),
  badge: z.string().max(40).nullable().optional(),
  price_cents: z.coerce.number().int().min(0).max(1_000_000),
  currency: z.string().length(3),
  stripe_price_id: z.string().max(120).nullable().optional(),
  active: z.coerce.boolean(),
  position: z.coerce.number().int().min(0).max(10000),
  metadata_json: z.string().max(4000).optional(),
  image_urls_json: z.string().max(24000).optional(),
});

function parseMeta(raw: string | undefined) {
  if (!raw) return {};
  try {
    const parsed = JSON.parse(raw);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) return parsed as Record<string, unknown>;
  } catch {
    /* fall through */
  }
  throw new Error("metadata_json must be a JSON object");
}

function parseImageUrls(raw: string | undefined, fallback: string | null): string[] {
  const urls: string[] = [];
  if (raw?.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      throw new Error("image_urls_json must be a JSON array");
    }
    if (!Array.isArray(parsed)) throw new Error("image_urls_json must be a JSON array");
    for (const entry of parsed) {
      if (typeof entry !== "string") continue;
      const url = entry.trim();
      if (url) urls.push(url);
    }
  }
  if (urls.length === 0 && fallback) urls.push(fallback);

  const unique = Array.from(new Set(urls)).slice(0, 12);
  for (const url of unique) {
    if (url.length > 2000 || !/^https?:\/\//.test(url)) {
      throw new Error("Product images must be http(s) URLs");
    }
  }
  return unique;
}

export async function upsertProduct(formData: FormData) {
  await requireAdmin();
  const id = (formData.get("id") as string | null) || null;
  const parsed = ProductSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  }
  const metadata = parseMeta(parsed.data.metadata_json);

  // --- Image handling ---
  // Preserve image_url as the primary image while image_urls stores the full gallery.
  const sb = createAdminClient();
  let imageUrl: string | null = (formData.get("image_url") as string | null)?.trim() || null;
  let imageUrls = parseImageUrls(parsed.data.image_urls_json, imageUrl);
  const imageFile = formData.get("image_file");
  if (imageFile instanceof File && imageFile.size > 0) {
    const allowed = ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"];
    if (!allowed.includes(imageFile.type)) throw new Error("Unsupported image type. Use JPEG, PNG, WebP, AVIF, or GIF.");
    if (imageFile.size > 10 * 1024 * 1024) throw new Error("Image must be under 10 MB.");
    const ext = (imageFile.name.split(".").pop() ?? "jpg").toLowerCase();
    const storagePath = `products/${parsed.data.sku}/${Date.now()}.${ext}`;
    const bytes = Buffer.from(await imageFile.arrayBuffer());
    const { error: uploadError } = await sb.storage
      .from("vcard-public")
      .upload(storagePath, bytes, { contentType: imageFile.type, upsert: true });
    if (uploadError) throw new Error(`Image upload failed: ${uploadError.message}`);
    const { data: urlData } = sb.storage.from("vcard-public").getPublicUrl(storagePath);
    imageUrl = urlData.publicUrl;
    imageUrls = [imageUrl, ...imageUrls.filter((url) => url !== imageUrl)].slice(0, 12);
  }
  imageUrl = imageUrls[0] ?? null;

  const row = {
    sku: parsed.data.sku,
    name: parsed.data.name,
    blurb: parsed.data.blurb ?? null,
    finish: parsed.data.finish ?? null,
    ships: parsed.data.ships ?? null,
    badge: parsed.data.badge ?? null,
    price_cents: parsed.data.price_cents,
    currency: parsed.data.currency.toLowerCase(),
    stripe_price_id: parsed.data.stripe_price_id?.trim() || null,
    active: parsed.data.active,
    position: parsed.data.position,
    metadata,
    image_url: imageUrl,
    image_urls: imageUrls,
  };
  if (id) {
    const { error } = await sb.from("vcard_products").update(row).eq("id", id);
    if (error) throw new Error(error.message);
  } else {
    const { error } = await sb.from("vcard_products").insert(row);
    if (error) throw new Error(error.message);
  }
  revalidatePath("/admin/products");
  revalidatePath("/shop");
  redirect("/admin/products");
}

export async function deleteProduct(formData: FormData) {
  await requireAdmin();
  const id = formData.get("id") as string;
  if (!id) throw new Error("missing id");
  const sb = createAdminClient();
  const { error } = await sb.from("vcard_products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/admin/products");
  revalidatePath("/shop");
}

/**
 * Reconcile every active product with Stripe by SKU. For each product missing
 * a stripe_price_id, search Stripe Prices whose Product.metadata.sku matches
 * the row's SKU and persist the price id. Returns counts via redirect query.
 */
export async function syncStripePrices() {
  await requireAdmin();
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("vcard_products")
    .select("id, sku, stripe_price_id, active")
    .eq("active", true);
  if (error) throw new Error(error.message);

  let matched = 0;
  let updated = 0;
  let missing = 0;

  for (const p of data ?? []) {
    if (p.stripe_price_id) {
      matched++;
      continue;
    }
    // Look up Stripe Product by metadata.sku then list its prices.
    const products = await stripe.products.search({ query: `metadata['sku']:'${p.sku}' AND active:'true'`, limit: 1 });
    const product = products.data[0];
    if (!product) {
      missing++;
      continue;
    }
    const prices = await stripe.prices.list({ product: product.id, active: true, limit: 1 });
    const price = prices.data[0];
    if (!price) {
      missing++;
      continue;
    }
    const { error: upErr } = await sb
      .from("vcard_products")
      .update({ stripe_price_id: price.id })
      .eq("id", p.id);
    if (!upErr) updated++;
  }

  revalidatePath("/admin/products");
  redirect(`/admin/products?synced=1&matched=${matched}&updated=${updated}&missing=${missing}`);
}
