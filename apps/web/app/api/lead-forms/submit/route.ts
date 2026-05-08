import { NextResponse } from "next/server";
import { z } from "zod";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbEncryptionKey } from "@/lib/db-encryption";
import { hashIpEdge } from "@/lib/ip-hash-edge";
import { rateLimits } from "@/lib/rate-limit";
import { verifyTurnstile } from "@/lib/turnstile";
import { sanitizeText } from "@/lib/sanitize";
import { queueWebhookEvent } from "@/lib/webhook-queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const Body = z.object({
  formId: z.string().uuid(),
  payload: z.record(z.string(), z.unknown()),
  email: z.string().email().optional(),
  phone: z.string().min(3).max(40).optional(),
  source: z.enum(["profile", "exchange", "embed", "api"]).default("profile"),
  turnstileToken: z.string().optional(),
});

function sanitizePayload(p: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(p)) {
    const key = sanitizeText(k, 60);
    if (!key) continue;
    if (typeof v === "string") out[key] = sanitizeText(v, 2000);
    else if (typeof v === "number" || typeof v === "boolean") out[key] = v;
    // drop nested objects/arrays for safety
  }
  return out;
}

export async function POST(req: Request) {
  let body: z.infer<typeof Body>;
  try {
    body = Body.parse(await req.json());
  } catch {
    return NextResponse.json({ ok: false, error: "bad_request" }, { status: 400 });
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";

  const rl = await rateLimits.contactForm.limit(`leadform:${ip}:${body.formId}`);
  if (!rl.success) {
    return NextResponse.json({ ok: false, error: "rate_limited" }, { status: 429 });
  }

  const admin = createAdminClient();

  // Look up form + ensure it's enabled.
  const { data: form } = await admin
    .from("vcard_lead_forms")
    .select("id, owner_id, enabled, require_captcha")
    .eq("id", body.formId)
    .maybeSingle();
  if (!form || !form.enabled) {
    return NextResponse.json({ ok: false, error: "form_not_found" }, { status: 404 });
  }

  if (form.require_captcha) {
    const cap = await verifyTurnstile(body.turnstileToken, ip);
    if (!cap.success) {
      return NextResponse.json({ ok: false, error: "captcha_failed" }, { status: 400 });
    }
  }

  const ipHash = await hashIpEdge(ip);
  const ua = req.headers.get("user-agent")?.slice(0, 500) ?? null;

  const { error } = await admin.rpc("vcard_insert_form_submission_secure", {
    p_form_id: form.id,
    p_owner_id: form.owner_id,
    p_payload: sanitizePayload(body.payload),
    p_email: body.email ?? null,
    p_phone: body.phone ?? null,
    p_ip_hash: ipHash,
    p_ua: ua,
    p_source: body.source,
    p_status: "new",
    p_encryption_key: getDbEncryptionKey(),
  });

  if (error) {
    return NextResponse.json({ ok: false, error: "internal" }, { status: 500 });
  }

  void queueWebhookEvent(form.owner_id, "contact.captured", {
    form_id: form.id,
    source: body.source,
    email: body.email ?? null,
    phone: body.phone ?? null,
    payload: sanitizePayload(body.payload),
    created_at: new Date().toISOString(),
  }).catch(() => null);

  return NextResponse.json({ ok: true });
}
