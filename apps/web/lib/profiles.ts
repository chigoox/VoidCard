import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { entitlementsFor } from "@/lib/entitlements";
import type { AppUser, Plan } from "@/lib/auth";

export const PRIMARY_PROFILE_ID = "primary";
export const PROFILE_USERNAME_RE = /^[a-z0-9_.-]{3,32}$/;

type PrimaryProfileRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme: unknown;
  custom_css: string | null;
  custom_font_url: string | null;
  sections: unknown;
  sections_draft: unknown;
  links: unknown;
  published: boolean | null;
  password_hash: string | null;
  scheduled_publish_at: string | null;
  verified: boolean | null;
  plan: Plan | null;
  bonus_storage_bytes: number | null;
  remove_branding: boolean | null;
  is_indexable: boolean | null;
  ai_indexing: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type SecondaryProfileRow = {
  id: string;
  owner_user_id: string;
  username: string;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme: unknown;
  custom_css: string | null;
  custom_font_url: string | null;
  sections: unknown;
  sections_draft: unknown;
  links: unknown;
  published: boolean | null;
  password_hash: string | null;
  scheduled_publish_at: string | null;
  remove_branding: boolean | null;
  is_indexable: boolean | null;
  ai_indexing: string | null;
  updated_at: string | null;
  deleted_at: string | null;
};

type OwnerPlanRow = {
  plan: Plan | null;
  bonus_storage_bytes: number | null;
  verified: boolean | null;
};

export type ManagedProfileSummary = {
  id: string;
  isPrimary: boolean;
  source: "primary" | "secondary";
  ownerUserId: string;
  username: string | null;
  displayName: string | null;
  published: boolean;
  updatedAt: string | null;
  publicPath: string | null;
};

export type ManagedProfile = ManagedProfileSummary & {
  bio: string | null;
  avatarUrl: string | null;
  theme: unknown;
  customCss: string;
  customFontUrl: string | null;
  sections: unknown;
  sectionsDraft: unknown;
  links: unknown;
  passwordHash: string | null;
  scheduledPublishAt: string | null;
  removeBranding: boolean;
  isIndexable: boolean;
  aiIndexing: string | null;
  plan: Plan;
  bonusStorageBytes: number;
  verified: boolean;
};

const PRIMARY_PROFILE_SELECT =
  "user_id, username, display_name, bio, avatar_url, theme, custom_css, custom_font_url, sections, sections_draft, links, published, password_hash, scheduled_publish_at, verified, plan, bonus_storage_bytes, remove_branding, is_indexable, ai_indexing, updated_at, deleted_at";
const SECONDARY_PROFILE_SELECT =
  "id, owner_user_id, username, display_name, bio, avatar_url, theme, custom_css, custom_font_url, sections, sections_draft, links, published, password_hash, scheduled_publish_at, remove_branding, is_indexable, ai_indexing, updated_at, deleted_at";

function toPublicPath(username: string | null) {
  return username ? `/u/${username}` : null;
}

function mapPrimaryProfile(row: PrimaryProfileRow): ManagedProfile {
  return {
    id: PRIMARY_PROFILE_ID,
    isPrimary: true,
    source: "primary",
    ownerUserId: row.user_id,
    username: row.username,
    displayName: row.display_name,
    published: row.published === true,
    updatedAt: row.updated_at,
    publicPath: toPublicPath(row.username),
    bio: row.bio,
    avatarUrl: row.avatar_url,
    theme: row.theme,
    customCss: row.custom_css ?? "",
    customFontUrl: row.custom_font_url,
    sections: row.sections ?? [],
    sectionsDraft: row.sections_draft ?? [],
    links: row.links ?? [],
    passwordHash: row.password_hash,
    scheduledPublishAt: row.scheduled_publish_at,
    removeBranding: row.remove_branding === true,
    isIndexable: row.is_indexable !== false,
    aiIndexing: row.ai_indexing,
    plan: row.plan ?? "free",
    bonusStorageBytes: Number(row.bonus_storage_bytes ?? 0),
    verified: row.verified === true,
  };
}

function mapSecondaryProfile(row: SecondaryProfileRow, owner: OwnerPlanRow): ManagedProfile {
  return {
    id: row.id,
    isPrimary: false,
    source: "secondary",
    ownerUserId: row.owner_user_id,
    username: row.username,
    displayName: row.display_name,
    published: row.published === true,
    updatedAt: row.updated_at,
    publicPath: toPublicPath(row.username),
    bio: row.bio,
    avatarUrl: row.avatar_url,
    theme: row.theme,
    customCss: row.custom_css ?? "",
    customFontUrl: row.custom_font_url,
    sections: row.sections ?? [],
    sectionsDraft: row.sections_draft ?? [],
    links: row.links ?? [],
    passwordHash: row.password_hash,
    scheduledPublishAt: row.scheduled_publish_at,
    removeBranding: row.remove_branding === true,
    isIndexable: row.is_indexable !== false,
    aiIndexing: row.ai_indexing,
    plan: owner.plan ?? "free",
    bonusStorageBytes: Number(owner.bonus_storage_bytes ?? 0),
    verified: owner.verified === true,
  };
}

function toSummary(profile: ManagedProfile): ManagedProfileSummary {
  return {
    id: profile.id,
    isPrimary: profile.isPrimary,
    source: profile.source,
    ownerUserId: profile.ownerUserId,
    username: profile.username,
    displayName: profile.displayName,
    published: profile.published,
    updatedAt: profile.updatedAt,
    publicPath: profile.publicPath,
  };
}

async function loadOwnerPlanContext(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_profile_ext")
    .select("plan, bonus_storage_bytes, verified")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as OwnerPlanRow | null) ?? { plan: "free", bonus_storage_bytes: 0, verified: false };
}

async function loadPrimaryProfile(userId: string) {
  const sb = await createClient();
  const { data } = await sb
    .from("vcard_profile_ext")
    .select(PRIMARY_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();
  return (data as PrimaryProfileRow | null) ?? null;
}

export async function listOwnedProfiles(userId: string): Promise<ManagedProfileSummary[]> {
  const sb = await createClient();
  const [primaryResult, secondaryResult] = await Promise.all([
    sb.from("vcard_profile_ext").select(PRIMARY_PROFILE_SELECT).eq("user_id", userId).maybeSingle(),
    sb
      .from("vcard_profiles")
      .select(SECONDARY_PROFILE_SELECT)
      .eq("owner_user_id", userId)
      .is("deleted_at", null)
      .order("created_at", { ascending: true }),
  ]);

  const profiles: ManagedProfileSummary[] = [];
  const primary = (primaryResult.data as PrimaryProfileRow | null) ?? null;
  if (primary) profiles.push(toSummary(mapPrimaryProfile(primary)));

  const ownerContext = primary
    ? {
        plan: primary.plan ?? "free",
        bonus_storage_bytes: Number(primary.bonus_storage_bytes ?? 0),
        verified: primary.verified === true,
      }
    : await loadOwnerPlanContext(userId);
  const secondaryProfiles = (secondaryResult.data as SecondaryProfileRow[] | null) ?? [];
  return profiles.concat(secondaryProfiles.map((profile) => toSummary(mapSecondaryProfile(profile, ownerContext))));
}

export async function getManagedProfile(userId: string, requestedProfileId?: string | null): Promise<ManagedProfile | null> {
  const primary = await loadPrimaryProfile(userId);
  if (!primary) return null;

  if (!requestedProfileId || requestedProfileId === PRIMARY_PROFILE_ID) {
    return mapPrimaryProfile(primary);
  }

  const sb = await createClient();
  const { data } = await sb
    .from("vcard_profiles")
    .select(SECONDARY_PROFILE_SELECT)
    .eq("owner_user_id", userId)
    .eq("id", requestedProfileId)
    .is("deleted_at", null)
    .maybeSingle();

  const secondary = (data as SecondaryProfileRow | null) ?? null;
  if (!secondary) {
    return mapPrimaryProfile(primary);
  }

  return mapSecondaryProfile(secondary, {
    plan: primary.plan ?? "free",
    bonus_storage_bytes: Number(primary.bonus_storage_bytes ?? 0),
    verified: primary.verified === true,
  });
}

export async function updateManagedProfile(
  userId: string,
  profileId: string | null | undefined,
  patch: Record<string, unknown>,
) {
  const sb = await createClient();
  if (!profileId || profileId === PRIMARY_PROFILE_ID) {
    return sb.from("vcard_profile_ext").update(patch).eq("user_id", userId);
  }
  return sb.from("vcard_profiles").update(patch).eq("owner_user_id", userId).eq("id", profileId);
}

export async function countOwnedProfiles(userId: string) {
  const profiles = await listOwnedProfiles(userId);
  return profiles.length;
}

export async function validateProfileUsername(
  username: string,
  excludeProfileId?: string | null,
): Promise<{ ok: true; username: string } | { ok: false; error: string }> {
  const normalized = username.trim().toLowerCase();
  if (!PROFILE_USERNAME_RE.test(normalized)) {
    return { ok: false, error: "invalid_username" };
  }

  const admin = createAdminClient();
  const [{ data: reserved }, { data: primary }, { data: secondary }] = await Promise.all([
    admin.from("vcard_reserved_usernames").select("username").eq("username", normalized).maybeSingle(),
    admin.from("vcard_profile_ext").select("user_id").eq("username", normalized).maybeSingle(),
    admin.from("vcard_profiles").select("id").eq("username", normalized).maybeSingle(),
  ]);

  if (reserved) return { ok: false, error: "username_reserved" };
  if (primary && excludeProfileId !== PRIMARY_PROFILE_ID) return { ok: false, error: "username_taken" };
  if (secondary && secondary.id !== excludeProfileId) return { ok: false, error: "username_taken" };
  return { ok: true, username: normalized };
}

export async function createManagedProfile(
  user: AppUser,
  input: { username: string; displayName?: string | null },
): Promise<{ ok: true; id: string } | { ok: false; error: string }> {
  const entitlements = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (entitlements.profilesMax <= 1) {
    return { ok: false, error: "pro_required" };
  }

  const currentCount = await countOwnedProfiles(user.id);
  if (currentCount >= entitlements.profilesMax) {
    return { ok: false, error: "profile_limit" };
  }

  const availability = await validateProfileUsername(input.username);
  if (!availability.ok) return availability;

  const sb = await createClient();
  const { data, error } = await sb
    .from("vcard_profiles")
    .insert({
      owner_user_id: user.id,
      username: availability.username,
      display_name: input.displayName?.trim() || null,
    })
    .select("id")
    .single();

  if (error || !data?.id) {
    return { ok: false, error: error?.message ?? "create_failed" };
  }
  return { ok: true, id: data.id as string };
}

export async function deleteManagedProfile(
  userId: string,
  profileId: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!profileId || profileId === PRIMARY_PROFILE_ID) {
    return { ok: false, error: "primary_profile_locked" };
  }

  const sb = await createClient();
  const { error } = await sb.from("vcard_profiles").delete().eq("owner_user_id", userId).eq("id", profileId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export function profileAppPath(basePath: string, profileId: string) {
  return profileId === PRIMARY_PROFILE_ID ? basePath : `${basePath}?profile=${profileId}`;
}

export async function findPublicProfileByUsername(username: string): Promise<ManagedProfile | null> {
  const normalized = username.trim().toLowerCase();
  const admin = createAdminClient();

  const { data: primaryData } = await admin
    .from("vcard_profile_ext")
    .select(PRIMARY_PROFILE_SELECT)
    .eq("username", normalized)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  const primary = (primaryData as PrimaryProfileRow | null) ?? null;
  if (primary) {
    return mapPrimaryProfile(primary);
  }

  const { data: secondaryData } = await admin
    .from("vcard_profiles")
    .select(SECONDARY_PROFILE_SELECT)
    .eq("username", normalized)
    .eq("published", true)
    .is("deleted_at", null)
    .maybeSingle();
  const secondary = (secondaryData as SecondaryProfileRow | null) ?? null;
  if (!secondary) return null;

  const owner = await loadOwnerPlanContext(secondary.owner_user_id);
  const profile = mapSecondaryProfile(secondary, owner);
  const entitlements = entitlementsFor(profile.plan, { extraStorageBytes: profile.bonusStorageBytes });
  return entitlements.profilesMax > 1 ? profile : null;
}