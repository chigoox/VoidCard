"use client";

import type { ReactNode } from "react";
import {
  AVATAR_RINGS,
  AVATAR_SHAPES,
  DESIGN_ALIGNS,
  DESIGN_AMBIENTS,
  DESIGN_FONTS,
  DESIGN_HOVERS,
  DESIGN_SCALES,
  DESIGN_SHADOWS,
  DESIGN_SURFACES,
  HEADER_LAYOUTS,
  LINK_STYLES,
  SECTION_ANIMATIONS,
  SECTION_ANIMATION_TRIGGERS,
  SectionDesign,
  type Section,
  type SectionDesign as SectionDesignValue,
} from "@/lib/sections/types";
import { DESIGN_PRESETS } from "@/lib/sections/design";

const LABELS: Record<string, string> = {
  none: "None", card: "Card", glass: "Glass", outline: "Outline", gradient: "Gradient", foil: "Gold foil", spotlight: "Spotlight",
  soft: "Soft", lift: "Lifted", glow: "Glow",
  tilt: "3D tilt", shine: "Shine", press: "Press",
  float: "Float", breathe: "Breathe", shimmer: "Shimmer", aurora: "Aurora", "border-flow": "Flowing edge",
  start: "Left", center: "Center", end: "Right",
  sm: "S", md: "M", lg: "L", xl: "XL",
  inherit: "Theme", display: "Serif", sans: "Sans", mono: "Mono",
  pill: "Pill", ghost: "Ghost", gold: "Gold", underline: "Underline", neon: "Neon",
  circle: "Circle", rounded: "Squircle", square: "Square", accent: "Accent", left: "Left",
  slow: "Slow", normal: "Normal", fast: "Fast",
  fade: "Fade", "slide-up": "Slide up", "slide-down": "Slide down", "slide-left": "Slide left", "slide-right": "Slide right", zoom: "Zoom",
  "blur-in": "Blur in", rise: "Rise", reveal: "Reveal", "scale-in": "Scale in", "flip-in": "Flip in", "tilt-in": "Tilt in",
  load: "On load", view: "When visible", hover: "On hover", tap: "On tap",
};
const label = (value: string) => LABELS[value] ?? value;

/** Every visual knob for one section. Changes are validated before saving. */
export function DesignFields({
  section,
  onChange,
  onApplyToAll,
}: {
  section: Section;
  onChange: (next: Section) => void;
  onApplyToAll?: (design: SectionDesignValue) => void;
}) {
  const design = section.design ?? {};

  function setDesign(patch: Partial<SectionDesignValue>, keepPreset = false) {
    const merged: Record<string, unknown> = { ...design, ...patch };
    if (!keepPreset && !("preset" in patch)) delete merged.preset;
    for (const key of Object.keys(merged)) if (merged[key] === undefined) delete merged[key];
    const parsed = SectionDesign.safeParse(merged);
    if (!parsed.success) return;
    const next = { ...section, design: parsed.data } as Section;
    if (Object.keys(parsed.data).length === 0) delete (next as { design?: unknown }).design;
    onChange(next);
  }

  function setDisplay(patch: Partial<NonNullable<Section["display"]>>) {
    onChange({ ...section, display: { ...(section.display ?? {}), ...patch } } as Section);
  }

  const animation = section.display?.animation ?? "none";

  return (
    <div className="space-y-6" data-testid="design-fields">
      <Group title="Looks">
        <div className="grid grid-cols-2 gap-2">
          {DESIGN_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              onClick={() => setDesign({ ...emptyDesign(), ...preset.design, preset: preset.id }, true)}
              className={[
                "group overflow-hidden rounded-card border text-left transition",
                design.preset === preset.id ? "border-gold ring-1 ring-gold/50" : "border-onyx-700 hover:border-gold/50",
              ].join(" ")}
              title={preset.description}
              data-testid={`design-preset-${preset.id}`}
            >
              <PresetSwatch design={preset.design} />
              <span className="block px-2.5 pb-2 pt-1.5 text-xs font-medium text-ivory group-hover:text-gold">{preset.name}</span>
            </button>
          ))}
        </div>
        {onApplyToAll ? (
          <button type="button" className="text-xs text-ivory-mute underline-offset-2 hover:text-gold hover:underline" onClick={() => onApplyToAll(design)}>
            Apply this look to every section
          </button>
        ) : null}
      </Group>

      <Group title="Surface">
        <Chips values={DESIGN_SURFACES} value={design.surface ?? "none"} onPick={(surface) => setDesign({ surface })} cols={4} />
      </Group>

      <Group title="Colour">
        <ColorRow label="Accent" value={design.accent} onChange={(accent) => setDesign({ accent })} />
        <ColorRow label="Text" value={design.text} onChange={(text) => setDesign({ text })} />
        <ColorRow label="Background" value={design.bg} onChange={(bg) => setDesign({ bg, ...(bg ? {} : { bg2: undefined }) })} />
        {design.bg ? (
          <>
            <ColorRow label="Gradient to" value={design.bg2} onChange={(bg2) => setDesign({ bg2 })} />
            {design.bg2 ? (
              <Range label="Gradient angle" suffix="°" min={0} max={360} step={5} value={design.gradientAngle ?? 135} onChange={(gradientAngle) => setDesign({ gradientAngle })} />
            ) : null}
          </>
        ) : null}
        <ColorRow label="Border" value={design.border} onChange={(border) => setDesign({ border })} />
        {design.border || design.borderWidth !== undefined ? (
          <Range label="Border width" suffix="px" min={0} max={8} step={1} value={design.borderWidth ?? 1} onChange={(borderWidth) => setDesign({ borderWidth })} />
        ) : null}
      </Group>

      <Group title="Shape">
        <Range label="Corner radius" suffix="px" min={0} max={48} step={2} value={design.radius ?? 20} onChange={(radius) => setDesign({ radius })} />
        <Range label="Inner padding" suffix="px" min={0} max={64} step={2} value={design.padding ?? 20} onChange={(padding) => setDesign({ padding })} />
      </Group>

      <Group title="Typography">
        <Chips values={DESIGN_FONTS} value={design.font ?? "inherit"} onPick={(font) => setDesign({ font })} cols={4} />
        <Chips values={DESIGN_SCALES} value={design.scale ?? "md"} onPick={(scale) => setDesign({ scale })} cols={4} />
        <Chips values={DESIGN_ALIGNS} value={design.align ?? "center"} onPick={(align) => setDesign({ align })} cols={3} />
        <Range label="Letter spacing" suffix="" min={-5} max={40} step={1} value={design.letterSpacing ?? 0} onChange={(letterSpacing) => setDesign({ letterSpacing })} />
        <Toggle label="ALL CAPS" checked={!!design.uppercase} onChange={(uppercase) => setDesign({ uppercase: uppercase || undefined })} />
      </Group>

      <Group title="Depth & interaction">
        <Sub label="Shadow"><Chips values={DESIGN_SHADOWS} value={design.shadow ?? "none"} onPick={(shadow) => setDesign({ shadow })} cols={4} /></Sub>
        <Sub label="On hover"><Chips values={DESIGN_HOVERS} value={design.hover ?? "none"} onPick={(hover) => setDesign({ hover })} cols={3} /></Sub>
      </Group>

      <Group title="Motion">
        <Sub label="Always-on effect"><Chips values={DESIGN_AMBIENTS} value={design.ambient ?? "none"} onPick={(ambient) => setDesign({ ambient })} cols={3} /></Sub>
        <Sub label="Entrance"><Chips values={SECTION_ANIMATIONS} value={animation} onPick={(value) => setDisplay({ animation: value })} cols={3} /></Sub>
        {animation !== "none" ? (
          <>
            <Sub label="Play"><Chips values={SECTION_ANIMATION_TRIGGERS} value={section.display?.animationTrigger ?? "load"} onPick={(animationTrigger) => setDisplay({ animationTrigger })} cols={2} /></Sub>
            <Range label="Delay" suffix="ms" min={0} max={2000} step={50} value={section.display?.animationDelay ?? 0} onChange={(animationDelay) => setDisplay({ animationDelay })} />
          </>
        ) : null}
        <Sub label="Tempo"><Chips values={["slow", "normal", "fast"] as const} value={design.speed ?? "normal"} onPick={(speed) => setDesign({ speed: speed === "normal" ? undefined : speed })} cols={3} /></Sub>
      </Group>

      <TypeSpecific section={section} onChange={onChange} />

      <button
        type="button"
        className="btn-ghost w-full px-3 py-2 text-xs"
        onClick={() => {
          const next = { ...section } as Section & { design?: unknown };
          delete next.design;
          onChange(next as Section);
        }}
      >
        Reset design
      </button>
    </div>
  );
}

function emptyDesign(): SectionDesignValue {
  // Presets replace the look wholesale but keep nothing stale behind.
  return {};
}

function TypeSpecific({ section, onChange }: { section: Section; onChange: (next: Section) => void }) {
  if (section.type === "link") {
    const p = section.props;
    return (
      <Group title="Button style">
        <div className="grid grid-cols-2 gap-2">
          {LINK_STYLES.map((style) => (
            <button
              key={style}
              type="button"
              onClick={() => onChange({ ...section, props: { ...p, style } })}
              className={["rounded-card border p-2 text-left transition", p.style === style ? "border-gold ring-1 ring-gold/50" : "border-onyx-700 hover:border-gold/50"].join(" ")}
              data-testid={`link-style-${style}`}
            >
              <span className="vc-profile-preview block rounded-md bg-[var(--vc-bg,#0a0a0a)] p-2">
                <span
                  data-vc-link-style={["gold", "glass", "outline", "underline", "neon"].includes(style) ? style : undefined}
                  className={[
                    "block px-3 py-1.5 text-[11px]",
                    style === "card" || style === "ghost" ? "rounded-lg" : "rounded-full",
                    style === "pill" ? "border border-[color-mix(in_srgb,var(--vc-accent,#d4af37)_24%,transparent)] bg-[color-mix(in_srgb,var(--vc-bg-2,#141414)_85%,transparent)] text-[var(--vc-fg,#f7f3ea)]" : "",
                    style === "card" ? "border border-[color-mix(in_srgb,var(--vc-accent,#d4af37)_24%,transparent)] bg-[var(--vc-bg-2,#141414)] text-[var(--vc-fg,#f7f3ea)]" : "",
                    style === "ghost" ? "border border-[color-mix(in_srgb,var(--vc-accent,#d4af37)_24%,transparent)] text-[var(--vc-accent,#d4af37)]" : "",
                  ].join(" ")}
                >
                  {p.label || "Link"}
                </span>
              </span>
              <span className="mt-1 block text-[11px] text-ivory-dim">{label(style)}</span>
            </button>
          ))}
        </div>
      </Group>
    );
  }
  if (section.type === "header") {
    const p = section.props;
    return (
      <Group title="Profile header">
        <Sub label="Photo shape"><Chips values={AVATAR_SHAPES} value={p.avatarShape ?? "circle"} onPick={(avatarShape) => onChange({ ...section, props: { ...p, avatarShape } })} cols={3} /></Sub>
        <Sub label="Photo ring"><Chips values={AVATAR_RINGS} value={p.avatarRing ?? "accent"} onPick={(avatarRing) => onChange({ ...section, props: { ...p, avatarRing } })} cols={3} /></Sub>
        <Sub label="Layout"><Chips values={HEADER_LAYOUTS} value={p.layout ?? "center"} onPick={(layout) => onChange({ ...section, props: { ...p, layout } })} cols={2} /></Sub>
      </Group>
    );
  }
  if (section.type === "stats") {
    const p = section.props;
    return (
      <Group title="Stats">
        <Toggle label="Count up when visible" checked={p.countUp !== false} onChange={(countUp) => onChange({ ...section, props: { ...p, countUp } })} />
      </Group>
    );
  }
  return null;
}

function PresetSwatch({ design }: { design: SectionDesignValue }) {
  const bg = design.bg ? (design.bg2 ? `linear-gradient(${design.gradientAngle ?? 135}deg, ${design.bg}, ${design.bg2})` : design.bg) : undefined;
  return (
    <span className="vc-profile-preview block bg-[var(--vc-bg,#0a0a0a)] p-2.5">
      <span
        className="vc-design block h-10"
        data-vc-surface={design.surface && design.surface !== "none" ? design.surface : undefined}
        data-vc-shadow={design.shadow && design.shadow !== "none" ? design.shadow : undefined}
        data-vc-ambient={design.ambient === "border-flow" || design.ambient === "aurora" || design.ambient === "shimmer" ? design.ambient : undefined}
        data-vc-bg={bg ? "" : undefined}
        style={{
          ...(bg ? { ["--vc-design-bg" as string]: bg } : {}),
          ...(design.accent ? { ["--vc-accent" as string]: design.accent } : {}),
          ...(design.border ? { ["--vc-design-border" as string]: design.border } : {}),
          ["--vc-design-radius" as string]: `${Math.min(design.radius ?? 12, 14)}px`,
          padding: 0,
        }}
      />
    </span>
  );
}

function Group({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2.5">
      <p className="text-[11px] uppercase tracking-[0.2em] text-ivory-mute">{title}</p>
      {children}
    </section>
  );
}

function Sub({ label: text, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] text-ivory-dim">{text}</p>
      {children}
    </div>
  );
}

function Chips<T extends string>({ values, value, onPick, cols }: { values: readonly T[]; value: T; onPick: (value: T) => void; cols: number }) {
  return (
    <div className="grid gap-1" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
      {values.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onPick(option)}
          aria-pressed={value === option}
          className={[
            "truncate rounded-pill border px-2 py-1.5 text-xs transition",
            value === option ? "border-gold/70 bg-gold/15 text-gold" : "border-onyx-700 text-ivory-dim hover:border-gold/40 hover:text-ivory",
          ].join(" ")}
        >
          {label(option)}
        </button>
      ))}
    </div>
  );
}

function ColorRow({ label: text, value, onChange }: { label: string; value?: string; onChange: (value: string | undefined) => void }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm text-ivory-dim">{text}</span>
      <div className="flex items-center gap-2">
        {value ? (
          <button type="button" className="text-[11px] text-ivory-mute hover:text-ivory" onClick={() => onChange(undefined)}>
            Clear
          </button>
        ) : (
          <span className="text-[11px] text-ivory-mute">Theme</span>
        )}
        <label className="relative size-8 cursor-pointer overflow-hidden rounded-full border border-onyx-600" style={{ background: value ?? "conic-gradient(#d4a853, #7c3aed, #0ea5e9, #10b981, #d4a853)" }}>
          <input
            type="color"
            value={value && value.length === 7 ? value : "#d4a853"}
            onChange={(event) => onChange(event.target.value)}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
            aria-label={`${text} colour`}
          />
        </label>
      </div>
    </div>
  );
}

function Range({ label: text, suffix, min, max, step, value, onChange }: { label: string; suffix: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return (
    <label className="block">
      <span className="flex justify-between text-[11px] uppercase tracking-widest text-ivory-mute">
        {text}
        <span className="tabular-nums normal-case tracking-normal text-ivory-dim">{value}{suffix}</span>
      </span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(event) => onChange(Number(event.target.value))} className="mt-1 w-full accent-[var(--vc-accent,#d4a853)]" />
    </label>
  );
}

function Toggle({ label: text, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex cursor-pointer items-center justify-between gap-3 rounded-card border border-onyx-700 px-3 py-2.5 text-sm">
      {text}
      <input type="checkbox" checked={checked} onChange={(event) => onChange(event.target.checked)} className="accent-[var(--vc-accent,#d4a853)]" />
    </label>
  );
}
