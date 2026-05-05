import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/cdn";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  bucket: z.enum(["vcard-public", "vcard-private"]),
  path: z.string().min(1).max(500),
  kind: z.enum(["image", "video", "file"]),
  mime: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  width: z.number().int().positive().optional(),
  height: z.number().int().positive().optional(),
  durationMs: z.number().int().positive().optional(),
});

export async function POST(req: Request) {
  const user = await requireUser();

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // Path must be scoped under user's folder.
  if (!body.path.startsWith(`${user.id}/`)) {
    return NextResponse.json({ ok: false, error: "forbidden" }, { status: 403 });
  }

  const admin = createAdminClient();

  // Verify the object actually exists at the claimed path with the claimed size.
  const { data: head } = await admin.storage.from(body.bucket).list(user.id, {
    limit: 1000,
    search: body.path.split("/").slice(1).join("/"),
  });
  const obj = head?.find((o) => `${user.id}/${o.name}` === body.path);
  if (!obj) {
    return NextResponse.json({ ok: false, error: "not_uploaded" }, { status: 404 });
  }
  const actualBytes = Number(obj.metadata?.size ?? 0);
  if (actualBytes <= 0 || Math.abs(actualBytes - body.sizeBytes) > 1024) {
    return NextResponse.json({ ok: false, error: "size_mismatch" }, { status: 400 });
  }

  const { data, error } = await admin
    .from("vcard_media")
    .insert({
      user_id: user.id,
      bucket: body.bucket,
      storage_path: body.path,
      kind: body.kind,
      mime: body.mime,
      size_bytes: actualBytes,
      width: body.width ?? null,
      height: body.height ?? null,
      duration_ms: body.durationMs ?? null,
    })
    .select("id, bucket, storage_path")
    .single();

  if (error || !data) {
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  // Build a public URL for public bucket; signed URL for private.
  let url: string | null = null;
  if (body.bucket === "vcard-public") {
    const { data: pub } = admin.storage.from(body.bucket).getPublicUrl(body.path);
    url = publicAssetUrl(pub.publicUrl);
  } else {
    const { data: signed } = await admin.storage
      .from(body.bucket)
      .createSignedUrl(body.path, 60 * 60);
    url = signed?.signedUrl ?? null;
  }

  return NextResponse.json({ ok: true, media: data, url });
}
