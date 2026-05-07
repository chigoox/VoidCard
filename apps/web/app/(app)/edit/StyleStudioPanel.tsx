"use client";
import type { ReactNode } from "react";
import { DEFAULT_STYLE_STUDIO, type StyleStudio } from "@/lib/editor/styleStudio";

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

export default function StyleStudioPanel({ studio, onChange }: { studio: StyleStudio; onChange: (next: StyleStudio) => void }) {
  function patch<K extends keyof StyleStudio>(key: K, value: StyleStudio[K]) {
    onChange({ ...studio, [key]: value });
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
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Accent color">
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={studio.accent}
              onChange={(e) => patch("accent", e.target.value)}
              className="h-10 w-14 cursor-pointer rounded border border-onyx-700 bg-onyx-950"
              aria-label="Accent color picker"
            />
            <input className={INPUT_CLASS_NAME} value={studio.accent} onChange={(e) => patch("accent", e.target.value)} />
          </div>
        </Field>
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
