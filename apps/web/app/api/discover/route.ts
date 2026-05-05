import { z } from "zod";
import { NextResponse } from "next/server";
import { getDiscoverPayload } from "@/lib/discover";

export const runtime = "edge";
export const dynamic = "force-dynamic";

const QuerySchema = z.object({
  q: z.string().optional(),
  category: z.string().optional(),
  cursor: z.string().optional(),
  limit: z.coerce.number().int().min(1).max(24).optional(),
});

export async function GET(req: Request) {
  const url = new URL(req.url);
  const parsed = QuerySchema.safeParse({
    q: url.searchParams.get("q") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    cursor: url.searchParams.get("cursor") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });

  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_query" }, { status: 400 });
  }

  const payload = await getDiscoverPayload({
    query: parsed.data.q,
    category: parsed.data.category,
    cursor: parsed.data.cursor,
    limit: parsed.data.limit,
  });

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "cache-control": "public, max-age=60, s-maxage=60, stale-while-revalidate=300",
    },
  });
}