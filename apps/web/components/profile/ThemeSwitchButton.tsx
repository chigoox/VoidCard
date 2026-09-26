"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

/** Floating light/dark toggle on the public profile. */
export function ThemeSwitchButton({
  handle,
  primaryIsLight,
  altIsLight,
  followSystem,
}: {
  handle: string;
  primaryIsLight: boolean;
  altIsLight: boolean;
  followSystem: boolean;
}) {
  const [alt, setAlt] = useState<boolean | null>(null);

  useEffect(() => {
    // The boot script normally applies the saved theme before paint. Inline
    // scripts don't run on client-side navigation, so apply it here too.
    const shell = document.querySelector(".vc-profile-shell");
    if (shell && !shell.hasAttribute("data-vc-theme")) {
      let saved: string | null = null;
      try { saved = window.localStorage.getItem(`vc-theme:${handle}`); } catch {}
      const wantAlt = saved
        ? saved === "alt"
        : followSystem && window.matchMedia(`(prefers-color-scheme: ${altIsLight ? "light" : "dark"})`).matches;
      if (wantAlt) shell.setAttribute("data-vc-theme", "alt");
    }
    const frame = requestAnimationFrame(() => setAlt(shell?.getAttribute("data-vc-theme") === "alt"));
    return () => cancelAnimationFrame(frame);
  }, [altIsLight, followSystem, handle]);

  function toggle() {
    const shell = document.querySelector(".vc-profile-shell");
    if (!shell) return;
    const next = !(shell.getAttribute("data-vc-theme") === "alt");
    if (next) shell.setAttribute("data-vc-theme", "alt");
    else shell.removeAttribute("data-vc-theme");
    try { window.localStorage.setItem(`vc-theme:${handle}`, next ? "alt" : "primary"); } catch {}
    setAlt(next);
  }

  const currentIsLight = alt ? altIsLight : primaryIsLight;
  const label = currentIsLight ? "Switch to dark theme" : "Switch to light theme";

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={label}
      title={label}
      className="fixed right-4 top-4 z-40 grid size-10 place-items-center rounded-full border backdrop-blur-md transition hover:scale-105"
      style={{
        top: "max(1rem, env(safe-area-inset-top))",
        background: "color-mix(in srgb, var(--vc-bg-2, #141414) 70%, transparent)",
        borderColor: "color-mix(in srgb, var(--vc-fg, #f7f3ea) 16%, transparent)",
        color: "var(--vc-fg, #f7f3ea)",
        opacity: alt === null ? 0 : 1,
      }}
      data-testid="theme-switch"
    >
      {currentIsLight ? <Moon className="size-4" aria-hidden /> : <Sun className="size-4" aria-hidden />}
    </button>
  );
}
