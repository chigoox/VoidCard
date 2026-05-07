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
  origin_site: string | null;
  bio: string | null;
  avatar_url: string | null;
  theme: unknown;
  custom_css: string | null;
  custom_font_url: string | null;
  sections: unknown;
  sections_draft: unknown;
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

type SharedProfileRow = {
  id: string;
  email: string | null;
  username: string | null;
  display_name: string | null;
  role: string | null;
  created_at: string | null;
};

type PrimaryProfileStateRow = {
  user_id: string;
  username: string | null;
  origin_site: string | null;
  onboarding_state: { step?: number } | null;
};

type OwnerPlanRow = {
  plan: Plan | null;
  bonus_storage_bytes: number | null;
  verified: boolean | null;
};

type SubscriptionPlanRow = {
  plan: Plan | null;
};

type VerificationStatusRow = {
  status: string | null;
};

type OrderIdRow = {
  id: string;
};

type OrderItemRow = {
  sku: string | null;
  qty: number | null;
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
  "user_id, username, display_name, bio, avatar_url, theme, custom_css, custom_font_url, sections, sections_draft, published, password_hash, scheduled_publish_at, verified, plan, bonus_storage_bytes, remove_branding, is_indexable, ai_indexing, updated_at, deleted_at";
const PRIMARY_PROFILE_STATE_SELECT = "user_id, username, origin_site, onboarding_state";
const SECONDARY_PROFILE_SELECT =
  "id, owner_user_id, username, display_name, bio, avatar_url, theme, custom_css, custom_font_url, sections, sections_draft, links, published, password_hash, scheduled_publish_at, remove_branding, is_indexable, ai_indexing, updated_at, deleted_at";
const SHARED_PROFILE_SELECT = "id, email, username, display_name, role, created_at";
const STORAGE_GRANTING_PREFIX = "card-";
const ONE_GB = 1_000_000_000;
const STORAGE_CAP = 25 * ONE_GB;
const SHARED_PLAN_PRIORITY: Plan[] = ["enterprise", "team", "pro"];
const DEFAULT_PROFILE_ORIGIN_SITE = "vcard.ed5enterprise.com";

let primaryProfileSourcePromise: Promise<"vcard_profile_ext" | "profiles"> | null = null;

function toPublicPath(username: string | null) {
  return username ? `/u/${username}` : null;
}

function isMissingTableError(error: { message?: string | null; code?: string | null } | null | undefined) {
  const message = error?.message?.toLowerCase() ?? "";
  return error?.code === "PGRST205" || message.includes("schema cache") || message.includes("could not find the table");
}

function profileOriginSite() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? `https://${DEFAULT_PROFILE_ORIGIN_SITE}`).hostname.toLowerCase();
  } catch {
    return DEFAULT_PROFILE_ORIGIN_SITE;
  }
}

async function syncSharedProfileIdentity(input: {
  userId: string;
  email?: string | null;
  username?: string | null;
  displayName?: string | null;
}) {
  const admin = createAdminClient();
  const existing = await loadSharedProfileByUserId(input.userId);

  if (!existing) {
    let email = input.email ?? null;
    if (!email) {
      const { data: authUserData, error: authUserError } = await admin.auth.admin.getUserById(input.userId);
      if (authUserError) {
        return { error: authUserError, row: null as SharedProfileRow | null };
      }
      email = authUserData.user?.email ?? null;
    }

    const row = {
      id: input.userId,
      email,
      username: input.username ?? null,
      display_name: input.displayName ?? null,
      role: "user",
      created_at: new Date().toISOString(),
    } satisfies SharedProfileRow;

    const { error } = await admin.from("profiles").upsert(
      {
        id: row.id,
        email: row.email,
        username: row.username,
        display_name: row.display_name,
        role: row.role,
      },
      { onConflict: "id" },
    );

    return { error, row: error ? null : row };
  }

  const patch = Object.fromEntries(
    Object.entries({
      email: existing.email ?? input.email ?? undefined,
      username:
        input.username !== undefined && input.username !== existing.username
          ? input.username
          : undefined,
      display_name:
        input.displayName !== undefined && input.displayName !== existing.display_name
          ? input.displayName
          : undefined,
    }).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(patch).length === 0) {
    return { error: null, row: existing };
  }

  const { error } = await admin.from("profiles").update(patch).eq("id", input.userId);
  return {
    error,
    row: error ? existing : ({ ...existing, ...patch } as SharedProfileRow),
  };
}

async function primaryProfileSource() {
  if (!primaryProfileSourcePromise) {
    primaryProfileSourcePromise = (async () => {
      const sourceClient = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
      const { error } = await sourceClient.from("vcard_profile_ext").select("user_id").limit(1);
      return isMissingTableError(error) ? "profiles" : "vcard_profile_ext";
    })();
  }

  return primaryProfileSourcePromise;
}

export async function usesSharedProfilesAsPrimary() {
  return (await primaryProfileSource()) === "profiles";
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
    links: [],
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

function mapSharedProfile(row: SharedProfileRow, owner: OwnerPlanRow): ManagedProfile {
  return mapSharedProfileWithCompanion(row, owner, null);
}

function mapSharedProfileWithCompanion(
  row: SharedProfileRow,
  owner: OwnerPlanRow,
  companion: PrimaryProfileRow | null,
): ManagedProfile {
  const username = row.username ?? companion?.username ?? null;
  const displayName = row.display_name ?? companion?.display_name ?? null;

  return {
    id: PRIMARY_PROFILE_ID,
    isPrimary: true,
    source: "primary",
    ownerUserId: row.id,
    username,
    displayName,
    published: companion ? companion.published === true : !!username,
    updatedAt: companion?.updated_at ?? row.created_at,
    publicPath: toPublicPath(username),
    bio: companion?.bio ?? null,
    avatarUrl: companion?.avatar_url ?? null,
    theme: companion?.theme ?? { id: "onyx-gold" },
    customCss: companion?.custom_css ?? "",
    customFontUrl: companion?.custom_font_url ?? null,
    sections: companion?.sections ?? [],
    sectionsDraft: companion?.sections_draft ?? [],
    links: [],
    passwordHash: companion?.password_hash ?? null,
    scheduledPublishAt: companion?.scheduled_publish_at ?? null,
    removeBranding: companion?.remove_branding === true,
    isIndexable: companion?.is_indexable !== false,
    aiIndexing: companion?.ai_indexing ?? null,
    plan: owner.plan ?? "free",
    bonusStorageBytes: Number(owner.bonus_storage_bytes ?? 0),
    verified: owner.verified === true,
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

async function loadSharedProfileByUserId(userId: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select(SHARED_PROFILE_SELECT).eq("id", userId).maybeSingle();
  return (data as SharedProfileRow | null) ?? null;
}

async function loadSharedProfileByUsername(username: string) {
  const admin = createAdminClient();
  const { data } = await admin.from("profiles").select(SHARED_PROFILE_SELECT).eq("username", username).maybeSingle();
  return (data as SharedProfileRow | null) ?? null;
}

async function loadPrimaryProfileExtByUserId(userId: string) {
  const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data, error } = await client
    .from("vcard_profile_ext")
    .select(PRIMARY_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (isMissingTableError(error)) return null;
  return (data as PrimaryProfileRow | null) ?? null;
}

async function loadPrimaryProfileExtStateByUserId(userId: string) {
  const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data, error } = await client
    .from("vcard_profile_ext")
    .select(PRIMARY_PROFILE_STATE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (isMissingTableError(error)) return { available: false, row: null, error: null };
  return {
    available: true,
    row: (data as PrimaryProfileStateRow | null) ?? null,
    error,
  };
}

async function loadPrimaryProfileExtByUsername(username: string) {
  const client = process.env.SUPABASE_SERVICE_ROLE_KEY ? createAdminClient() : await createClient();
  const { data, error } = await client
    .from("vcard_profile_ext")
    .select(PRIMARY_PROFILE_SELECT)
    .eq("username", username)
    .maybeSingle();

  if (isMissingTableError(error)) return null;
  return (data as PrimaryProfileRow | null) ?? null;
}

async function loadSharedDerivedPlanContext(userId: string): Promise<OwnerPlanRow> {
  const admin = createAdminClient();
  const [{ data: subscriptions }, { data: verification }, { data: orders }] = await Promise.all([
    admin
      .from("vcard_subscriptions")
      .select("plan")
      .eq("user_id", userId)
      .in("status", ["trialing", "active", "past_due"]),
    admin
      .from("vcard_verifications")
      .select("status")
      .eq("user_id", userId)
      .order("submitted_at", { ascending: false })
      .limit(1)
      .maybeSingle(),
    admin.from("vcard_orders").select("id").eq("user_id", userId).eq("status", "paid"),
  ]);

  const subscriptionRows = (subscriptions as SubscriptionPlanRow[] | null) ?? [];
  const plan = SHARED_PLAN_PRIORITY.find((candidate) => subscriptionRows.some((row) => row.plan === candidate)) ?? "free";

  const orderIds = ((orders as OrderIdRow[] | null) ?? []).map((order) => order.id);
  let bonusStorageBytes = 0;

  if (orderIds.length > 0) {
    const { data: orderItems } = await admin.from("vcard_order_items").select("sku, qty").in("order_id", orderIds);
    bonusStorageBytes = Math.min(
      (((orderItems as OrderItemRow[] | null) ?? []).reduce((total, item) => {
        if (!item.sku?.startsWith(STORAGE_GRANTING_PREFIX)) return total;
        return total + ONE_GB * Math.max(1, Number(item.qty ?? 1));
      }, 0)),
      STORAGE_CAP,
    );
  }

  return {
    plan,
    bonus_storage_bytes: bonusStorageBytes,
    verified: (verification as VerificationStatusRow | null)?.status === "approved",
  };
}

async function loadOwnerPlanContext(userId: string): Promise<OwnerPlanRow> {
  if (await usesSharedProfilesAsPrimary()) {
    return loadSharedDerivedPlanContext(userId);
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_profile_ext")
    .select("plan, bonus_storage_bytes, verified")
    .eq("user_id", userId)
    .maybeSingle();
  return (data as OwnerPlanRow | null) ?? { plan: "free", bonus_storage_bytes: 0, verified: false };
}

export async function loadPrimaryProfile(userId: string): Promise<ManagedProfile | null> {
  if (await usesSharedProfilesAsPrimary()) {
    const shared = await loadSharedProfileByUserId(userId);
    const companion = await loadPrimaryProfileExtByUserId(userId);
    if (!shared) {
      return companion ? mapPrimaryProfile(companion) : null;
    }

    const owner = await loadOwnerPlanContext(userId);
    return mapSharedProfileWithCompanion(shared, owner, companion);
  }

  const sb = await createClient();
  const { data, error } = await sb
    .from("vcard_profile_ext")
    .select(PRIMARY_PROFILE_SELECT)
    .eq("user_id", userId)
    .maybeSingle();

  if (isMissingTableError(error)) {
    const shared = await loadSharedProfileByUserId(userId);
    if (!shared) return null;

    const owner = await loadSharedDerivedPlanContext(userId);
    return mapSharedProfile(shared, owner);
  }

  const primary = (data as PrimaryProfileRow | null) ?? null;
  return primary ? mapPrimaryProfile(primary) : null;
}

export async function listOwnedProfiles(userId: string): Promise<ManagedProfileSummary[]> {
  const sb = await createClient();
  const primary = await loadPrimaryProfile(userId);
  const secondaryResult = await sb
    .from("vcard_profiles")
    .select(SECONDARY_PROFILE_SELECT)
    .eq("owner_user_id", userId)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  const profiles: ManagedProfileSummary[] = [];
  if (primary) profiles.push(toSummary(primary));

  const ownerContext = primary
    ? {
        plan: primary.plan,
        bonus_storage_bytes: Number(primary.bonusStorageBytes ?? 0),
        verified: primary.verified,
      }
    : await loadOwnerPlanContext(userId);

  const secondaryProfiles = (secondaryResult.data as SecondaryProfileRow[] | null) ?? [];
  return profiles.concat(secondaryProfiles.map((profile) => toSummary(mapSecondaryProfile(profile, ownerContext))));
}

export async function getPrimaryProfileUsername(userId: string) {
  const primary = await loadPrimaryProfile(userId);
  return primary?.username ?? null;
}

export async function ensurePrimaryProfileRecord(input: {
  userId: string;
  email?: string | null;
  username: string;
  displayName?: string | null;
  avatarUrl?: string | null;
}) {
  const admin = createAdminClient();
  const originSite = profileOriginSite();
  const sharedPrimary = await usesSharedProfilesAsPrimary();

  if (sharedPrimary) {
    const existing = await loadSharedProfileByUserId(input.userId);
    if (!existing) {
      const { error } = await admin.from("profiles").upsert(
        {
          id: input.userId,
          email: input.email ?? null,
          username: input.username,
          display_name: input.displayName ?? null,
          role: "user",
        },
        { onConflict: "id" },
      );
      if (error) return { error, onboardingStep: 5 };

      const companionResult = await loadPrimaryProfileExtStateByUserId(input.userId);
      if (!companionResult.available) {
        return { error: null, onboardingStep: 5 };
      }
      if (companionResult.error) {
        return { error: companionResult.error, onboardingStep: 5 };
      }
      if (!companionResult.row) {
        const { error: companionError } = await admin.from("vcard_profile_ext").insert({
          user_id: input.userId,
          username: input.username,
          display_name: input.displayName ?? null,
          avatar_url: input.avatarUrl ?? null,
          origin_site: originSite,
          plan: "free",
        });
        return { error: companionError, onboardingStep: 0 };
      }

      return {
        error: null,
        onboardingStep: companionResult.row.onboarding_state?.step ?? 0,
      };
    }

    const sharedPatch = Object.fromEntries(
      Object.entries({
        username: existing.username ? undefined : input.username,
        display_name:
          existing.username || existing.display_name
            ? undefined
            : input.displayName ?? null,
      }).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(sharedPatch).length > 0) {
      const { error } = await admin
        .from("profiles")
        .update(sharedPatch)
        .eq("id", input.userId);
      if (error) return { error, onboardingStep: 5 };
    }

    const companionResult = await loadPrimaryProfileExtStateByUserId(input.userId);
    if (!companionResult.available) {
      return { error: null, onboardingStep: 5 };
    }
    if (companionResult.error) {
      return { error: companionResult.error, onboardingStep: 5 };
    }

    if (!companionResult.row) {
      const { error } = await admin.from("vcard_profile_ext").insert({
        user_id: input.userId,
        username: existing.username ?? input.username,
        display_name: existing.display_name ?? input.displayName ?? null,
        avatar_url: input.avatarUrl ?? null,
        origin_site: originSite,
        plan: "free",
      });
      return { error, onboardingStep: 0 };
    }

    const companionPatch = Object.fromEntries(
      Object.entries({
        username: companionResult.row.username ? undefined : existing.username ?? input.username,
        origin_site: companionResult.row.origin_site ? undefined : originSite,
      }).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(companionPatch).length > 0) {
      const { error } = await admin.from("vcard_profile_ext").update(companionPatch).eq("user_id", input.userId);
      return {
        error,
        onboardingStep: companionResult.row.onboarding_state?.step ?? 0,
      };
    }

    return {
      error: null,
      onboardingStep: companionResult.row.onboarding_state?.step ?? 0,
    };
  }

  const sharedSync = await syncSharedProfileIdentity({
    userId: input.userId,
    email: input.email ?? null,
    username: input.username,
    displayName: input.displayName ?? null,
  });
  if (sharedSync.error) {
    return { error: sharedSync.error, onboardingStep: 0 };
  }

  const { data: existing } = await admin
    .from("vcard_profile_ext")
    .select("user_id, username, origin_site, onboarding_state")
    .eq("user_id", input.userId)
    .maybeSingle();

  if (!existing) {
    const { error } = await admin.from("vcard_profile_ext").insert({
      user_id: input.userId,
      username: input.username,
      display_name: input.displayName ?? null,
      avatar_url: input.avatarUrl ?? null,
      origin_site: originSite,
      plan: "free",
    });
    return { error, onboardingStep: 0 };
  }

  const patch = Object.fromEntries(
    Object.entries({
      username: existing.username ? undefined : input.username,
      origin_site: existing.origin_site ? undefined : originSite,
    }).filter(([, value]) => value !== undefined),
  );

  if (Object.keys(patch).length > 0) {
    const { error } = await admin.from("vcard_profile_ext").update(patch).eq("user_id", input.userId);
    return {
      error,
      onboardingStep: (existing.onboarding_state as { step?: number } | null)?.step ?? 0,
    };
  }

  return {
    error: null,
    onboardingStep: (existing.onboarding_state as { step?: number } | null)?.step ?? 0,
  };
}

export async function getManagedProfile(userId: string, requestedProfileId?: string | null): Promise<ManagedProfile | null> {
  const primary = await loadPrimaryProfile(userId);
  if (!primary) return null;

  if (!requestedProfileId || requestedProfileId === PRIMARY_PROFILE_ID) {
    return primary;
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
    return primary;
  }

  return mapSecondaryProfile(secondary, {
    plan: primary.plan ?? "free",
    bonus_storage_bytes: Number(primary.bonusStorageBytes ?? 0),
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
    const sharedPrimary = await usesSharedProfilesAsPrimary();

    if (!sharedPrimary) {
      const nextUsername = typeof patch.username === "string" ? patch.username : undefined;
      const nextDisplayName =
        typeof patch.display_name === "string" || patch.display_name === null
          ? (patch.display_name as string | null)
          : undefined;

      if (nextUsername !== undefined || nextDisplayName !== undefined) {
        const sharedSync = await syncSharedProfileIdentity({
          userId,
          username: nextUsername,
          displayName: nextDisplayName,
        });
        if (sharedSync.error) {
          return { data: null, error: sharedSync.error };
        }
      }
    }

    if (sharedPrimary) {
      const sharedPatch = Object.fromEntries(
        Object.entries({
          username: patch.username,
          display_name: patch.display_name,
        }).filter(([, value]) => value !== undefined),
      );

      const companionPatch = Object.fromEntries(
        Object.entries({
          username: patch.username,
          display_name: patch.display_name,
          bio: patch.bio,
          avatar_url: patch.avatar_url,
          theme: patch.theme,
          custom_css: patch.custom_css,
          custom_font_url: patch.custom_font_url,
          sections: patch.sections,
          sections_draft: patch.sections_draft,
          published: patch.published,
          password_hash: patch.password_hash,
          scheduled_publish_at: patch.scheduled_publish_at,
          remove_branding: patch.remove_branding,
          is_indexable: patch.is_indexable,
          ai_indexing: patch.ai_indexing,
        }).filter(([, value]) => value !== undefined),
      );

      if (Object.keys(sharedPatch).length > 0) {
        const { error } = await sb.from("profiles").update(sharedPatch).eq("id", userId);
        if (error) {
          return { data: null, error };
        }
      }

      if (Object.keys(companionPatch).length === 0) {
        return { data: null, error: null };
      }

      const { error } = await sb.from("vcard_profile_ext").upsert({ user_id: userId, ...companionPatch }, { onConflict: "user_id" });
      if (isMissingTableError(error)) {
        return {
          data: null,
          error: { message: "Primary profile customization storage is unavailable." },
        };
      }
      return { data: null, error };
    }

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
  const primaryLookup = await (await usesSharedProfilesAsPrimary()
    ? admin.from("profiles").select("id").eq("username", normalized).maybeSingle()
    : admin.from("vcard_profile_ext").select("user_id").eq("username", normalized).maybeSingle());

  const extLookup = await (await usesSharedProfilesAsPrimary()
    ? admin.from("vcard_profile_ext").select("user_id").eq("username", normalized).maybeSingle()
    : Promise.resolve({ data: null }));

  const [{ data: reserved }, { data: secondary }] = await Promise.all([
    admin.from("vcard_reserved_usernames").select("username").eq("username", normalized).maybeSingle(),
    admin.from("vcard_profiles").select("id").eq("username", normalized).maybeSingle(),
  ]);

  if (reserved) return { ok: false, error: "username_reserved" };
  if (primaryLookup.data && excludeProfileId !== PRIMARY_PROFILE_ID) return { ok: false, error: "username_taken" };
  if (extLookup.data && excludeProfileId !== PRIMARY_PROFILE_ID) return { ok: false, error: "username_taken" };
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

  if (await usesSharedProfilesAsPrimary()) {
    const shared = await loadSharedProfileByUsername(normalized);
    if (shared?.username) {
      const [owner, companion] = await Promise.all([
        loadOwnerPlanContext(shared.id),
        loadPrimaryProfileExtByUserId(shared.id),
      ]);
      return mapSharedProfileWithCompanion(shared, owner, companion);
    }

    const companion = await loadPrimaryProfileExtByUsername(normalized);
    if (!companion) return null;

    const owner = await loadOwnerPlanContext(companion.user_id);
    const sharedById = await loadSharedProfileByUserId(companion.user_id);
    return sharedById ? mapSharedProfileWithCompanion(sharedById, owner, companion) : mapPrimaryProfile(companion);
  }

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
