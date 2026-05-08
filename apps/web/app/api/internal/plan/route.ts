import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planWithRole } from "@/lib/auth";
import { loadPrimaryProfile } from "@/lib/profiles";

export const runtime = "nodejs";

/**
 * GET /api/internal/plan?uid=<supabase_user_id>
 * Auth: Authorization: Bearer ${ED5_SERVICE_SECRET}
 *
 * Returns the user's plan tier so sister apps (Boox) can scale features
 * (e.g. discount fee tier) based on whether the user is Pro/Team in VoidCard.
 */
export async function GET(req: Request) {
  const secret = process.env.ED5_SERVICE_SECRET;
  if (!secret) return NextResponse.json({ error: "service_not_configured" }, { status: 500 });
  const authHeader = req.headers.get("authorization") || "";
  const presented = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : "";
  if (!presented || presented !== secret) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const uid = url.searchParams.get("uid");
  if (!uid) return NextResponse.json({ error: "missing_uid" }, { status: 400 });

  const admin = createAdminClient();
  const [{ data: profile }, primary] = await Promise.all([
    admin.from("profiles").select("role").eq("id", uid).maybeSingle(),
    loadPrimaryProfile(uid),
  ]);

  if (!profile && !primary) return NextResponse.json({ plan: null });

  const role = (profile?.role as "user" | "admin" | "superadmin") ?? "user";
  const plan = planWithRole((primary?.plan as "free" | "pro" | "team" | "enterprise") ?? "free", role);
  return NextResponse.json({
    plan,
    verified: primary?.verified === true,
    role,
  });
}
