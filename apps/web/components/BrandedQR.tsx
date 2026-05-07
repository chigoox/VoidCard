import QRCode from "qrcode";
import { useId } from "react";

export type QRVariant = "onyx" | "ivory" | "custom";
export type QRDotStyle = "dots" | "rounded" | "squares";
export type QRFinderStyle = "rounded" | "square" | "circle";

export type QROptions = {
  variant?: QRVariant;
  /** Foreground (data module) color. */
  fg?: string;
  /** Background plaque color. */
  bg?: string;
  /** Accent color for finder patterns + logo ring. */
  accent?: string;
  /** Use a 3-stop gradient on the accent. */
  accentGradient?: boolean;
  /** Module shape style. */
  dotStyle?: QRDotStyle;
  /** Corner finder shape. */
  finderStyle?: QRFinderStyle;
  /** Show center logo. */
  withLogo?: boolean;
  /** Logo character or short text (1-3 chars). */
  logoText?: string;
  /** Outer corner radius of the background plaque, 0..1 fraction of total. */
  cornerRadius?: number;
};

type Props = {
  value: string;
  size?: number;
  className?: string;
  ariaLabel?: string;
} & QROptions;

const PRESETS: Record<Exclude<QRVariant, "custom">, Required<Pick<QROptions, "fg" | "bg" | "accent" | "accentGradient">>> = {
  onyx: { fg: "#f7f3ea", bg: "#0a0a0b", accent: "#d4a853", accentGradient: true },
  ivory: { fg: "#0a0a0b", bg: "#ffffff", accent: "#0a0a0b", accentGradient: false },
};

function resolveOptions(opts: QROptions) {
  const variant = opts.variant ?? "onyx";
  const preset = variant === "custom" ? PRESETS.onyx : PRESETS[variant];
  return {
    variant,
    fg: opts.fg ?? preset.fg,
    bg: opts.bg ?? preset.bg,
    accent: opts.accent ?? preset.accent,
    accentGradient: opts.accentGradient ?? variant === "onyx",
    dotStyle: opts.dotStyle ?? "dots",
    finderStyle: opts.finderStyle ?? "rounded",
    withLogo: opts.withLogo ?? true,
    logoText: (opts.logoText ?? "V").slice(0, 3),
    cornerRadius: opts.cornerRadius ?? 0.06,
  };
}

/**
 * High-quality, brand-styled QR code rendered as inline SVG.
 * Server- or client-renderable. No client JS required.
 */
export function BrandedQR({
  value,
  size = 320,
  className,
  ariaLabel = "QR code",
  ...opts
}: Props) {
  const o = resolveOptions(opts);
  const reactId = useId().replace(/[:#]/g, "");
  const gradId = `vc-qr-grad-${reactId}`;

  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const modules = qr.modules;
  const count = modules.size;
  const data = modules.data;

  const margin = 4;
  const total = count + margin * 2;
  const finderSize = 7;

  const logoModules = o.withLogo ? Math.max(7, Math.round(count * 0.22)) : 0;
  const logoStart = o.withLogo ? Math.floor((count - logoModules) / 2) : -1;
  const logoEnd = o.withLogo ? logoStart + logoModules : -1;

  const isFinder = (x: number, y: number) =>
    (x < finderSize && y < finderSize) ||
    (x >= count - finderSize && y < finderSize) ||
    (x < finderSize && y >= count - finderSize);

  const inLogo = (x: number, y: number) =>
    o.withLogo && x >= logoStart && x < logoEnd && y >= logoStart && y < logoEnd;

  const dotPaths: string[] = [];
  const moduleRects: Array<{ x: number; y: number; rx: number }> = [];
  const radius = o.dotStyle === "dots" ? 0.42 : o.dotStyle === "rounded" ? 0.25 : 0;

  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (!data[y * count + x]) continue;
      if (isFinder(x, y)) continue;
      if (inLogo(x, y)) continue;
      if (o.dotStyle === "dots") {
        const cx = margin + x + 0.5;
        const cy = margin + y + 0.5;
        const r = radius;
        dotPaths.push(
          `M${cx - r},${cy} a${r},${r} 0 1,0 ${r * 2},0 a${r},${r} 0 1,0 -${r * 2},0`,
        );
      } else {
        moduleRects.push({ x: margin + x, y: margin + y, rx: radius });
      }
    }
  }

  const finderPositions: Array<{ x: number; y: number }> = [
    { x: 0, y: 0 },
    { x: count - finderSize, y: 0 },
    { x: 0, y: count - finderSize },
  ];

  const accentFill = o.accentGradient ? `url(#${gradId})` : o.accent;

  function renderFinder(ox: number, oy: number) {
    const outerStroke = 1;
    const outerSize = finderSize;
    const innerOffset = 2;
    const innerSize = 3;

    if (o.finderStyle === "circle") {
      const cx = ox + outerSize / 2;
      const cy = oy + outerSize / 2;
      return (
        <>
          <circle cx={cx} cy={cy} r={outerSize / 2} fill={accentFill} />
          <circle cx={cx} cy={cy} r={outerSize / 2 - outerStroke} fill={o.bg} />
          <circle cx={cx} cy={cy} r={innerSize / 2 + 0.2} fill={accentFill} />
        </>
      );
    }

    const r = o.finderStyle === "square" ? 0 : 1.5;
    const innerR = o.finderStyle === "square" ? 0 : 0.9;

    return (
      <>
        <rect x={ox} y={oy} width={outerSize} height={outerSize} rx={r} ry={r} fill={accentFill} />
        <rect
          x={ox + outerStroke}
          y={oy + outerStroke}
          width={outerSize - outerStroke * 2}
          height={outerSize - outerStroke * 2}
          rx={Math.max(0, r - 0.5)}
          ry={Math.max(0, r - 0.5)}
          fill={o.bg}
        />
        <rect x={ox + innerOffset} y={oy + innerOffset} width={innerSize} height={innerSize} rx={innerR} ry={innerR} fill={accentFill} />
      </>
    );
  }

  return (
    <svg
      role="img"
      aria-label={ariaLabel}
      viewBox={`0 0 ${total} ${total}`}
      width={size}
      height={size}
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      shapeRendering="geometricPrecision"
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor={lighten(o.accent, 0.18)} />
          <stop offset="60%" stopColor={o.accent} />
          <stop offset="100%" stopColor={darken(o.accent, 0.22)} />
        </linearGradient>
      </defs>

      <rect x="0" y="0" width={total} height={total} rx={total * o.cornerRadius} ry={total * o.cornerRadius} fill={o.bg} />

      {dotPaths.length > 0 ? <path d={dotPaths.join(" ")} fill={o.fg} /> : null}
      {moduleRects.map((m, i) => (
        <rect key={i} x={m.x} y={m.y} width={1} height={1} rx={m.rx} ry={m.rx} fill={o.fg} />
      ))}

      {finderPositions.map(({ x, y }, i) => {
        const ox = margin + x;
        const oy = margin + y;
        return <g key={i}>{renderFinder(ox, oy)}</g>;
      })}

      {o.withLogo ? (
        (() => {
          const cx = total / 2;
          const cy = total / 2;
          const r = (logoModules / 2) * 0.95;
          const text = o.logoText;
          const fontSize = r * (text.length === 1 ? 1.2 : text.length === 2 ? 0.95 : 0.7);
          return (
            <g>
              <circle cx={cx} cy={cy} r={r} fill={o.bg} />
              <circle cx={cx} cy={cy} r={r - 0.15} fill="none" stroke={accentFill} strokeWidth={0.35} />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="ui-serif, 'Iowan Old Style', Georgia, serif"
                fontWeight={700}
                fontSize={fontSize}
                fill={accentFill}
              >
                {text}
              </text>
            </g>
          );
        })()
      ) : null}
    </svg>
  );
}

function clamp(n: number) {
  return Math.max(0, Math.min(255, Math.round(n)));
}
function parseHex(hex: string): [number, number, number] {
  const h = (hex || "").replace("#", "").trim();
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  if (full.length !== 6 || /[^0-9a-fA-F]/.test(full)) return [212, 168, 83];
  return [parseInt(full.slice(0, 2), 16), parseInt(full.slice(2, 4), 16), parseInt(full.slice(4, 6), 16)];
}
function toHex([r, g, b]: [number, number, number]) {
  return `#${[r, g, b].map((n) => clamp(n).toString(16).padStart(2, "0")).join("")}`;
}
function lighten(hex: string, amt: number) {
  const [r, g, b] = parseHex(hex);
  return toHex([r + (255 - r) * amt, g + (255 - g) * amt, b + (255 - b) * amt]);
}
function darken(hex: string, amt: number) {
  const [r, g, b] = parseHex(hex);
  return toHex([r * (1 - amt), g * (1 - amt), b * (1 - amt)]);
}
