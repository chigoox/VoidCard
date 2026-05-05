import "server-only";

/**
 * HTML and CSS sanitization helpers.
 *
 * - sanitizeHtml: strips scripts / event handlers / dangerous tags from
 *   user-authored bio + section HTML.
 * - sanitizeCustomCss: allowlist filter for the Pro/Free custom-CSS feature.
 *   Blocks @import, javascript:, expression(), behavior:, and -moz-binding.
 */

const HTML_TAG_DENY = /<\/?(script|iframe|object|embed|link|meta|style|base|form|input|button)\b[^>]*>/gi;
const HTML_EVENT_HANDLER = /\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi;
const HTML_JS_HREF = /\s(href|src|action|formaction|xlink:href)\s*=\s*("|')\s*javascript:[^"']*("|')/gi;
const HTML_DATA_HTML = /\s(href|src)\s*=\s*("|')\s*data:text\/html[^"']*("|')/gi;

export function sanitizeHtml(input: string, opts?: { maxLength?: number }): string {
  const max = opts?.maxLength ?? 50_000;
  let s = String(input ?? "").slice(0, max);
  s = s.replace(HTML_TAG_DENY, "");
  s = s.replace(HTML_EVENT_HANDLER, "");
  s = s.replace(HTML_JS_HREF, "");
  s = s.replace(HTML_DATA_HTML, "");
  return s;
}

const CSS_DENY = [
  /@import\b/gi,
  /\bjavascript\s*:/gi,
  /\bexpression\s*\(/gi,
  /\bbehavior\s*:/gi,
  /-moz-binding\s*:/gi,
  /\burl\s*\(\s*["']?\s*(javascript|data:text\/html|data:application\/x-javascript)/gi,
  // Block remote @font-face from non-https
  /@font-face[^}]*url\(["']?http:\/\//gi,
];

export type CssSanitizeResult = { css: string; violations: string[] };

export function sanitizeCustomCss(input: string, opts?: { maxLength?: number }): CssSanitizeResult {
  const max = opts?.maxLength ?? 100_000;
  let css = String(input ?? "").slice(0, max);
  const violations: string[] = [];
  for (const re of CSS_DENY) {
    if (re.test(css)) {
      violations.push(re.source);
      css = css.replace(re, "/* blocked */");
    }
  }
  return { css, violations };
}

/**
 * Strict text sanitizer for short fields (display_name, username).
 */
export function sanitizeText(input: string, max = 200): string {
  return String(input ?? "")
    .replace(/[\u0000-\u001F\u007F]/g, "")
    .trim()
    .slice(0, max);
}
