import QRCode from "qrcode";

type Variant = "onyx" | "ivory";

type Props = {
  value: string;
  size?: number;
  variant?: Variant;
  /** Render the gold "V" logo in the center. Requires high error correction. */
  withLogo?: boolean;
  className?: string;
  ariaLabel?: string;
};

const PALETTE: Record<Variant, { bg: string; module: string; finderOuter: string; finderInner: string; logoBg: string; logoFg: string }> = {
  onyx: {
    bg: "#0a0a0b",
    module: "#f7f3ea",
    finderOuter: "#d4a853",
    finderInner: "#f7f3ea",
    logoBg: "#0a0a0b",
    logoFg: "#d4a853",
  },
  ivory: {
    bg: "#ffffff",
    module: "#0a0a0b",
    finderOuter: "#0a0a0b",
    finderInner: "#0a0a0b",
    logoBg: "#ffffff",
    logoFg: "#0a0a0b",
  },
};

/**
 * High-quality, brand-styled QR code rendered as inline SVG.
 *
 * - Rounded module dots
 * - Custom rounded finder (corner) patterns with gold accent on the onyx variant
 * - Optional center logo (uses error-correction level H so the QR still scans)
 *
 * Server component: synchronous render of pure SVG, no client JS.
 */
export function BrandedQR({
  value,
  size = 320,
  variant = "onyx",
  withLogo = true,
  className,
  ariaLabel = "QR code",
}: Props) {
  // High error correction so we can carve out a logo area without breaking scan.
  const qr = QRCode.create(value, { errorCorrectionLevel: "H" });
  const modules = qr.modules;
  const count = modules.size;
  const data = modules.data;
  const palette = PALETTE[variant];

  // Layout maths in QR units (we scale via SVG viewBox).
  const margin = 4;
  const total = count + margin * 2;
  const dotRadius = 0.42; // < 0.5 = small gap between dots
  const finderSize = 7;

  // Carve a square in the center for the logo so we don't draw QR dots underneath it.
  // QR-H tolerates ~30% data loss; a 7x7 hole at the center of a 25-50 module QR is well within budget.
  const logoModules = withLogo ? Math.max(7, Math.round(count * 0.22)) : 0;
  const logoStart = withLogo ? Math.floor((count - logoModules) / 2) : -1;
  const logoEnd = withLogo ? logoStart + logoModules : -1;

  // Helpers
  const isFinder = (x: number, y: number) =>
    (x < finderSize && y < finderSize) ||
    (x >= count - finderSize && y < finderSize) ||
    (x < finderSize && y >= count - finderSize);

  const inLogo = (x: number, y: number) =>
    withLogo && x >= logoStart && x < logoEnd && y >= logoStart && y < logoEnd;

  // Build dot path (skip finder areas + logo hole — we draw those separately).
  const dotsPath: string[] = [];
  for (let y = 0; y < count; y++) {
    for (let x = 0; x < count; x++) {
      if (!data[y * count + x]) continue;
      if (isFinder(x, y)) continue;
      if (inLogo(x, y)) continue;
      const cx = margin + x + 0.5;
      const cy = margin + y + 0.5;
      // Approximation of a circle via two arcs in a path string.
      dotsPath.push(
        `M${cx - dotRadius},${cy} a${dotRadius},${dotRadius} 0 1,0 ${dotRadius * 2},0 a${dotRadius},${dotRadius} 0 1,0 -${dotRadius * 2},0`,
      );
    }
  }

  // Render a stylized finder (corner) pattern: rounded outer ring + rounded inner block.
  const finderPositions: Array<{ x: number; y: number }> = [
    { x: 0, y: 0 },
    { x: count - finderSize, y: 0 },
    { x: 0, y: count - finderSize },
  ];

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
        <linearGradient id={`vc-qr-grad-${variant}`} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#e6c170" />
          <stop offset="60%" stopColor="#d4a853" />
          <stop offset="100%" stopColor="#a8802f" />
        </linearGradient>
      </defs>

      {/* Background plaque with subtle inner card feel */}
      <rect x="0" y="0" width={total} height={total} rx={total * 0.06} ry={total * 0.06} fill={palette.bg} />

      {/* Data dots */}
      <path d={dotsPath.join(" ")} fill={palette.module} />

      {/* Stylized finder patterns */}
      {finderPositions.map(({ x, y }, i) => {
        const ox = margin + x;
        const oy = margin + y;
        const outerStroke = 1; // 1 module wide
        const outerSize = finderSize;
        const innerOffset = 2;
        const innerSize = 3;
        const fillFinder = variant === "onyx" ? `url(#vc-qr-grad-${variant})` : palette.finderOuter;
        return (
          <g key={i}>
            {/* Outer rounded square ring (drawn as outer rect minus inner rect) */}
            <path
              d={[
                // Outer rounded rect
                `M${ox + 1.5},${oy}`,
                `H${ox + outerSize - 1.5}`,
                `Q${ox + outerSize},${oy} ${ox + outerSize},${oy + 1.5}`,
                `V${oy + outerSize - 1.5}`,
                `Q${ox + outerSize},${oy + outerSize} ${ox + outerSize - 1.5},${oy + outerSize}`,
                `H${ox + 1.5}`,
                `Q${ox},${oy + outerSize} ${ox},${oy + outerSize - 1.5}`,
                `V${oy + 1.5}`,
                `Q${ox},${oy} ${ox + 1.5},${oy}`,
                `Z`,
                // Inner rounded rect (subtractive, opposite winding)
                `M${ox + outerStroke + 0.7},${oy + outerStroke}`,
                `Q${ox + outerStroke},${oy + outerStroke} ${ox + outerStroke},${oy + outerStroke + 0.7}`,
                `V${oy + outerSize - outerStroke - 0.7}`,
                `Q${ox + outerStroke},${oy + outerSize - outerStroke} ${ox + outerStroke + 0.7},${oy + outerSize - outerStroke}`,
                `H${ox + outerSize - outerStroke - 0.7}`,
                `Q${ox + outerSize - outerStroke},${oy + outerSize - outerStroke} ${ox + outerSize - outerStroke},${oy + outerSize - outerStroke - 0.7}`,
                `V${oy + outerStroke + 0.7}`,
                `Q${ox + outerSize - outerStroke},${oy + outerStroke} ${ox + outerSize - outerStroke - 0.7},${oy + outerStroke}`,
                `Z`,
              ].join(" ")}
              fill={fillFinder}
              fillRule="evenodd"
            />
            {/* Inner rounded block */}
            <rect
              x={ox + innerOffset}
              y={oy + innerOffset}
              width={innerSize}
              height={innerSize}
              rx={0.9}
              ry={0.9}
              fill={fillFinder}
            />
          </g>
        );
      })}

      {/* Center logo */}
      {withLogo ? (
        (() => {
          const cx = total / 2;
          const cy = total / 2;
          const r = (logoModules / 2) * 0.95;
          return (
            <g>
              <circle cx={cx} cy={cy} r={r} fill={palette.logoBg} />
              <circle cx={cx} cy={cy} r={r - 0.15} fill="none" stroke={`url(#vc-qr-grad-${variant})`} strokeWidth={0.35} />
              <text
                x={cx}
                y={cy}
                textAnchor="middle"
                dominantBaseline="central"
                fontFamily="ui-serif, 'Iowan Old Style', Georgia, serif"
                fontWeight={700}
                fontSize={r * 1.2}
                fill={`url(#vc-qr-grad-${variant})`}
              >
                V
              </text>
            </g>
          );
        })()
      ) : null}
    </svg>
  );
}
