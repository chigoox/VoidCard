import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { publicAssetUrl } from "@/lib/cdn";
import { entitlementsFor } from "@/lib/entitlements";
import { rateLimits } from "@/lib/rate-limit";
import { spendCredits, grantCredits, getAiSettings, getBalance } from "@/lib/credits";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  prompt: z.string().min(3).max(800),
  size: z.enum(["1024x1024", "1024x1792", "1792x1024"]).default("1024x1024"),
});

const OPENAI_URL = "https://api.openai.com/v1/images/generations";
const OPENAI_MODEL = process.env.OPENAI_IMAGE_MODEL || "gpt-image-1";

export async function POST(req: Request) {
  const user = await requireUser();

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ ok: false, error: "ai_disabled" }, { status: 503 });
  }

  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  // Rate limit per user.
  const rl = await rateLimits.aiGenerate.limit(`ai_gen:${user.id}`);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  // Storage cap pre-check.
  const ent = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("vcard_media")
    .select("size_bytes")
    .eq("user_id", user.id);
  const used = (existing ?? []).reduce((acc, r) => acc + Number(r.size_bytes ?? 0), 0);
  // Estimate ~3 MB per generated PNG; reject pre-emptively.
  if (used + 3 * 1024 * 1024 > ent.storageBytes) {
    return NextResponse.json({ ok: false, error: "storage_quota_exceeded" }, { status: 413 });
  }

  // Spend credits.
  const settings = await getAiSettings();
  const cost = settings.costPerImage;
  const spend = await spendCredits(user.id, cost, undefined, { prompt: body.prompt.slice(0, 200), size: body.size });
  if (!spend.ok) {
    return NextResponse.json({ ok: false, error: spend.error }, { status: 402 });
  }

  // Generate via OpenAI.
  let imageBuffer: Buffer;
  try {
    const resp = await fetch(OPENAI_URL, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        prompt: body.prompt,
        size: body.size,
        n: 1,
      }),
    });
    if (!resp.ok) {
      const errText = await resp.text().catch(() => "");
      // Refund the credit since the call failed.
      await grantCredits(user.id, cost, "refund", undefined, { reason: "openai_error", status: resp.status, body: errText.slice(0, 500) });
      return NextResponse.json(
        { ok: false, error: "ai_failed", detail: errText.slice(0, 200) },
        { status: 502 },
      );
    }
    const json = (await resp.json()) as { data?: Array<{ b64_json?: string; url?: string }> };
    const item = json.data?.[0];
    if (item?.b64_json) {
      imageBuffer = Buffer.from(item.b64_json, "base64");
    } else if (item?.url) {
      const fetched = await fetch(item.url);
      const ab = await fetched.arrayBuffer();
      imageBuffer = Buffer.from(ab);
    } else {
      await grantCredits(user.id, cost, "refund", undefined, { reason: "no_image_data" });
      return NextResponse.json({ ok: false, error: "ai_failed" }, { status: 502 });
    }
  } catch (err) {
    await grantCredits(user.id, cost, "refund", undefined, { reason: "network", message: (err as Error).message });
    return NextResponse.json({ ok: false, error: "ai_failed" }, { status: 502 });
  }

  // Upload to public bucket.
  const ts = Date.now();
  const path = `${user.id}/ai-${ts}.png`;
  const bucket = "vcard-public";
  const { error: upErr } = await admin.storage.from(bucket).upload(path, imageBuffer, {
    contentType: "image/png",
    upsert: false,
  });
  if (upErr) {
    await grantCredits(user.id, cost, "refund", undefined, { reason: "storage_upload_failed" });
    return NextResponse.json({ ok: false, error: "storage_failed" }, { status: 500 });
  }

  // Insert media row.
  const { data: media, error: insErr } = await admin
    .from("vcard_media")
    .insert({
      user_id: user.id,
      bucket,
      storage_path: path,
      kind: "image",
      mime: "image/png",
      size_bytes: imageBuffer.byteLength,
      source: "ai",
      prompt: body.prompt.slice(0, 1000),
    })
    .select("id, storage_path, created_at")
    .single();
  if (insErr || !media) {
    return NextResponse.json({ ok: false, error: "insert_failed" }, { status: 500 });
  }

  const { data: pub } = admin.storage.from(bucket).getPublicUrl(path);
  const url = publicAssetUrl(pub.publicUrl);
  const balance = await getBalance(user.id);

  return NextResponse.json({
    ok: true,
    media: {
      id: media.id,
      kind: "image" as const,
      mime: "image/png",
      url,
      createdAt: media.created_at,
      source: "ai" as const,
      prompt: body.prompt,
    },
    creditsRemaining: balance.balance,
  });
}
