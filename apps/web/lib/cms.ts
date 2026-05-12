import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type DbProduct = {
  id: string;
  sku: string;
  name: string;
  description: string | null;
  blurb: string | null;
  finish: string | null;
  ships: string | null;
  badge: string | null;
  image_url: string | null;
  price_cents: number;
  currency: string;
  stripe_price_id: string | null;
  active: boolean;
  position: number;
  metadata: Record<string, unknown> & {
    verified_included?: boolean;
    requires_verified?: boolean;
    digital?: boolean;
  };
};

export type DbPlan = {
  id: string;
  name: string;
  blurb: string | null;
  monthly_cents: number;
  yearly_cents: number;
  stripe_price_monthly: string | null;
  stripe_price_yearly: string | null;
  features: string[];
  active: boolean;
  position: number;
};

export const CUSTOM_DESIGN_ADDON_SETTING_KEY = "shop.custom_design_addon_cents";
export const DEFAULT_CUSTOM_DESIGN_ADDON_CENTS = 1000;
export const CUSTOM_DESIGN_ADDON_SKU = "custom-design-addon";

const CUSTOM_DESIGN_ADDON_CARD_SKUS = new Set(["card-pvc", "card-metal", "card-replacement"]);

export function isCustomDesignAddonCardSku(sku: string): boolean {
  return CUSTOM_DESIGN_ADDON_CARD_SKUS.has(sku);
}

/**
 * List active shop products from the CMS (vcard_products), ordered by position.
 * Falls back to an empty array if the table is missing or query fails.
 */
export async function listProducts(opts: { includeInactive?: boolean } = {}): Promise<DbProduct[]> {
  try {
    const sb = createAdminClient();
    const q = sb.from("vcard_products").select("*").order("position", { ascending: true });
    const { data } = opts.includeInactive ? await q : await q.eq("active", true);
    return (data as DbProduct[] | null) ?? [];
  } catch {
    return [];
  }
}

export async function getProductBySku(sku: string): Promise<DbProduct | null> {
  try {
    const sb = createAdminClient();
    const { data } = await sb.from("vcard_products").select("*").eq("sku", sku).maybeSingle();
    return (data as DbProduct | null) ?? null;
  } catch {
    return null;
  }
}

export async function listPlans(): Promise<DbPlan[]> {
  try {
    const sb = createAdminClient();
    const { data } = await sb
      .from("vcard_plans")
      .select("*")
      .eq("active", true)
      .order("position", { ascending: true });
    return (data as DbPlan[] | null) ?? [];
  } catch {
    return [];
  }
}

export async function getPlan(id: string): Promise<DbPlan | null> {
  try {
    const sb = createAdminClient();
    const { data } = await sb.from("vcard_plans").select("*").eq("id", id).maybeSingle();
    return (data as DbPlan | null) ?? null;
  } catch {
    return null;
  }
}

export async function getSetting<T = unknown>(key: string): Promise<T | null> {
  try {
    const sb = createAdminClient();
    const { data } = await sb.from("vcard_settings").select("value").eq("key", key).maybeSingle();
    return ((data?.value as T | undefined) ?? null) as T | null;
  } catch {
    return null;
  }
}

export async function getCustomDesignAddonCents(): Promise<number> {
  const value = await getSetting<number>(CUSTOM_DESIGN_ADDON_SETTING_KEY);
  return typeof value === "number" && Number.isInteger(value) && value >= 0
    ? value
    : DEFAULT_CUSTOM_DESIGN_ADDON_CENTS;
}

export function formatPrice(cents: number, currency = "usd"): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: cents % 100 === 0 ? 0 : 2,
  }).format(cents / 100);
}
