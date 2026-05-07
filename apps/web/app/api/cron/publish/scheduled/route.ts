import { NextResponse } from "next/server";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { Sections } from "@/lib/sections/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PrimaryRow = {
  user_id: string;
  username: string | null;
  sections_draft: unknown;
  scheduled_publish_at: string | null;
};

type SecondaryRow = {
  id: string;
  owner_user_id: string;
  username: string | null;
  sections_draft: unknown;
  scheduled_publish_at: string | null;
};

export async function GET(req: Request) {
  const cronSecret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  const fromVercelCron = req.headers.get("x-vercel-cron") === "1";
  if (!fromVercelCron && (!cronSecret || auth !== `Bearer ${cronSecret}`)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  const sb = createAdminClient();
  const nowIso = new Date().toISOString();
  const published: Array<{ source: "primary" | "secondary"; id: string; username: string | null }> = [];
  const errors: Array<{ source: string; id: string; error: string }> = [];

  // Primary profiles (vcard_profile_ext).
  const { data: primary } = await sb
    .from("vcard_profile_ext")
    .select("user_id, username, sections_draft, scheduled_publish_at")
    .not("scheduled_publish_at", "is", null)
    .lte("scheduled_publish_at", nowIso)
    .is("deleted_at", null)
    .limit(100);

  for (const row of (primary as PrimaryRow[] | null) ?? []) {
    try {
      const sections = Sections.parse(row.sections_draft ?? []);
      const { error } = await sb
        .from("vcard_profile_ext")
        .update({ sections, published: true, scheduled_publish_at: null })
        .eq("user_id", row.user_id);
      if (error) {
        errors.push({ source: "primary", id: row.user_id, error: error.message });
        continue;
      }
      published.push({ source: "primary", id: row.user_id, username: row.username });
      if (row.username) revalidatePath(`/u/${row.username}`);
    } catch (err) {
      errors.push({
        source: "primary",
        id: row.user_id,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  // Secondary profiles (vcard_profiles).
  const { data: secondary } = await sb
    .from("vcard_profiles")
    .select("id, owner_user_id, username, sections_draft, scheduled_publish_at")
    .not("scheduled_publish_at", "is", null)
    .lte("scheduled_publish_at", nowIso)
    .is("deleted_at", null)
    .limit(100);

  for (const row of (secondary as SecondaryRow[] | null) ?? []) {
    try {
      const sections = Sections.parse(row.sections_draft ?? []);
      const { error } = await sb
        .from("vcard_profiles")
        .update({ sections, published: true, scheduled_publish_at: null })
        .eq("id", row.id);
      if (error) {
        errors.push({ source: "secondary", id: row.id, error: error.message });
        continue;
      }
      published.push({ source: "secondary", id: row.id, username: row.username });
      if (row.username) revalidatePath(`/u/${row.username}`);
    } catch (err) {
      errors.push({
        source: "secondary",
        id: row.id,
        error: err instanceof Error ? err.message : "unknown",
      });
    }
  }

  return NextResponse.json({ ok: true, publishedCount: published.length, published, errors });
}
