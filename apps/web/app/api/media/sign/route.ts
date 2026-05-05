import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { entitlementsFor } from "@/lib/entitlements";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_MIME: Record<string, string[]> = {
  image: ["image/jpeg", "image/png", "image/webp", "image/avif", "image/gif"],
  video: ["video/mp4", "video/webm"],
  file: ["application/pdf", "application/zip", "application/json", "text/csv", "font/woff2"],
};

const MAX_BYTES_PUBLIC = 50 * 1024 * 1024; // 50 MB
const MAX_BYTES_PRIVATE = 100 * 1024 * 1024; // 100 MB

const Body = z.object({
  filename: z.string().min(1).max(200),
  mime: z.string().min(1).max(100),
  sizeBytes: z.number().int().positive(),
  kind: z.enum(["image", "video", "file"]),
  visibility: z.enum(["public", "private"]).default("public"),
});

function safeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "_").slice(0, 120);
}

export async function POST(req: Request) {
  const user = await requireUser();

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch (e) {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const allowed = ALLOWED_MIME[body.kind];
  if (!allowed.includes(body.mime)) {
    return NextResponse.json({ ok: false, error: "mime_not_allowed" }, { status: 415 });
  }

  const maxBytes = body.visibility === "private" ? MAX_BYTES_PRIVATE : MAX_BYTES_PUBLIC;
  if (body.sizeBytes > maxBytes) {
    return NextResponse.json({ ok: false, error: "too_large", maxBytes }, { status: 413 });
  }

  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  const admin = createAdminClient();

  // Sum existing media to enforce per-user storage cap.
  const { data: existing } = await admin
    .from("vcard_media")
    .select("size_bytes")
    .eq("user_id", user.id);
  const used = (existing ?? []).reduce((acc, r) => acc + Number(r.size_bytes ?? 0), 0);
  if (used + body.sizeBytes > ent.storageBytes) {
    return NextResponse.json({ ok: false, error: "storage_quota_exceeded" }, { status: 413 });
  }

  const bucket = body.visibility === "private" ? "vcard-private" : "vcard-public";
  const ts = Date.now();
  const path = `${user.id}/${ts}-${safeFilename(body.filename)}`;

  const { data, error } = await admin.storage.from(bucket).createSignedUploadUrl(path);
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "sign_failed" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    bucket,
    path,
    token: data.token,
    signedUrl: data.signedUrl,
    maxBytes,
  });
}
