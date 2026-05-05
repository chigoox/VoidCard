"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireUser } from "@/lib/auth";
import { audit } from "@/lib/audit";
import { entitlementsFor } from "@/lib/entitlements";
import { createClient } from "@/lib/supabase/server";
import { detachProjectDomain } from "@/lib/vercel-domains";

const HostnameSchema = z
  .string()
  .trim()
  .min(3)
  .max(255)
  .regex(
    /^(?=.{1,255}$)(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/,
    "invalid_hostname"
  );

function rootHost() {
  return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "https://vcard.ed5enterprise.com").hostname.toLowerCase();
}

function normalizeHostname(raw: string) {
  const normalized = raw.trim().toLowerCase().replace(/\.+$/, "");
  const parsed = HostnameSchema.safeParse(normalized);
  if (!parsed.success) return null;
  if (parsed.data === rootHost()) return null;
  if (parsed.data.endsWith(".vercel.app")) return null;
  if (/^\d{1,3}(?:\.\d{1,3}){3}$/.test(parsed.data)) return null;
  return parsed.data;
}

function redirectWith(state: Record<string, string>): never {
  const qs = new URLSearchParams(state).toString();
  redirect(`/account/domains${qs ? `?${qs}` : ""}`);
}

export async function addCustomDomainAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const entitlements = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (!entitlements.customDomain) redirectWith({ error: "upgrade_required" });

  const hostname = normalizeHostname(String(formData.get("hostname") ?? ""));
  if (!hostname) redirectWith({ error: "invalid_hostname" });

  const apex = formData.get("apex") === "on";
  if (apex && !user.verified) redirectWith({ error: "verified_badge_required" });

  const sb = await createClient();
  const token = crypto.randomUUID();

  const { data, error } = await sb
    .from("vcard_custom_domains")
    .insert({
      user_id: user.id,
      hostname,
      apex,
      status: "pending",
      txt_token: token,
      ssl_status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    const isTaken = error.code === "23505";
    redirectWith({ error: isTaken ? "hostname_taken" : "save_failed" });
  }

  if (!data?.id) redirectWith({ error: "save_failed" });

  await audit({
    action: "domain.create",
    actorId: user.id,
    targetKind: "vcard_custom_domains",
    targetId: data.id,
    diff: { hostname, apex },
  });

  revalidatePath("/account");
  revalidatePath("/account/domains");
  redirectWith({ ok: "domain_added" });
}

export async function removeCustomDomainAction(formData: FormData): Promise<void> {
  const user = await requireUser();
  const entitlements = entitlementsFor(user.plan, { extraStorageBytes: user.bonusStorageBytes });
  if (!entitlements.customDomain) redirectWith({ error: "upgrade_required" });

  const id = String(formData.get("id") ?? "").trim();
  if (!id) redirectWith({ error: "invalid_domain" });

  const sb = await createClient();
  const { data: existing } = await sb
    .from("vcard_custom_domains")
    .select("id, hostname")
    .eq("id", id)
    .maybeSingle();

  if (!existing?.hostname) redirectWith({ error: "invalid_domain" });

  try {
    await detachProjectDomain(existing.hostname);
  } catch {
    redirectWith({ error: "detach_failed" });
  }

  const { error } = await sb.from("vcard_custom_domains").delete().eq("id", id);
  if (error) redirectWith({ error: "delete_failed" });

  await audit({
    action: "domain.delete",
    actorId: user.id,
    targetKind: "vcard_custom_domains",
    targetId: id,
    diff: { hostname: existing.hostname },
  });

  revalidatePath("/account");
  revalidatePath("/account/domains");
  redirectWith({ ok: "domain_removed" });
}