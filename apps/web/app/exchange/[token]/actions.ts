"use server";

import { z } from "zod";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getDbEncryptionKey } from "@/lib/db-encryption";
import { rateLimits } from "@/lib/rate-limit";
import { hashIpDaily } from "@/lib/ip-salt";

const Schema = z.object({
  token: z.string().min(8).max(120),
  name: z.string().min(1).max(120),
  email: z.string().email().max(200),
  phone: z.string().max(40).optional(),
  company: z.string().max(120).optional(),
  note: z.string().max(500).optional(),
});

export async function exchangeContact(formData: FormData) {
  const parsed = Schema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) throw new Error("invalid input");

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || "0.0.0.0";
  const ipHash = (await hashIpDaily(ip)) ?? "unknown";

  const rl = await rateLimits.exchange.limit(`exchange:${ipHash}`);
  if (!rl.success) throw new Error("Too many requests. Try again later.");

  const sb = createAdminClient();

  // Verify token: must exist, not expired, not consumed.
  const { data: row } = await sb
    .from("vcard_exchange_tokens")
    .select("id, user_id, expires_at, consumed_at")
    .eq("token", parsed.data.token)
    .maybeSingle();

  if (!row) throw new Error("Invalid token.");
  if (row.consumed_at) throw new Error("Link already used.");
  if (new Date(row.expires_at).getTime() < Date.now()) throw new Error("Link expired.");

  // Mark consumed (best-effort race protection by checking consumed_at is null).
  const { error: consumeErr, data: consumed } = await sb
    .from("vcard_exchange_tokens")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", row.id)
    .is("consumed_at", null)
    .select("id")
    .maybeSingle();
  if (consumeErr || !consumed) throw new Error("Link already used.");

  // Insert contact for the owner.
  const { error: insertErr } = await sb.rpc("vcard_insert_contact_secure", {
    p_owner_id: row.user_id,
    p_source: "exchange",
    p_name: parsed.data.name,
    p_email: parsed.data.email,
    p_phone: parsed.data.phone ?? null,
    p_company: parsed.data.company ?? null,
    p_note: parsed.data.note ?? null,
    p_raw: { ip_hash: ipHash, ua: h.get("user-agent")?.slice(0, 200) ?? null },
    p_encryption_key: getDbEncryptionKey(),
  });
  if (insertErr) throw new Error("Could not save contact.");

  redirect(`/exchange/${parsed.data.token}/done`);
}
