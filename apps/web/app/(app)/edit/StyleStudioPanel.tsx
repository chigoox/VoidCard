"use client";
import type { ReactNode } from "react";
import { DEFAULT_STYLE_STUDIO, type StyleStudio } from "@/lib/editor/styleStudio";
import { getThemePreset } from "@/lib/themes/presets";

const INPUT_CLASS_NAME =
  "w-full rounded-card border border-onyx-700 bg-onyx-950 px-3 py-2.5 text-sm text-ivory outline-none transition focus:border-gold/60";

function Field({
  label,
  className,
  children,
}: {
  label: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <label className={["block space-y-1", className ?? ""].join(" ").trim()}>
      <span className="text-[11px] uppercase tracking-[0.25em] text-ivory-mute">{label}</span>
      {children}
    </label>
  );
}

function ColorInput({
  value,
  onChange,
  ariaLabel,
}: {
  value: string;
  onChange: (next: string) => void;
  ariaLabel: string;
}) {
  // <input type="color"> requires a 6-char hex; coerce shorthand and reject bad values silently.
  const safe = /^#[0-9a-f]{6}$/i.test(value) ? value : "#000000";
  return (
    <div className="flex items-center gap-2">
      <input
        type="color"
        value={safe}
        onChange={(e) => onChange(e.target.value)}
        className="h-10 w-14 cursor-pointer rounded border border-onyx-700 bg-onyx-950"
        aria-label={ariaLabel}
      />
      <input
        className={INPUT_CLASS_NAME}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        spellCheck={false}
        maxLength={9}
        placeholder="#000000"
      />
    </div>
  );
}

export default function StyleStudioPanel({
  studio,
  onChange,
  themeId,
}: {
  studio: StyleStudio;
  onChange: (next: StyleStudio) => void;
  themeId?: string;
}) {
  function patch<K extends keyof StyleStudio>(key: K, value: StyleStudio[K]) {
    onChange({ ...studio, [key]: value });
  }
  function seedFromTheme() {
    const preset = getThemePreset(themeId ?? null);
    onChange({
      ...studio,
      customColors: true,
      bg: preset.vars["--vc-bg"] ?? studio.bg,
      bg2: preset.vars["--vc-bg-2"] ?? studio.bg2,
      fg: preset.vars["--vc-fg"] ?? studio.fg,
      fgMute: preset.vars["--vc-fg-mute"] ?? studio.fgMute,
      accent: preset.vars["--vc-accent"] ?? studio.accent,
      accent2: preset.vars["--vc-accent-2"] ?? studio.accent2,
    });
  }
  return (
    <section className="card space-y-3 p-4" data-testid="style-studio">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="text-xs uppercase tracking-widest text-ivory-mute">Style studio</p>
          <p className="mt-1 text-sm text-ivory-dim">Fine-tune the look without writing CSS. Saves alongside your theme.</p>
        </div>
        <button
          type="button"
          className="btn-ghost px-3 py-2 text-xs"
          onClick={() => onChange({ ...DEFAULT_STYLE_STUDIO })}
        >
          Reset
        </button>
      </div>

      <div className="rounded-card border border-onyx-700 bg-onyx-950/60 p-3">
        <label className="flex items-start gap-2 text-sm text-ivory">
          <input
            type="checkbox"
            checked={studio.customColors}
            onChange={(e) => {
              if (e.target.checked) {
                seedFromTheme();
              } else {
                patch("customColors", false);
              }
            }}
            className="mt-1 size-4 rounded border-onyx-700 bg-onyx-950"
            data-testid="style-studio-custom-toggle"
          />
          <span>
            <span className="font-medium">Customize colors</span>
            <span className="block text-xs text-ivory-mute">
              Override the theme palette with your own picks. Toggle off to revert to the selected theme.
            </span>
          </span>
        </label>

        {studio.customColors ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2" data-testid="style-studio-color-grid">
            <Field label="Background">
              <ColorInput value={studio.bg} onChange={(v) => patch("bg", v)} ariaLabel="Background color" />
            </Field>
            <Field label="Surface (cards)">
              <ColorInput value={studio.bg2} onChange={(v) => patch("bg2", v)} ariaLabel="Surface color" />
            </Field>
            <Field label="Text">
              <ColorInput value={studio.fg} onChange={(v) => patch("fg", v)} ariaLabel="Text color" />
            </Field>
            <Field label="Muted text">
              <ColorInput value={studio.fgMute} onChange={(v) => patch("fgMute", v)} ariaLabel="Muted text color" />
            </Field>
            <Field label="Accent">
              <ColorInput value={studio.accent} onChange={(v) => patch("accent", v)} ariaLabel="Accent color" />
            </Field>
            <Field label="Accent (highlight)">
              <ColorInput value={studio.accent2} onChange={(v) => patch("accent2", v)} ariaLabel="Accent highlight color" />
            </Field>
            <button
              type="button"
              className="btn-ghost text-xs sm:col-span-2"
              onClick={seedFromTheme}
            >
              Reseed from current theme
            </button>
          </div>
        ) : (
          <div className="mt-3">
            <Field label="Accent color">
              <ColorInput value={studio.accent} onChange={(v) => patch("accent", v)} ariaLabel="Accent color" />
            </Field>
          </div>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`Corner radius — ${studio.radius}px`}>
          <input type="range" min={0} max={32} value={studio.radius} onChange={(e) => patch("radius", Number(e.target.value))} className="w-full" />
        </Field>
        <Field label={`Section spacing — ${studio.gap}px`}>
          <input type="range" min={0} max={32} value={studio.gap} onChange={(e) => patch("gap", Number(e.target.value))} className="w-full" />
        </Field>
        <Field label={`Max width — ${studio.maxWidth}px`}>
          <input type="range" min={320} max={800} step={20} value={studio.maxWidth} onChange={(e) => patch("maxWidth", Number(e.target.value))} className="w-full" />
        </Field>
        <Field label="Font weight">
          <select className={INPUT_CLASS_NAME} value={studio.fontWeight} onChange={(e) => patch("fontWeight", Number(e.target.value) as StyleStudio["fontWeight"])}>
            {[300, 400, 500, 600, 700].map((w) => <option key={w} value={w}>{w}</option>)}
          </select>
        </Field>
        <Field label="Background">
          <select className={INPUT_CLASS_NAME} value={studio.background} onChange={(e) => patch("background", e.target.value as StyleStudio["background"])}>
            <option value="solid">Solid</option>
            <option value="gradient">Subtle gradient</option>
            <option value="mesh">Mesh glow</option>
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm text-ivory sm:col-span-2">
          <input type="checkbox" checked={studio.buttonShadow} onChange={(e) => patch("buttonShadow", e.target.checked)} className="size-4 rounded border-onyx-700 bg-onyx-950" />
          Button drop shadow
        </label>
      </div>
    </section>
  );
}
