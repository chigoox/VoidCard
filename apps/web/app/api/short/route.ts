import { NextResponse } from "next/server";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

const Body = z.object({
  target: z.string().url().max(2048),
  code: z.string().regex(/^[a-z0-9-]{3,32}$/).optional(),
});

function randomCode(len = 7) {
  const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
  let out = "";
  for (let i = 0; i < len; i++) out += alphabet[Math.floor(Math.random() * alphabet.length)];
  return out;
}

export async function POST(req: Request) {
  const u = await requireUser();
  let payload: unknown;
  try { payload = await req.json(); } catch { return NextResponse.json({ error: "invalid_body" }, { status: 400 }); }
  const parsed = Body.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "invalid" }, { status: 400 });

  const sb = await createClient();
  let code = parsed.data.code ?? randomCode();
  // Try a few times to avoid collisions on auto-generated codes.
  for (let i = 0; i < 4; i++) {
    const { data: existing } = await sb.from("vcard_shortlinks").select("id").eq("code", code).maybeSingle();
    if (!existing) break;
    if (parsed.data.code) return NextResponse.json({ error: "code_taken" }, { status: 409 });
    code = randomCode();
  }

  const { error } = await sb.from("vcard_shortlinks").insert({
    user_id: u.id,
    code,
    target: parsed.data.target,
    hits: 0,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, code });
}
