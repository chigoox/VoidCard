import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { Sections } from "@/lib/sections/types";
import { entitlementsFor } from "@/lib/entitlements";
import { findPublicProfileByUsername } from "@/lib/profiles";
import { getThemePreset, themeToCss } from "@/lib/themes/presets";

export const runtime = "edge";
export const dynamic = "force-dynamic";
export const revalidate = 0;

const shellStyle: CSSProperties = {
  background: "transparent",
  color: "var(--vc-fg, #f7f3ea)",
};

type Mode = "card" | "button" | "full";

function modeFrom(value: string | string[] | undefined): Mode {
  const v = Array.isArray(value) ? value[0] : value;
  if (v === "button" || v === "full") return v;
  return "card";
}

function themeId(theme: unknown): string | null {
  if (theme && typeof theme === "object" && "id" in theme) {
    const id = (theme as { id?: unknown }).id;
    if (typeof id === "string") return id;
  }
  return null;
}

function customFontCss(url: string | null | undefined) {
  if (!url) return "";
  if (url.startsWith("https://fonts.googleapis.com/css2?")) {
    const family = googleFontFamilyFromUrl(url);
    if (!family) return "";
    return `@import url('${url}');.vc-profile{font-family:'${family}',inherit}`;
  }
  const safe = url.replace(/[^a-zA-Z0-9:/.\-_?=&%#+]/g, "");
  return `@font-face{font-family:'VC Custom';src:url('${safe}');font-display:swap}.vc-profile{font-family:'VC Custom',inherit}`;
}

function googleFontFamilyFromUrl(url: string) {
  try {
    const family = new URL(url).searchParams.get("family")?.split(":")[0]?.replace(/\+/g, " ").trim();
    return family?.replace(/[^a-zA-Z0-9\s-]/g, "") || null;
  } catch {
    return null;
  }
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ username: string }>;
}): Promise<Metadata> {
  const { username } = await params;
  return {
    title: `@${username} — VoidCard embed`,
    robots: { index: false, follow: false },
  };
}

export default async function EmbedProfilePage({
  params,
  searchParams,
}: {
  params: Promise<{ username: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { username } = await params;
  const sp = searchParams ? await searchParams : {};
  const mode = modeFrom(sp.mode);
  const profile = await findPublicProfileByUsername(username);
  if (!profile) notFound();

  const handle = profile.username ?? username.toLowerCase();
  const displayName = profile.displayName?.trim() || `@${handle}`;
  const entitlements = entitlementsFor(profile.plan ?? "free", {
    extraStorageBytes: Number(profile.bonusStorageBytes ?? 0),
  });
  const passwordProtected = entitlements.passwordProtected && !!profile.passwordHash;

  const parsed = Sections.safeParse(profile.sections);
  const sections = parsed.success ? parsed.data : [];

  const themeCss = themeToCss(
    getThemePreset(themeId(profile.theme)),
    ".vc-embed-shell, .vc-profile",
  );
  const profileUrl = `/u/${handle}`;

  const resizeScript = `(function(){function s(){try{var h=document.documentElement.scrollHeight;parent.postMessage({type:"voidcard:resize",height:h},"*");}catch(e){}}window.addEventListener("load",s);window.addEventListener("resize",s);if(typeof ResizeObserver!=="undefined"){try{new ResizeObserver(s).observe(document.body);}catch(e){}}setTimeout(s,200);setTimeout(s,800);})();`;

  if (passwordProtected) {
    return (
      <main className="vc-embed-shell vc-profile min-h-[180px] p-4" style={shellStyle}>
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        <a
          href={profileUrl}
          target="_top"
          rel="noopener"
          className="btn-gold inline-flex w-full items-center justify-center rounded-2xl px-4 py-3 text-sm font-semibold"
          data-testid="embed-protected-cta"
        >
          Open @{handle} on VoidCard
        </a>
        <script dangerouslySetInnerHTML={{ __html: resizeScript }} />
      </main>
    );
  }

  if (mode === "button") {
    return (
      <main className="vc-embed-shell vc-profile p-2" style={shellStyle} data-testid="embed-button">
        <style dangerouslySetInnerHTML={{ __html: themeCss }} />
        <a
          href={profileUrl}
          target="_top"
          rel="noopener"
          className="btn-gold inline-flex w-full items-center justify-center rounded-pill px-5 py-3 text-sm font-semibold"
        >
          Connect with {displayName}
        </a>
        <script dangerouslySetInnerHTML={{ __html: resizeScript }} />
      </main>
    );
  }

  const visibleSections = mode === "card" ? sections.slice(0, 4) : sections;

  return (
    <main className="vc-embed-shell min-h-[120px]" style={shellStyle} data-testid={`embed-${mode}`}>
      <style dangerouslySetInnerHTML={{ __html: themeCss }} />
      <style dangerouslySetInnerHTML={{ __html: customFontCss(profile.customFontUrl) }} />
      <div className="mx-auto max-w-md p-4 vc-profile">
        <header className="mb-4 flex items-center gap-3">
          {profile.avatarUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profile.avatarUrl}
              alt=""
              width={48}
              height={48}
              className="h-12 w-12 rounded-full object-cover"
            />
          ) : null}
          <div className="min-w-0 flex-1">
            <a
              href={profileUrl}
              target="_top"
              rel="noopener"
              className="block truncate font-display text-base"
              style={{ color: "var(--vc-fg, #f7f3ea)" }}
            >
              {displayName}
            </a>
            <span className="block truncate text-xs opacity-70">@{handle}</span>
          </div>
        </header>
        <div className="space-y-2">
          {visibleSections.map((section, idx) => (
            <SectionRenderer key={section.id} section={section} verified={profile.verified} isTop={idx === 0} />
          ))}
        </div>
        {mode === "card" && sections.length > 4 ? (
          <a
            href={profileUrl}
            target="_top"
            rel="noopener"
            className="mt-3 block text-center text-xs underline"
            style={{ color: "var(--vc-accent, #d4af37)" }}
          >
            View full profile →
          </a>
        ) : null}
        {!profile.removeBranding && (
          <p className="mt-4 text-center text-[10px] uppercase tracking-widest opacity-60">
            <a href="https://vcard.ed5enterprise.com" target="_top" rel="noopener">
              Powered by VoidCard
            </a>
          </p>
        )}
      </div>
      <script dangerouslySetInnerHTML={{ __html: resizeScript }} />
    </main>
  );
}
