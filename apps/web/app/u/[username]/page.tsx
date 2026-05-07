import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { cookies, headers } from "next/headers";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { Sections } from "@/lib/sections/types";
import { buildMetadata, SITE_URL } from "@/lib/seo";
import { jsonLdScript, person } from "@/lib/jsonld";
import { entitlementsFor } from "@/lib/entitlements";
import { findPublicProfileByUsername } from "@/lib/profiles";
import {
  profileUnlockCookieName,
  verifyProfileUnlockCookieValue,
} from "@/lib/profile-password";
import { queueWebhookEvent } from "@/lib/webhook-queue";
import { getThemePreset, themeToCss } from "@/lib/themes/presets";

export const runtime = "edge";
export const revalidate = 60;

const profileShellStyle: CSSProperties = {
  background: "linear-gradient(180deg, var(--vc-bg, #0a0a0a) 0%, color-mix(in srgb, var(--vc-bg-2, #141414) 72%, var(--vc-bg, #0a0a0a)) 100%)",
  color: "var(--vc-fg, #f7f3ea)",
};

async function fetchPublicProfileMeta(username: string) {
  return findPublicProfileByUsername(username);
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  const profile = await fetchPublicProfileMeta(username);
  const handle = profile?.username ?? username.toLowerCase();
  const name = profile?.displayName?.trim() || `@${handle}`;
  const entitlements = entitlementsFor(profile?.plan ?? "free", {
    extraStorageBytes: Number(profile?.bonusStorageBytes ?? 0),
  });
  const isPasswordProtected = entitlements.passwordProtected && !!profile?.passwordHash;
  const description = isPasswordProtected
    ? `Protected VoidCard profile for @${handle}.`
    : profile?.bio?.slice(0, 200) || `${name} on VoidCard. NFC business card + living profile.`;
  const noindex = profile?.isIndexable === false;

  return buildMetadata({
    title: isPasswordProtected ? `Protected profile (@${handle})` : `${name} (@${handle})`,
    description,
    path: `/u/${handle}`,
    type: "profile",
    noindex,
    modifiedAt: profile?.updatedAt ?? undefined,
  });
}

export default async function PublicProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const profile = await findPublicProfileByUsername(username);

  if (!profile) notFound();

  const handle = profile.username ?? username.toLowerCase();
  const entitlements = entitlementsFor(profile.plan ?? "free", {
    extraStorageBytes: Number(profile.bonusStorageBytes ?? 0),
  });
  const passwordHash = typeof profile.passwordHash === "string" ? profile.passwordHash : null;
  const isPasswordProtected = entitlements.passwordProtected && !!passwordHash;
  const cookieStore = await cookies();
  const isUnlocked =
    !isPasswordProtected ||
    (await verifyProfileUnlockCookieValue(
      handle,
      passwordHash as string,
      cookieStore.get(profileUnlockCookieName(handle))?.value,
    ));

  const displayName = profile.displayName?.trim() || `@${handle}`;

  if (!isUnlocked) {
    const unlockState =
      resolvedSearchParams && typeof resolvedSearchParams.unlock === "string"
        ? resolvedSearchParams.unlock
        : null;
    return (
      <main className="vc-profile-shell home-theme min-h-screen" style={profileShellStyle}>
        <style dangerouslySetInnerHTML={{ __html: themeToCss(getThemePreset(themeId(profile.theme)), ".vc-profile-shell, .vc-profile") }} />
        <style dangerouslySetInnerHTML={{ __html: customFontCss(profile.customFontUrl) }} />
        <div className="mx-auto flex min-h-screen max-w-md items-center px-5 py-10 vc-profile">
          <section className="card w-full space-y-5 p-6">
            <div className="space-y-2 text-center">
              <p className="text-xs uppercase tracking-[0.35em] text-gold/80">Protected profile</p>
              <h1 className="font-display text-3xl text-ivory">{displayName}</h1>
              <p className="text-sm text-ivory-mute">
                Enter the profile password to view @{handle}.
              </p>
            </div>
            <form action={`/u/${handle}/unlock`} method="post" className="space-y-4">
              <input type="hidden" name="next" value={`/u/${handle}`} />
              <label className="block">
                <span className="text-xs uppercase tracking-widest text-ivory-mute">Profile password</span>
                <input
                  type="password"
                  name="password"
                  autoComplete="current-password"
                  required
                  className="mt-1 w-full rounded-pill border border-onyx-600 bg-onyx-900 px-4 py-3 outline-none focus:border-gold/60"
                  data-testid="profile-unlock-password"
                />
              </label>
              {unlockState === "invalid" && (
                <p className="text-sm text-red-300" data-testid="profile-unlock-error">
                  That password did not match this profile.
                </p>
              )}
              {unlockState === "required" && (
                <p className="text-sm text-red-300" data-testid="profile-unlock-error">
                  Enter the profile password to continue.
                </p>
              )}
              <button type="submit" className="btn-gold w-full" data-testid="profile-unlock-submit">
                Unlock profile
              </button>
            </form>
          </section>
        </div>
      </main>
    );
  }

  const h = await headers();
  const variant = profile.isPrimary
    ? await pickVariant(
        profile.ownerUserId,
        h.get("x-forwarded-for") || "",
        h.get("user-agent") || "",
      )
    : null;

  const sectionsRaw = variant?.sections ?? profile.sections;
  const parsed = Sections.safeParse(sectionsRaw);
  const sections = parsed.success ? parsed.data : [];

  const ua = h.get("user-agent") ?? "";
  const ref = h.get("referer") ?? "";
  void recordTap(profile.ownerUserId, "link", ua, ref).catch(() => null);
  if (variant) void incrementVariantViews(variant.id).catch(() => null);

  const linkUrls: string[] = Array.isArray(profile.links)
    ? (profile.links as Array<{ url?: string }>)
        .map((link) => link?.url)
        .filter((url): url is string => typeof url === "string" && /^https?:\/\//.test(url))
    : [];
  const ld = person({
    username: handle,
    name: displayName,
    bio: profile.bio ?? null,
    avatarUrl: profile.avatarUrl ?? null,
    links: linkUrls,
    verified: profile.verified === true,
    modifiedAt: profile.updatedAt ?? null,
  });

  return (
    <main className="vc-profile-shell home-theme min-h-screen" style={profileShellStyle}>
      <style dangerouslySetInnerHTML={{ __html: themeToCss(getThemePreset(themeId(variant?.theme ?? profile.theme)), ".vc-profile-shell, .vc-profile") }} />
      <style dangerouslySetInnerHTML={{ __html: customFontCss(profile.customFontUrl) }} />
      {profile.customCss && (
        <style dangerouslySetInnerHTML={{ __html: sanitizeCss(profile.customCss) }} />
      )}
      <script
        type="application/ld+json"
        // eslint-disable-next-line react/no-danger
        dangerouslySetInnerHTML={jsonLdScript(ld)}
      />
      <link
        rel="alternate"
        type="application/json"
        href={`${SITE_URL}/u/${handle}/data.json`}
      />
      <section aria-label="Profile summary" data-llm="primary" className="sr-only">
        <h1>{displayName}</h1>
        <p>@{handle}</p>
        {profile.bio ? <p>{profile.bio}</p> : null}
      </section>
      <div className="mx-auto max-w-md px-5 pb-24 pt-10 vc-profile" data-testid="profile-public-content">
        <div className="space-y-3">
          {sections.map((section) => (
            <SectionRenderer key={section.id} section={section} verified={profile.verified} username={handle} />
          ))}
        </div>
        {!profile.removeBranding && (
          <p className="mt-12 text-center text-[10px] uppercase tracking-widest" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>
            Powered by <a href="https://vcard.ed5enterprise.com" style={{ color: "var(--vc-accent, #d4af37)" }}>VoidCard</a>
          </p>
        )}
      </div>
    </main>
  );
}

function sanitizeCss(css: string) {
  return css.replace(/@import[^;]+;/gi, "").replace(/javascript:/gi, "").replace(/expression\s*\(/gi, "");
}

function themeId(theme: unknown): string | null {
  if (theme && typeof theme === "object" && "id" in theme) {
    const id = (theme as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return null;
}

function customFontCss(url: string | null) {
  if (!url || !/^https?:\/\/.+\.woff2(?:\?.*)?$/i.test(url)) return "";
  return `@font-face { font-family: 'VCUserFont'; src: url('${url}') format('woff2'); font-display: swap; } .vc-profile-shell, .vc-profile { font-family: 'VCUserFont', inherit; }`;
}

async function recordTap(userId: string, source: string, ua: string, ref: string) {
  const admin = createAdminClient();
  const ipHash = "edge";
  const uaHash = await sha256(ua);
  await admin.from("vcard_taps").insert({
    user_id: userId,
    source,
    ua_hash: uaHash,
    ip_hash: ipHash,
    referrer: ref,
  });
  await queueWebhookEvent(userId, "tap.created", {
    source,
    referrer: ref,
    created_at: new Date().toISOString(),
  }).catch(() => null);
}

async function sha256(s: string) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(buf)).map((byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 32);
}

type VariantRow = {
  id: string;
  name: string;
  weight: number;
  starts_at: string | null;
  ends_at: string | null;
  sections: unknown;
  theme: unknown;
};

async function pickVariant(userId: string, ip: string, ua: string): Promise<VariantRow | null> {
  const admin = createAdminClient();
  const now = new Date().toISOString();
  const { data } = await admin
    .from("vcard_ab_variants")
    .select("id, name, weight, starts_at, ends_at, sections, theme")
    .eq("user_id", userId)
    .eq("enabled", true);
  const all = (data as VariantRow[] | null) ?? [];
  const active = all.filter((variant) => {
    if (variant.starts_at && variant.starts_at > now) return false;
    if (variant.ends_at && variant.ends_at < now) return false;
    return variant.weight > 0;
  });
  if (active.length === 0) return null;
  const seed = await sha256(`${userId}|${ip}|${ua}`);
  const bucket = parseInt(seed.slice(0, 4), 16) % 100;
  let cumulative = 0;
  for (const variant of active) {
    cumulative += variant.weight;
    if (bucket < cumulative) return variant;
  }
  return null;
}

async function incrementVariantViews(variantId: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("vcard_ab_variants")
    .select("views")
    .eq("id", variantId)
    .maybeSingle();
  if (data) {
    await admin.from("vcard_ab_variants").update({ views: (data.views as number) + 1 }).eq("id", variantId);
  }
}
