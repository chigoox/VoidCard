"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const PlanSchema = z.object({
  id: z.string().regex(/^[a-z0-9_-]{2,40}$/),
  name: z.string().min(1).max(80),
  blurb: z.string().max(280).nullable().optional(),
  monthly_cents: z.coerce.number().int().min(0),
  yearly_cents: z.coerce.number().int().min(0),
  stripe_price_monthly: z.string().max(120).nullable().optional(),
  stripe_price_yearly: z.string().max(120).nullable().optional(),
  features_text: z.string().max(4000).optional(),
  position: z.coerce.number().int().min(0),
  active: z.coerce.boolean(),
});

export async function upsertPlan(formData: FormData) {
  await requireAdmin();
  const parsed = PlanSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error(parsed.error.issues.map((i) => i.message).join("; "));
  const features = (parsed.data.features_text ?? "")
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean);
  const sb = createAdminClient();
  const { error } = await sb.from("vcard_plans").upsert({
    id: parsed.data.id,
    name: parsed.data.name,
    blurb: parsed.data.blurb ?? null,
    monthly_cents: parsed.data.monthly_cents,
    yearly_cents: parsed.data.yearly_cents,
    stripe_price_monthly: parsed.data.stripe_price_monthly?.trim() || null,
    stripe_price_yearly: parsed.data.stripe_price_yearly?.trim() || null,
    features,
    position: parsed.data.position,
    active: parsed.data.active,
    updated_at: new Date().toISOString(),
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/plans");
  revalidatePath("/pricing");
}
