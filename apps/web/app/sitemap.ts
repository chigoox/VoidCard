import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";
import { createAdminClient } from "@/lib/supabase/admin";

export const revalidate = 3600;

const STATIC_PATHS: { path: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { path: "/", priority: 1.0, changeFrequency: "weekly" },
  { path: "/pricing", priority: 0.9, changeFrequency: "weekly" },
  { path: "/discover", priority: 0.85, changeFrequency: "daily" },
  { path: "/shop", priority: 0.9, changeFrequency: "daily" },
  { path: "/why-voidcard", priority: 0.7, changeFrequency: "monthly" },
  { path: "/changelog", priority: 0.6, changeFrequency: "weekly" },
  { path: "/contact", priority: 0.5, changeFrequency: "yearly" },
  { path: "/trust", priority: 0.5, changeFrequency: "monthly" },
  { path: "/privacy", priority: 0.3, changeFrequency: "yearly" },
  { path: "/terms", priority: 0.3, changeFrequency: "yearly" },
  { path: "/legal/cookies", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/dpa", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/security", priority: 0.2, changeFrequency: "yearly" },
  { path: "/legal/subprocessors", priority: 0.2, changeFrequency: "monthly" },
  { path: "/docs/api", priority: 0.5, changeFrequency: "monthly" },
  { path: "/ai-policy", priority: 0.4, changeFrequency: "monthly" },
];

type ProfileRow = { username: string; updated_at: string | null };

async function fetchPublicProfiles(): Promise<ProfileRow[]> {
  try {
    const sb = createAdminClient();
    const { data } = await sb
      .from("vcard_profile_ext")
      .select("username, updated_at")
      .eq("published", true)
      .order("updated_at", { ascending: false })
      .limit(5000);
    return (data as ProfileRow[] | null) ?? [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const staticEntries: MetadataRoute.Sitemap = STATIC_PATHS.map((s) => ({
    url: `${SITE_URL}${s.path}`,
    lastModified: now,
    changeFrequency: s.changeFrequency,
    priority: s.priority,
  }));

  const profiles = await fetchPublicProfiles();
  const profileEntries: MetadataRoute.Sitemap = profiles.map((p) => ({
    url: `${SITE_URL}/u/${p.username}`,
    lastModified: p.updated_at ? new Date(p.updated_at) : now,
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticEntries, ...profileEntries];
}
