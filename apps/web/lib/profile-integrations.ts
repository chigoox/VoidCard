export type ProfileIntegrations = {
  googleAnalyticsId?: string;
  facebookPixelId?: string;
};

const MARKER_OPEN = "/* vc:profile-integrations";
const MARKER_CLOSE = "*/";
const GA_RE = /^G-[A-Z0-9-]{4,32}$/i;
const FB_PIXEL_RE = /^\d{5,32}$/;

export function normalizeProfileIntegrations(input: ProfileIntegrations): ProfileIntegrations {
  const googleAnalyticsId = input.googleAnalyticsId?.trim().toUpperCase();
  const facebookPixelId = input.facebookPixelId?.trim();
  return {
    ...(googleAnalyticsId && GA_RE.test(googleAnalyticsId) ? { googleAnalyticsId } : {}),
    ...(facebookPixelId && FB_PIXEL_RE.test(facebookPixelId) ? { facebookPixelId } : {}),
  };
}

export function readProfileIntegrations(css: string): { integrations: ProfileIntegrations; rest: string } {
  const start = css.indexOf(MARKER_OPEN);
  if (start === -1) return { integrations: {}, rest: css };
  const end = css.indexOf(MARKER_CLOSE, start + MARKER_OPEN.length);
  if (end === -1) return { integrations: {}, rest: css };

  const block = css.slice(start, end + MARKER_CLOSE.length);
  const rest = (css.slice(0, start) + css.slice(end + MARKER_CLOSE.length)).trim();
  return { integrations: parseBlock(block), rest };
}

export function writeProfileIntegrations(integrations: ProfileIntegrations, rest: string): string {
  const normalized = normalizeProfileIntegrations(integrations);
  const trimmed = rest.trim();
  if (!normalized.googleAnalyticsId && !normalized.facebookPixelId) return trimmed;
  const lines = [
    MARKER_OPEN,
    normalized.googleAnalyticsId ? `googleAnalyticsId: ${normalized.googleAnalyticsId}` : null,
    normalized.facebookPixelId ? `facebookPixelId: ${normalized.facebookPixelId}` : null,
    MARKER_CLOSE,
  ].filter(Boolean);
  const block = lines.join("\n");
  return trimmed ? `${block}\n\n${trimmed}` : block;
}

function parseBlock(block: string): ProfileIntegrations {
  const googleAnalyticsId = block.match(/googleAnalyticsId\s*:\s*([^\n*]+)/i)?.[1]?.trim().toUpperCase();
  const facebookPixelId = block.match(/facebookPixelId\s*:\s*([^\n*]+)/i)?.[1]?.trim();
  return normalizeProfileIntegrations({ googleAnalyticsId, facebookPixelId });
}
