"use client";

import { useState } from "react";
import { TileStyle, TILE_TEXT_MODES, type Section } from "@/lib/sections/types";

const TEXT_LABELS: Record<(typeof TILE_TEXT_MODES)[number], string> = { auto: "Auto", light: "Light", dark: "Dark" };
const SWATCHES = ["#0a0a0a", "#141414", "#1f2937", "#d4a853", "#f7f3ea", "#ffffff", "#7c3aed", "#0ea5e9", "#10b981", "#f43f5e"];

/** Background, image, padding and text colour for one section's tile. */
export function TileStyleFields({
  section,
  onChange,
  mediaUrls = [],
}: {
  section: Section;
  onChange: (next: Section) => void;
  mediaUrls?: string[];
}) {
  const tile = section.layout?.tile ?? {};

  function update(patch: Partial<TileStyle>) {
    const merged: Record<string, unknown> = { ...tile, ...patch };
    for (const key of Object.keys(merged)) if (merged[key] === undefined || merged[key] === "") delete merged[key];
    const parsed = TileStyle.safeParse(merged);
    if (!parsed.success) return;
    const layout = { ...section.layout, tile: parsed.data };
    if (Object.keys(parsed.data).length === 0) delete (layout as { tile?: unknown }).tile;
    onChange({ ...section, layout } as Section);
  }

  const [imageInvalid, setImageInvalid] = useState(false);

  return (
    <div className="space-y-3" data-testid="tile-style-fields">
      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-widest text-ivory-mute">Background colour</p>
        <div className="flex flex-wrap items-center gap-1.5">
          <button
            type="button"
            onClick={() => update({ color: undefined })}
            className={["grid size-7 place-items-center rounded-full border text-[10px]", !tile.color ? "border-gold text-gold" : "border-onyx-700 text-ivory-mute"].join(" ")}
            aria-label="No background colour"
            title="None"
          >
            ∅
          </button>
          {SWATCHES.map((color) => (
            <button
              key={color}
              type="button"
              onClick={() => update({ color })}
              className={["size-7 rounded-full border", tile.color === color ? "ring-2 ring-gold ring-offset-2 ring-offset-onyx-950" : "border-white/15"].join(" ")}
              style={{ background: color }}
              aria-label={`Background ${color}`}
            />
          ))}
          <label className="relative size-7 cursor-pointer overflow-hidden rounded-full border border-dashed border-onyx-600" title="Custom colour">
            <input
              type="color"
              value={tile.color && tile.color.length === 7 ? tile.color : "#141414"}
              onChange={(event) => update({ color: event.target.value })}
              className="absolute inset-0 size-full cursor-pointer opacity-0"
              aria-label="Custom background colour"
            />
            <span className="grid size-full place-items-center text-xs text-ivory-mute">+</span>
          </label>
        </div>
      </div>

      <label className="block">
        <span className="text-[11px] uppercase tracking-widest text-ivory-mute">Background image (https URL)</span>
        <input
          type="url"
          inputMode="url"
          placeholder="https://…"
          defaultValue={tile.image ?? ""}
          key={tile.image ?? "none"}
          onBlur={(event) => {
            const value = event.target.value.trim();
            const valid = !value || TileStyle.shape.image.safeParse(value).success;
            setImageInvalid(!valid);
            if (valid) update({ image: value || undefined });
          }}
          className="mt-1 w-full rounded-card border border-onyx-700 bg-onyx-900 px-3 py-2 text-sm outline-none focus:border-gold/60"
        />
        {imageInvalid ? <span className="mt-1 block text-[11px] text-red-300">Use a plain https:// image link.</span> : null}
      </label>
      {mediaUrls.length > 0 ? (
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {mediaUrls.slice(0, 12).map((url) => (
            <button
              key={url}
              type="button"
              onClick={() => update({ image: url })}
              className={["size-12 shrink-0 overflow-hidden rounded-md border", tile.image === url ? "border-gold" : "border-onyx-700"].join(" ")}
              aria-label="Use this image as the background"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={url} alt="" className="size-full object-cover" />
            </button>
          ))}
        </div>
      ) : null}

      {tile.image ? (
        <RangeRow label="Image darkening" suffix="%" min={0} max={90} step={5} value={tile.overlay ?? 35} onChange={(overlay) => update({ overlay })} />
      ) : null}
      <RangeRow label="Inner padding" suffix="px" min={0} max={64} step={2} value={tile.padding ?? 20} onChange={(padding) => update({ padding })} />
      <RangeRow label="Corner radius" suffix="px" min={0} max={48} step={2} value={tile.radius ?? 20} onChange={(radius) => update({ radius })} />

      <div>
        <p className="mb-1.5 text-[11px] uppercase tracking-widest text-ivory-mute">Text colour</p>
        <div className="grid grid-cols-3 gap-1">
          {TILE_TEXT_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => update({ text: mode === "auto" ? undefined : mode })}
              className={[
                "rounded-pill border px-2.5 py-1.5 text-xs transition",
                (tile.text ?? "auto") === mode ? "border-gold/70 bg-gold/15 text-gold" : "border-onyx-700 text-ivory-dim hover:border-gold/40",
              ].join(" ")}
            >
              {TEXT_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      {section.layout?.tile ? (
        <button
          type="button"
          className="text-xs text-ivory-mute underline-offset-2 hover:text-ivory hover:underline"
          onClick={() => {
            const layout = { ...section.layout };
            delete layout.tile;
            onChange({ ...section, layout } as Section);
          }}
        >
          Remove tile background
        </button>
      ) : null}
    </div>
  );
}

function RangeRow({ label, suffix, min, max, step, value, onChange }: { label: string; suffix: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] uppercase tracking-widest text-ivory-mute">
        {label}
        <span className="tabular-nums normal-case tracking-normal text-ivory-dim">{value}{suffix}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-1 w-full accent-[var(--vc-accent,#d4a853)]"
      />
    </label>
  );
}
