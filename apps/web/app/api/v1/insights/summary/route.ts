import { NextResponse } from "next/server";
import { authenticateApiKey } from "@/lib/api-auth";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const ctx = await authenticateApiKey(req);
  if ("error" in ctx) return NextResponse.json({ error: ctx.error }, { status: ctx.status });

  const url = new URL(req.url);
  const days = Math.min(Number(url.searchParams.get("days") ?? 30), 365);
  const since = new Date(Date.now() - days * 86_400_000).toISOString();

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("vcard_taps")
    .select("source, country, occurred_at")
    .eq("user_id", ctx.userId)
    .gte("occurred_at", since)
    .limit(10_000);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const total = data?.length ?? 0;
  const bySource = (data ?? []).reduce<Record<string, number>>((a, t) => {
    a[t.source] = (a[t.source] ?? 0) + 1; return a;
  }, {});
  const byCountry = (data ?? []).reduce<Record<string, number>>((a, t) => {
    const k = t.country ?? "—"; a[k] = (a[k] ?? 0) + 1; return a;
  }, {});

  return NextResponse.json({ window_days: days, total, by_source: bySource, by_country: byCountry });
}
