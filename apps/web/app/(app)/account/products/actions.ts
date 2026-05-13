"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import {
  SellerProductInput,
  deleteSellerProduct,
  getSellerProduct,
  insertSellerProduct,
  updateSellerProduct,
} from "@/lib/seller-products";
import { getSellerAccount } from "@/lib/stripe-connect";

const FormShape = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(2000).optional().transform((v) => v || null),
  image_url: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((v) => (v ? v : null))
    .refine((v) => v === null || /^https?:\/\//.test(v), "Image URL must start with http(s)://"),
  image_urls_json: z.string().max(24000).optional(),
  price_cents: z.coerce.number().int().min(0).max(10_000_000),
  currency: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .transform((v) => v.toLowerCase()),
  inventory: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce.number().int().min(0).nullable(),
  ),
  variants_json: z.string().max(50000).optional(),
  shippable: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  digital: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  active: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

const VariantShape = z.object({
  id: z.string().trim().min(1).max(80),
  name: z.string().trim().max(80),
  price_delta_cents: z.coerce.number().int().min(-10_000_000).max(10_000_000),
  inventory: z.preprocess(
    (v) => (v === "" || v === undefined ? null : v),
    z.coerce.number().int().min(0).nullable(),
  ),
  active: z.preprocess((v) => v !== false, z.boolean()),
});

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

function parseVariants(raw: string | undefined) {
  if (!raw?.trim()) return [];
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("variants_json must be a JSON array");
  }
  if (!Array.isArray(parsed)) throw new Error("variants_json must be a JSON array");
  return parsed
    .map((entry) => VariantShape.parse(entry))
    .filter((variant) => variant.name.length > 0)
    .slice(0, 50);
}

function parseForm(form: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) obj[k] = v;
  const parsed = FormShape.parse(obj);
  const imageUrls = parseImageUrls(parsed.image_urls_json, parsed.image_url);
  const variants = parseVariants(parsed.variants_json);
  return { ...parsed, image_urls: imageUrls, image_url: imageUrls[0] ?? null, variants };
}

export async function createProductAction(form: FormData) {
  const u = await requireUser();
  const account = await getSellerAccount(u.id);
  if (!account) {
    return { ok: false as const, error: "stripe_not_connected" };
  }
  const parsed = parseForm(form);
  const input: SellerProductInput = {
    name: parsed.name,
    description: parsed.description ?? null,
    image_url: parsed.image_url ?? null,
    image_urls: parsed.image_urls,
    variants: parsed.variants,
    price_cents: parsed.price_cents,
    currency: parsed.currency,
    inventory: parsed.inventory,
    shippable: parsed.shippable,
    digital: parsed.digital,
    active: parsed.active,
  };
  const product = await insertSellerProduct(u.id, input);
  revalidatePath("/account/products");
  revalidatePath("/account/payments");
  return { ok: true as const, id: product.id };
}

export async function updateProductAction(id: string, form: FormData) {
  const u = await requireUser();
  const existing = await getSellerProduct(id);
  if (!existing || existing.owner_user_id !== u.id) {
    return { ok: false as const, error: "not_found" };
  }
  const parsed = parseForm(form);
  const updated = await updateSellerProduct(u.id, id, {
    name: parsed.name,
    description: parsed.description ?? null,
    image_url: parsed.image_url ?? null,
    image_urls: parsed.image_urls,
    variants: parsed.variants,
    price_cents: parsed.price_cents,
    currency: parsed.currency,
    inventory: parsed.inventory,
    shippable: parsed.shippable,
    digital: parsed.digital,
    active: parsed.active,
  });
  if (!updated) return { ok: false as const, error: "update_failed" };
  revalidatePath("/account/products");
  revalidatePath(`/account/products/${id}`);
  return { ok: true as const };
}

export async function deleteProductAction(id: string) {
  const u = await requireUser();
  const ok = await deleteSellerProduct(u.id, id);
  revalidatePath("/account/products");
  return { ok };
}
