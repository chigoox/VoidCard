"use server";

import { headers } from "next/headers";
import { recordConsent } from "@/lib/dsr";
import { hashIpDaily } from "@/lib/ip-salt";
import { createClient } from "@/lib/supabase/server";

export const POLICY_VERSION = "2026-05-01";

export async function saveConsentAction(input: {
  cookieId: string;
  analytics: boolean;
  marketing: boolean;
}) {
  const sb = await createClient();
  const { data: { user } } = await sb.auth.getUser();
  const h = await headers();
  const ip =
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? h.get("x-real-ip") ?? null;
  const ua = h.get("user-agent")?.slice(0, 500) ?? null;
  await recordConsent({
    userId: user?.id ?? null,
    cookieId: input.cookieId,
    choice: { essential: true, analytics: input.analytics, marketing: input.marketing },
    policyVersion: POLICY_VERSION,
    ipHash: await hashIpDaily(ip),
    ua,
  });
  return { ok: true };
}
