// Visitor theme switch (e.g. light/dark). Persisted as a marker block in
// customCss, like the Style Studio block, so no DB migration is needed.

import { THEME_PRESETS, getThemePreset, type ThemePreset } from "@/lib/themes/presets";

export type ThemeSwitchDefault = "owner" | "system";

export type ThemeSwitchSettings = {
  enabled: boolean;
  altThemeId: string;
  /** "owner": start on the profile's theme; "system": follow the visitor's device setting. */
  defaultMode: ThemeSwitchDefault;
};

const MARKER_OPEN = "/* vc:theme-switch";
const MARKER_CLOSE = "*/";

function luminance(hex: string) {
  const m = hex.replace("#", "");
  const full = m.length === 3 ? m.split("").map((c) => c + c).join("") : m.slice(0, 6);
  const n = Number.parseInt(full, 16);
  if (!Number.isFinite(n)) return 0;
  const channel = (v: number) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel((n >> 16) & 255) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255);
}

export function isLightTheme(theme: ThemePreset) {
  return luminance(theme.preview.bg) > 0.5;
}

/** The first preset with the opposite brightness — a sensible default partner. */
export function suggestAltTheme(primaryId: string): string {
  const primary = getThemePreset(primaryId);
  const wantLight = !isLightTheme(primary);
  return THEME_PRESETS.find((theme) => theme.id !== primary.id && isLightTheme(theme) === wantLight)?.id ?? THEME_PRESETS[0].id;
}

export function normalizeThemeSwitch(input: Partial<ThemeSwitchSettings> | null | undefined, primaryId: string): ThemeSwitchSettings {
  const altValid = typeof input?.altThemeId === "string" && THEME_PRESETS.some((theme) => theme.id === input.altThemeId);
  return {
    enabled: input?.enabled === true,
    altThemeId: altValid ? (input!.altThemeId as string) : suggestAltTheme(primaryId),
    defaultMode: input?.defaultMode === "system" ? "system" : "owner",
  };
}

export function readThemeSwitch(css: string, primaryId: string): { settings: ThemeSwitchSettings; rest: string } {
  const start = css.indexOf(MARKER_OPEN);
  const end = start === -1 ? -1 : css.indexOf(MARKER_CLOSE, start + MARKER_OPEN.length);
  if (start === -1 || end === -1) return { settings: normalizeThemeSwitch(null, primaryId), rest: css };
  let parsed: Partial<ThemeSwitchSettings> | null = null;
  try {
    parsed = JSON.parse(css.slice(start + MARKER_OPEN.length, end).trim()) as Partial<ThemeSwitchSettings>;
  } catch {
    parsed = null;
  }
  const rest = (css.slice(0, start) + css.slice(end + MARKER_CLOSE.length)).trim();
  return { settings: normalizeThemeSwitch(parsed, primaryId), rest };
}

export function writeThemeSwitch(settings: ThemeSwitchSettings, rest: string, primaryId: string): string {
  const normalized = normalizeThemeSwitch(settings, primaryId);
  const trimmed = rest.trim();
  // Preset ids are validated against the known list, so the JSON can never contain "*/".
  const block = `${MARKER_OPEN} ${JSON.stringify(normalized)} ${MARKER_CLOSE}`;
  return trimmed ? `${block}\n\n${trimmed}` : block;
}

export const ALT_THEME_SELECTOR = '.vc-profile-shell[data-vc-theme="alt"], .vc-profile-shell[data-vc-theme="alt"] .vc-profile';

/**
 * Inline pre-paint script: applies the visitor's saved choice (or their
 * device preference) before first paint, avoiding a theme flash.
 */
export function themeSwitchBootScript(handle: string, settings: ThemeSwitchSettings, altIsLight: boolean) {
  const key = JSON.stringify(`vc-theme:${handle}`).replace(/</g, "\\u003c");
  const system = settings.defaultMode === "system";
  const query = JSON.stringify(`(prefers-color-scheme: ${altIsLight ? "light" : "dark"})`);
  return `(function(){try{var s=document.currentScript&&document.currentScript.closest(".vc-profile-shell");if(!s)return;var v=localStorage.getItem(${key});var a=v?v==="alt":${system ? `window.matchMedia(${query}).matches` : "false"};if(a)s.setAttribute("data-vc-theme","alt")}catch(e){}})();`;
}
