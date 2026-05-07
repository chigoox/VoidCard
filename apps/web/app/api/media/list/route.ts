import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/cdn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Query = z.object({
  kind: z.enum(["image", "video", "file", "all"]).default("all"),
  source: z.enum(["upload", "ai", "all"]).default("all"),
  q: z.string().max(200).optional(),
  limit: z.coerce.number().int().min(1).max(60).default(30),
  cursor: z.string().datetime().optional(),
});

export async function GET(req: Request) {
  const user = await requireUser();
  const url = new URL(req.url);

  let params: z.infer<typeof Query>;
  try {
    params = Query.parse({
      kind: url.searchParams.get("kind") ?? undefined,
      source: url.searchParams.get("source") ?? undefined,
      q: url.searchParams.get("q") ?? undefined,
      limit: url.searchParams.get("limit") ?? undefined,
      cursor: url.searchParams.get("cursor") ?? undefined,
    });
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const admin = createAdminClient();
  let query = admin
    .from("vcard_media")
    .select("id, kind, mime, bucket, storage_path, size_bytes, source, prompt, created_at")
    .eq("user_id", user.id)
    .eq("bucket", "vcard-public")
    .order("created_at", { ascending: false })
    .limit(params.limit + 1);

  if (params.kind !== "all") query = query.eq("kind", params.kind);
  if (params.source !== "all") query = query.eq("source", params.source);
  if (params.cursor) query = query.lt("created_at", params.cursor);
  if (params.q) query = query.ilike("prompt", `%${params.q}%`);

  const { data, error } = await query;
  if (error) {
    return NextResponse.json({ ok: false, error: "db" }, { status: 500 });
  }

  const rows = data ?? [];
  const hasMore = rows.length > params.limit;
  const trimmed = hasMore ? rows.slice(0, params.limit) : rows;
  const nextCursor = hasMore ? trimmed[trimmed.length - 1]?.created_at ?? null : null;

  const items = trimmed.map((row) => {
    const { data: pub } = admin.storage.from(row.bucket).getPublicUrl(row.storage_path);
    return {
      id: row.id,
      kind: row.kind as "image" | "video" | "file",
      mime: row.mime ?? null,
      url: publicAssetUrl(pub.publicUrl),
      sizeBytes: Number(row.size_bytes ?? 0),
      source: (row.source ?? "upload") as "upload" | "ai",
      prompt: row.prompt ?? null,
      createdAt: row.created_at,
    };
  });

  return NextResponse.json({ ok: true, items, nextCursor });
}

const DeleteBody = z.object({ id: z.string().uuid() });

export async function DELETE(req: Request) {
  const user = await requireUser();
  let body: z.infer<typeof DeleteBody>;
  try {
    body = DeleteBody.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }
  const admin = createAdminClient();
  const { data: row } = await admin
    .from("vcard_media")
    .select("id, user_id, bucket, storage_path")
    .eq("id", body.id)
    .maybeSingle();
  if (!row || row.user_id !== user.id) {
    return NextResponse.json({ ok: false, error: "not_found" }, { status: 404 });
  }
  await admin.storage.from(row.bucket).remove([row.storage_path]);
  await admin.from("vcard_media").delete().eq("id", row.id);
  return NextResponse.json({ ok: true });
}
