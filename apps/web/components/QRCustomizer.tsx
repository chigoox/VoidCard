"use client";

import { useRef, useState, useTransition } from "react";
import { BrandedQR, type QRDotStyle, type QRFinderStyle, type QRVariant } from "@/components/BrandedQR";

type Props = {
  url: string;
};

const VARIANTS: Array<{ id: QRVariant; label: string }> = [
  { id: "onyx", label: "Onyx" },
  { id: "ivory", label: "Ivory" },
  { id: "custom", label: "Custom" },
];

const DOT_STYLES: Array<{ id: QRDotStyle; label: string }> = [
  { id: "dots", label: "Dots" },
  { id: "rounded", label: "Rounded" },
  { id: "squares", label: "Squares" },
];

const FINDER_STYLES: Array<{ id: QRFinderStyle; label: string }> = [
  { id: "rounded", label: "Rounded" },
  { id: "square", label: "Square" },
  { id: "circle", label: "Circle" },
];

export function QRCustomizer({ url }: Props) {
  const [variant, setVariant] = useState<QRVariant>("onyx");
  const [dotStyle, setDotStyle] = useState<QRDotStyle>("dots");
  const [finderStyle, setFinderStyle] = useState<QRFinderStyle>("rounded");
  const [withLogo, setWithLogo] = useState(true);
  const [logoText, setLogoText] = useState("V");
  const [fg, setFg] = useState("#f7f3ea");
  const [bg, setBg] = useState("#0a0a0b");
  const [accent, setAccent] = useState("#d4a853");
  const [accentGradient, setAccentGradient] = useState(true);
  const [, startTransition] = useTransition();

  const previewRef = useRef<HTMLDivElement>(null);

  const customProps = variant === "custom" ? { fg, bg, accent, accentGradient } : {};

  function downloadSVG() {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const serialized = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    triggerDownload(blob, "voidcard-qr.svg");
  }

  function downloadPNG(scale = 1024) {
    const svg = previewRef.current?.querySelector("svg");
    if (!svg) return;
    const clone = svg.cloneNode(true) as SVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    const serialized = new XMLSerializer().serializeToString(clone);
    const svgBlob = new Blob([serialized], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = scale;
      canvas.height = scale;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.drawImage(img, 0, 0, scale, scale);
      canvas.toBlob((blob) => {
        if (blob) triggerDownload(blob, `voidcard-qr-${scale}.png`);
        URL.revokeObjectURL(svgUrl);
      }, "image/png");
    };
    img.src = svgUrl;
  }

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,260px)]">
      <div
        ref={previewRef}
        className="grid place-items-center rounded-card bg-onyx-900 p-6"
      >
        <BrandedQR
          value={url}
          size={288}
          variant={variant}
          dotStyle={dotStyle}
          finderStyle={finderStyle}
          withLogo={withLogo}
          logoText={logoText || "V"}
          {...customProps}
          className="rounded-card shadow-[0_8px_32px_-12px_rgba(212,168,83,0.35)]"
          ariaLabel="Customizable QR code preview"
        />
      </div>

      <div className="space-y-4">
        <Field label="Theme">
          <Segmented
            value={variant}
            onChange={(v) => startTransition(() => setVariant(v))}
            options={VARIANTS}
          />
        </Field>

        {variant === "custom" ? (
          <div className="space-y-3 rounded-card border border-onyx-700 bg-onyx-800/40 p-3">
            <ColorRow label="Foreground" value={fg} onChange={setFg} />
            <ColorRow label="Background" value={bg} onChange={setBg} />
            <ColorRow label="Accent" value={accent} onChange={setAccent} />
            <label className="flex items-center justify-between gap-2 text-xs text-ivory-dim">
              <span>Gradient accent</span>
              <input
                type="checkbox"
                checked={accentGradient}
                onChange={(e) => setAccentGradient(e.target.checked)}
                className="h-4 w-4 accent-gold"
              />
            </label>
          </div>
        ) : null}

        <Field label="Modules">
          <Segmented value={dotStyle} onChange={setDotStyle} options={DOT_STYLES} />
        </Field>

        <Field label="Finder">
          <Segmented value={finderStyle} onChange={setFinderStyle} options={FINDER_STYLES} />
        </Field>

        <Field label="Logo">
          <div className="space-y-2">
            <label className="flex items-center justify-between gap-2 text-xs text-ivory-dim">
              <span>Show center logo</span>
              <input
                type="checkbox"
                checked={withLogo}
                onChange={(e) => setWithLogo(e.target.checked)}
                className="h-4 w-4 accent-gold"
              />
            </label>
            {withLogo ? (
              <input
                type="text"
                maxLength={3}
                value={logoText}
                onChange={(e) => setLogoText(e.target.value.toUpperCase())}
                placeholder="V"
                className="w-full rounded-pill border border-onyx-700 bg-onyx-900 px-3 py-1.5 text-center font-mono text-sm text-ivory outline-none focus:border-gold"
              />
            ) : null}
          </div>
        </Field>

        <div className="flex flex-wrap gap-2 pt-2">
          <button type="button" onClick={downloadSVG} className="btn-ghost text-xs">
            Download SVG
          </button>
          <button type="button" onClick={() => downloadPNG(1024)} className="btn-ghost text-xs">
            PNG 1024
          </button>
          <button type="button" onClick={() => downloadPNG(2048)} className="btn-gold text-xs">
            PNG 2048
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[10px] uppercase tracking-widest text-ivory-mute">{label}</p>
      {children}
    </div>
  );
}

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: Array<{ id: T; label: string }>;
}) {
  return (
    <div className="flex rounded-pill border border-onyx-700 bg-onyx-900 p-0.5">
      {options.map((o) => {
        const active = o.id === value;
        return (
          <button
            key={o.id}
            type="button"
            onClick={() => onChange(o.id)}
            className={`flex-1 rounded-pill px-2.5 py-1 text-xs transition ${
              active ? "bg-gold text-onyx-900" : "text-ivory-dim hover:text-ivory"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ColorRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 text-xs text-ivory-dim">
      <span>{label}</span>
      <span className="flex items-center gap-2">
        <input
          type="color"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="h-7 w-10 cursor-pointer rounded border border-onyx-700 bg-transparent"
          aria-label={`${label} color`}
        />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-20 rounded border border-onyx-700 bg-onyx-900 px-2 py-1 font-mono text-[11px] text-ivory outline-none focus:border-gold"
          aria-label={`${label} hex`}
        />
      </span>
    </label>
  );
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
