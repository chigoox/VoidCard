import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { loadPrimaryProfile } from "@/lib/profiles";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ctx = await authenticateApiKey(req);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const profile = await loadPrimaryProfile(ctx.userId);

  return NextResponse.json({
    profile: profile
      ? {
          username: profile.username,
          display_name: profile.displayName,
          avatar_url: profile.avatarUrl,
          theme: profile.theme,
          sections: profile.sections,
          verified: profile.verified,
          plan: profile.plan,
          published: profile.published,
        }
      : null,
  });
}
