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
  price_cents: z.coerce.number().int().min(0).max(10_000_000),
  currency: z
    .string()
    .trim()
    .min(3)
    .max(3)
    .transform((v) => v.toLowerCase()),
  inventory: z
    .union([z.coerce.number().int().min(0), z.literal("")])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : (v as number))),
  shippable: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  digital: z.preprocess((v) => v === "on" || v === true, z.boolean()),
  active: z.preprocess((v) => v === "on" || v === true, z.boolean()),
});

function parseForm(form: FormData) {
  const obj: Record<string, unknown> = {};
  for (const [k, v] of form.entries()) obj[k] = v;
  return FormShape.parse(obj);
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
