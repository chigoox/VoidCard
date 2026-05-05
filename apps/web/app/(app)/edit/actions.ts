"use server";
import { revalidatePath } from "next/cache";
import { Sections } from "@/lib/sections/types";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { getManagedProfile, updateManagedProfile } from "@/lib/profiles";
import { rateLimits } from "@/lib/rate-limit";

export async function saveDraft(input: unknown, profileId?: string) {
  const u = await requireUser();
  const sections = Sections.parse(input);
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false, error: "profile_not_found" };
  await updateManagedProfile(u.id, profile.id, { sections_draft: sections });
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

  if (profile.publicPath) revalidatePath(profile.publicPath);
  return { ok: true };
}

export async function setTheme(theme: { id: string; tokens?: Record<string, string> }, profileId?: string) {
  const u = await requireUser();
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false, error: "profile_not_found" };
  await updateManagedProfile(u.id, profile.id, { theme });
  if (profile.publicPath) revalidatePath(profile.publicPath);
  return { ok: true };
}

export async function setCustomCss(css: string, profileId?: string) {
  const u = await requireUser();
  // free for everyone
  if (css.length > 30_000) return { ok: false, error: "too_large" };
  const profile = await getManagedProfile(u.id, profileId ?? null);
  if (!profile) return { ok: false, error: "profile_not_found" };
  await updateManagedProfile(u.id, profile.id, { custom_css: css });
  if (profile.publicPath) revalidatePath(profile.publicPath);
  return { ok: true };
}
