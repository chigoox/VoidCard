import type { CSSProperties } from "react";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { ProfileStack } from "@/components/sections/ProfileStack";
import { DesignFx } from "@/components/sections/DesignFx";
import type { ShowcaseTemplate } from "@/lib/editor/showcaseTemplates";
import { applyDesktopPreset, desktopLayoutCss, normalizeDesktopSettings } from "@/lib/sections/desktopLayout";
import { getThemePreset, themeToCss } from "@/lib/themes/presets";
import { Sections } from "@/lib/sections/types";

const column: CSSProperties = { width: "100%", maxWidth: "min(100%, var(--vc-max-width, 480px))", background: "transparent", color: "var(--vc-fg, #f7f3ea)" };

/** Renders a designed template the way a published profile shows it. */
export function ShowcaseProfile({ template, handle }: { template: ShowcaseTemplate; handle: string }) {
  const { preset, ...desktop } = template.desktop;
  const settings = normalizeDesktopSettings({ ...desktop, enabled: true });
  const sections = Sections.parse(applyDesktopPreset(template.build(handle), preset, settings.rowHeight));

  return (
    <main className="vc-profile-shell home-theme vc-desktop-on min-h-screen">
      <style dangerouslySetInnerHTML={{ __html: themeToCss(getThemePreset(template.themeId), ".vc-profile-shell, .vc-profile") }} />
      <style dangerouslySetInnerHTML={{ __html: desktopLayoutCss(settings) }} />
      <DesignFx />
      <div className="vc-profile mx-auto px-4 pb-32 pt-8 sm:px-6 sm:pt-10" style={column}>
        <ProfileStack
          sections={sections}
          settings={settings}
          renderSection={(s, i) => <SectionRenderer key={s.id} section={s} isTop={i === 0} username={handle} />}
        />
      </div>
    </main>
  );
}

function luminance(hex: string) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex.trim());
  if (!m) return 0.5;
  const n = Number.parseInt(m[1]!, 16);
  const [r, g, b] = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) => {
    const v = c / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

/** Cover media and a button colour that reads on the dark gallery cards. */
export function showcaseCover(template: ShowcaseTemplate) {
  const header = template.build("example").find((s) => s.type === "header");
  const themeAccent = getThemePreset(template.themeId).vars["--vc-accent"] ?? "#d4af37";
  // Near-black accents (e.g. ivory-noir) vanish on a dark card; fall back to ivory.
  const accent = luminance(themeAccent) < 0.12 ? "#f5f1e8" : themeAccent;
  if (header?.type !== "header") return { image: undefined, video: undefined, tagline: "", accent };
  return { image: header.props.coverUrl, video: header.props.coverVideoUrl, tagline: header.props.tagline ?? "", accent };
}
