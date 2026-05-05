import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ctx = await authenticateApiKey(req);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_profile_ext")
    .select("username, display_name, avatar_url, theme, sections, verified, plan, published")
    .eq("user_id", ctx.userId)
    .single();

  return NextResponse.json({ profile: data });
}
