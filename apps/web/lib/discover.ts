import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { usesSharedProfilesAsPrimary } from "@/lib/profiles";
import { Sections, type SectionType } from "@/lib/sections/types";

const FETCH_LIMIT = 120;

const DISCOVER_CATEGORY_DEFS = [
  { slug: "bookings", label: "Bookings", types: ["schedule", "booking"] },
  { slug: "tips", label: "Tips", types: ["tip"] },
  { slug: "music", label: "Music", types: ["spotify"] },
  { slug: "video", label: "Video", types: ["video", "youtube"] },
  { slug: "gallery", label: "Gallery", types: ["gallery", "image"] },
  { slug: "forms", label: "Lead forms", types: ["form"] },
  { slug: "maps", label: "Location", types: ["map"] },
] as const satisfies ReadonlyArray<{ slug: string; label: string; types: readonly SectionType[] }>;

type DiscoverRow = {
  user_id: string;
  username: string | null;
  display_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  verified: boolean | null;
  updated_at: string | null;
  sections: unknown;
  is_indexable: boolean | null;
  ai_indexing: string | null;
};

type SharedDiscoverRow = {
  id: string;
  username: string | null;
  display_name: string | null;
  created_at: string | null;
};

export type DiscoverProfile = {
  userId: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  bio: string | null;
  verified: boolean;
  updatedAt: string | null;
  profileUrl: string;
  categories: Array<{ slug: string; label: string }>;
};

export type DiscoverPayload = {
  query: string;
  category: string;
  cursor: string | null;
  nextCursor: string | null;
  results: DiscoverProfile[];
  featured: DiscoverProfile[];
  categories: Array<{ slug: string; label: string; count: number }>;
};

export async function getDiscoverPayload(input: {
  query?: string | null;
  category?: string | null;
  cursor?: string | null;
  limit?: number;
}): Promise<DiscoverPayload> {
  const query = normalizeQuery(input.query);
  const category = normalizeCategory(input.category);
  const offset = parseCursor(input.cursor);
  const limit = clamp(input.limit ?? 12, 1, 24);

  if (await usesSharedProfilesAsPrimary()) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("profiles")
      .select("id, username, display_name, created_at")
      .not("username", "is", null)
      .order("created_at", { ascending: false })
      .limit(1000);

    const profiles = (((data as SharedDiscoverRow[] | null) ?? [])
      .filter((row) => row.username)
      .map(toSharedDiscoverProfile)
      .filter((profile) => matchesSharedDiscoverQuery(profile, query)));

    const categoryCounts = countCategories(profiles);
    const filtered = category ? profiles.filter((profile) => profile.categories.some((item) => item.slug === category)) : profiles;
    const results = filtered.slice(offset, offset + limit);
    const featured = !query && !category ? profiles.slice(0, 3) : [];
    const nextCursor = offset + limit < filtered.length ? String(offset + limit) : null;

    return {
      query,
      category,
      cursor: input.cursor?.trim() ? input.cursor.trim() : null,
      nextCursor,
      results,
      featured,
      categories: categoryCounts,
    };
  }

  const client = await createClient();
  let lookup = client
    .from("vcard_profile_ext")
    .select(
      "user_id, username, display_name, avatar_url, bio, verified, updated_at, sections, is_indexable, ai_indexing",
    )
    .eq("published", true)
    .is("deleted_at", null)
    .order("verified", { ascending: false })
    .order("updated_at", { ascending: false, nullsFirst: false })
    .order("user_id", { ascending: false })
    .range(0, FETCH_LIMIT - 1);

  if (query) {
    lookup = lookup.textSearch("search_tsv", query, {
      config: "simple",
      type: "websearch",
    });
  }

  const { data } = await lookup;
  const profiles = ((data as DiscoverRow[] | null) ?? [])
    .filter((row) => row.username && row.is_indexable !== false && row.ai_indexing !== "disallow_all")
    .map(toDiscoverProfile);

  const categoryCounts = countCategories(profiles);
  const filtered = category ? profiles.filter((profile) => profile.categories.some((item) => item.slug === category)) : profiles;
  const results = filtered.slice(offset, offset + limit);
  const featured = !query && !category ? profiles.slice(0, 3) : [];
  const nextCursor = offset + limit < filtered.length ? String(offset + limit) : null;

  return {
    query,
    category,
    cursor: input.cursor?.trim() ? input.cursor.trim() : null,
    nextCursor,
    results,
    featured,
    categories: categoryCounts,
  };
}

function normalizeQuery(value: string | null | undefined) {
  return (value ?? "").trim().replace(/^@+/, "").slice(0, 100);
}

function normalizeCategory(value: string | null | undefined) {
  const candidate = (value ?? "").trim().toLowerCase();
  return DISCOVER_CATEGORY_DEFS.some((item) => item.slug === candidate) ? candidate : "";
}

function parseCursor(value: string | null | undefined) {
  const parsed = Number.parseInt((value ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function toDiscoverProfile(row: DiscoverRow): DiscoverProfile {
  const username = row.username ?? "unknown";
  const displayName = row.display_name?.trim() || `@${username}`;
  return {
    userId: row.user_id,
    username,
    displayName,
    avatarUrl: row.avatar_url,
    bio: row.bio,
    verified: row.verified === true,
    updatedAt: row.updated_at,
    profileUrl: `/u/${username}`,
    categories: deriveCategories(row.sections),
  };
}

function deriveCategories(sectionsRaw: unknown) {
  const parsed = Sections.safeParse(sectionsRaw);
  if (!parsed.success) return [];

  const types = new Set(parsed.data.map((section) => section.type));
  return DISCOVER_CATEGORY_DEFS.filter((item) => item.types.some((type) => types.has(type))).map(({ slug, label }) => ({ slug, label }));
}

function countCategories(profiles: DiscoverProfile[]) {
  const counts = new Map<string, { slug: string; label: string; count: number }>();

  for (const profile of profiles) {
    for (const category of profile.categories) {
      const existing = counts.get(category.slug);
      if (existing) {
        existing.count += 1;
      } else {
        counts.set(category.slug, { ...category, count: 1 });
      }
    }
  }

  return DISCOVER_CATEGORY_DEFS.map(({ slug, label }) => counts.get(slug) ?? { slug, label, count: 0 }).filter((item) => item.count > 0);
}

function toSharedDiscoverProfile(row: SharedDiscoverRow): DiscoverProfile {
  const username = row.username ?? "unknown";
  const displayName = row.display_name?.trim() || `@${username}`;
  return {
    userId: row.id,
    username,
    displayName,
    avatarUrl: null,
    bio: null,
    verified: false,
    updatedAt: row.created_at,
    profileUrl: `/u/${username}`,
    categories: [],
  };
}

function matchesSharedDiscoverQuery(profile: DiscoverProfile, query: string) {
  if (!query) return true;

  const normalizedQuery = query.toLowerCase();
  return profile.username.toLowerCase().includes(normalizedQuery) || profile.displayName.toLowerCase().includes(normalizedQuery);
}