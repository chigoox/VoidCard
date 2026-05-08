"use server";
import { revalidatePath } from "next/cache";
import { Sections, type Section as SectionRecord, type Sections as SectionsRecord } from "@/lib/sections/types";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { listProducts } from "@/lib/cms";
import { PRIMARY_PROFILE_ID, getManagedProfile, updateManagedProfile } from "@/lib/profiles";
import { rateLimits } from "@/lib/rate-limit";

async function syncLeadForms(userId: string, profileId: string, sections: SectionsRecord) {
  const formSections = sections.filter(
    (section): section is Extract<SectionRecord, { type: "form" }> => section.type === "form",
  );
  if (formSections.length === 0) {
    return { ok: true as const };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("vcard_lead_forms").upsert(
    formSections.map((section) => ({
      id: section.id,
      owner_id: userId,
      profile_id: profileId === PRIMARY_PROFILE_ID ? userId : null,
      name: section.props.title || "Lead form",
      fields: section.props.fields,
      require_captcha: section.props.requireCaptcha ?? false,
      enabled: true,
    })),
    { onConflict: "id" },
  );

  if (error) {
    return { ok: false as const, error: "form_sync_failed" };
  }

  return { ok: true as const };
}

export async function saveDraft(input: unknown, profileId?: string) {
  const u = await requireUser();
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  void ent;
  const sections = Sections.parse(input);
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false, error: "profile_not_found" };
  await updateManagedProfile(u.id, profile.id, { sections_draft: sections });
  const syncResult = await syncLeadForms(u.id, profile.id, sections);
  if (!syncResult.ok) return syncResult;
  revalidatePath("/edit");
  return { ok: true };
}

export async function publishDraft(profileId?: string) {
  const u = await requireUser();
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false, error: "profile_not_found" };

  const rl = await rateLimits.publish.limit(`u:${u.id}:${profile.id}`);
  if (!rl.success) return { ok: false, error: "rate_limited" };

  if (profile.scheduledPublishAt && !ent.scheduledPublish) {
    return { ok: false, error: "pro_required_scheduled_publish" };
  }

  const sections = Sections.parse(profile.sectionsDraft ?? []);
  await updateManagedProfile(u.id, profile.id, { sections, published: true });
  const syncResult = await syncLeadForms(u.id, profile.id, sections);
  if (!syncResult.ok) return syncResult;

  if (profile.publicPath) revalidatePath(profile.publicPath);
  return { ok: true };
}

export async function setTheme(theme: { id: string; tokens?: Record<string, string> }, profileId?: string) {
  const u = await requireUser();
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  void ent;
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false, error: "profile_not_found" };
  await updateManagedProfile(u.id, profile.id, { theme });
  if (profile.publicPath) revalidatePath(profile.publicPath);
  return { ok: true };
}

export async function setCustomCss(css: string, profileId?: string) {
  const u = await requireUser();
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  void ent;
  // free for everyone
  if (css.length > 30_000) return { ok: false, error: "too_large" };
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false, error: "profile_not_found" };
  await updateManagedProfile(u.id, profile.id, { custom_css: css });
  if (profile.publicPath) revalidatePath(profile.publicPath);
  return { ok: true };
}

export async function getStorageUsage() {
  const u = await requireUser();
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  const supabase = await createClient();
  const { data: rows } = await supabase
    .from("vcard_media")
    .select("size_bytes")
    .eq("user_id", u.id);
  const used = (rows ?? []).reduce((acc, row) => acc + Number((row as { size_bytes: number | null }).size_bytes ?? 0), 0);
  return { ok: true as const, used, quota: ent.storageBytes };
}

export async function setScheduledPublish(iso: string | null, profileId?: string) {
  const u = await requireUser();
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  if (!ent.scheduledPublish) return { ok: false as const, error: "pro_required_scheduled_publish" };
  if (iso !== null) {
    const t = Date.parse(iso);
    if (!Number.isFinite(t)) return { ok: false as const, error: "invalid_datetime" };
    if (t < Date.now() - 60_000) return { ok: false as const, error: "must_be_future" };
  }
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false as const, error: "profile_not_found" };
  await updateManagedProfile(u.id, profile.id, { scheduled_publish_at: iso });
  revalidatePath("/edit");
  return { ok: true as const };
}

export async function listVersions(profileId?: string) {
  const u = await requireUser();
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false as const, error: "profile_not_found", versions: [] };
  const sb = await createClient();
  const { data, error } = await sb
    .from("vcard_profile_versions")
    .select("id, label, created_at")
    .eq("owner_user_id", u.id)
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);
  if (error) return { ok: false as const, error: error.message, versions: [] };
  return { ok: true as const, versions: data ?? [] };
}

export async function snapshotVersion(input: unknown, label: string | null, profileId?: string) {
  const u = await requireUser();
  const sections = Sections.parse(input);
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false as const, error: "profile_not_found" };
  const sb = await createClient();
  const trimmed = (label ?? "").trim().slice(0, 80) || null;
  const { error } = await sb.from("vcard_profile_versions").insert({
    owner_user_id: u.id,
    profile_id: profile.id,
    label: trimmed,
    sections,
    theme: profile.theme ?? null,
    custom_css: profile.customCss ?? null,
  });
  if (error) return { ok: false as const, error: error.message };
  // Trim oldest if more than 50 exist for this profile.
  const { data: extras } = await sb
    .from("vcard_profile_versions")
    .select("id, created_at")
    .eq("owner_user_id", u.id)
    .eq("profile_id", profile.id)
    .order("created_at", { ascending: false })
    .range(50, 200);
  if (extras && extras.length > 0) {
    await sb.from("vcard_profile_versions").delete().in("id", extras.map((r) => r.id));
  }
  revalidatePath("/edit");
  return { ok: true as const };
}

export async function restoreVersion(versionId: string, profileId?: string) {
  const u = await requireUser();
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false as const, error: "profile_not_found" };
  const sb = await createClient();
  const { data, error } = await sb
    .from("vcard_profile_versions")
    .select("sections, theme, custom_css, profile_id, owner_user_id")
    .eq("id", versionId)
    .maybeSingle();
  if (error || !data) return { ok: false as const, error: "version_not_found" };
  if (data.owner_user_id !== u.id || data.profile_id !== profile.id) return { ok: false as const, error: "forbidden" };
  const parsed = Sections.safeParse(data.sections);
  if (!parsed.success) return { ok: false as const, error: "invalid_sections" };
  return {
    ok: true as const,
    sections: parsed.data,
    theme: data.theme ?? null,
    customCss: typeof data.custom_css === "string" ? data.custom_css : "",
  };
}

export async function deleteVersion(versionId: string) {
  const u = await requireUser();
  const sb = await createClient();
  const { error } = await sb
    .from("vcard_profile_versions")
    .delete()
    .eq("id", versionId)
    .eq("owner_user_id", u.id);
  if (error) return { ok: false as const, error: error.message };
  return { ok: true as const };
}

export async function listShopProductsForPicker() {
  await requireUser();
  const products = await listProducts();
  return {
    ok: true as const,
    products: products.map((p) => ({
      sku: p.sku,
      name: p.name,
      blurb: p.blurb,
      priceCents: p.price_cents,
      currency: p.currency,
    })),
  };
}

export async function listOwnedSellerProducts() {
  const u = await requireUser();
  const { listSellerProducts } = await import("@/lib/seller-products");
  const products = await listSellerProducts(u.id);
  return {
    ok: true as const,
    products: products.map((p) => ({
      id: p.id,
      name: p.name,
      priceCents: p.price_cents,
      currency: p.currency,
      active: p.active,
      imageUrl: p.image_url,
    })),
  };
}

export async function getVariantB(profileId?: string) {
  const u = await requireUser();
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false as const, error: "profile_not_found" };
  const sb = await createClient();
  const { data } = await sb
    .from("vcard_ab_variants")
    .select("id, name, weight, enabled, sections, views, conversions, updated_at")
    .eq("user_id", u.id)
    .order("updated_at", { ascending: false });
  return { ok: true as const, variants: (data as Array<{ id: string; name: string; weight: number; enabled: boolean; sections: unknown; views: number; conversions: number; updated_at: string }> | null) ?? [] };
}

export async function saveVariantB(input: unknown, name: string, weight: number, enabled: boolean, variantId?: string) {
  const u = await requireUser();
  const ent = entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes });
  if (!ent.abVariants) return { ok: false as const, error: "pro_required_ab" };
  const sections = Sections.parse(input);
  const w = Math.max(0, Math.min(100, Math.round(weight)));
  const trimmed = (name ?? "").trim().slice(0, 80) || "Variant";
  const sb = await createClient();
  if (variantId) {
    const { error } = await sb
      .from("vcard_ab_variants")
      .update({ name: trimmed, weight: w, enabled, sections })
      .eq("id", variantId)
      .eq("user_id", u.id);
    if (error) return { ok: false as const, error: error.message };
  } else {
    const { error } = await sb.from("vcard_ab_variants").insert({
      user_id: u.id,
      name: trimmed,
      weight: w,
      enabled,
      sections,
      theme: {},
    });
    if (error) return { ok: false as const, error: error.message };
  }
  revalidatePath("/edit");
  return { ok: true as const };
}

export async function deleteVariantB(variantId: string) {
  const u = await requireUser();
  const sb = await createClient();
  const { error } = await sb
    .from("vcard_ab_variants")
    .delete()
    .eq("id", variantId)
    .eq("user_id", u.id);
  if (error) return { ok: false as const, error: error.message };
  revalidatePath("/edit");
  return { ok: true as const };
}
