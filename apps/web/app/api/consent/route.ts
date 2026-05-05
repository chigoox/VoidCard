import { NextResponse } from "next/server";
import { headers } from "next/headers";
import { recordConsent } from "@/lib/dsr";
import { hashIpDaily } from "@/lib/ip-salt";
import { createClient } from "@/lib/supabase/server";

export const POLICY_VERSION = "2026-05-01";
export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { cookieId?: string; analytics?: boolean; marketing?: boolean };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_body" }, { status: 400 });
  }
  if (!body.cookieId) return NextResponse.json({ error: "missing_cookie_id" }, { status: 400 });

  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const ua = h.get("user-agent")?.slice(0, 500) ?? null;
  await recordConsent({
    userId: user?.id ?? null,
    cookieId: body.cookieId,
    choice: { essential: true, analytics: !!body.analytics, marketing: !!body.marketing },
    policyVersion: POLICY_VERSION,
    ipHash: await hashIpDaily(ip),
    ua,
  });
  return NextResponse.json({ ok: true });
}
