import { NextResponse } from "next/server";
import { getUser } from "@/lib/auth";
import { entitlementsFor } from "@/lib/entitlements";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

function newKey() {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  return `vk_${hex}`;
}

export async function GET() {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "auth" }, { status: 401 });
  const sb = createAdminClient();
  const { data } = await sb
    .from("vcard_api_keys")
    .select("id, name, prefix, scopes, last_used_at, revoked_at, created_at")
    .eq("user_id", u.id)
    .order("created_at", { ascending: false });
  return NextResponse.json({ keys: data ?? [] });
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "auth" }, { status: 401 });
  if (!entitlementsFor(u.plan, { extraStorageBytes: u.bonusStorageBytes }).apiAccess) {
    return NextResponse.json({ error: "pro_required" }, { status: 403 });
  }
  const body = (await req.json().catch(() => ({}))) as { name?: string; scopes?: string[] };
  const name = (body.name ?? "Untitled key").slice(0, 80);
  const scopes = Array.isArray(body.scopes) && body.scopes.length ? body.scopes.slice(0, 8) : ["read"];
  const key = newKey();
  const prefix = key.slice(0, 8);
  const hash = await sha256(key);
  const sb = createAdminClient();
  const { data, error } = await sb
    .from("vcard_api_keys")
    .insert({ user_id: u.id, name, prefix, hash, scopes })
    .select("id, prefix, name, scopes, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ key, ...data }, { status: 201 });
}

export async function DELETE(req: Request) {
  const u = await getUser();
  if (!u) return NextResponse.json({ error: "auth" }, { status: 401 });
  const url = new URL(req.url);
  const id = url.searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  const sb = createAdminClient();
  const { error } = await sb
    .from("vcard_api_keys")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", u.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
