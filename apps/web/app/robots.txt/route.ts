import { SITE_URL } from "@/lib/seo";

const TRAINING_BOTS = [
  "GPTBot",
  "ClaudeBot",
  "anthropic-ai",
  "CCBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "FacebookBot",
  "Meta-ExternalAgent",
  "Diffbot",
  "Omgili",
];

const SEARCH_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Claude-Web",
  "DuckAssistBot",
  "YouBot",
  "Amazonbot",
];

const BLOCKED = ["/admin", "/api/", "/auth/", "/exchange/", "/c/", "/s/"];

export const dynamic = "force-static";

export function GET() {
  const lines: string[] = [];
  lines.push("User-agent: *");
  lines.push("Allow: /");
  for (const p of BLOCKED) lines.push(`Disallow: ${p}`);
  lines.push("");
  for (const ua of TRAINING_BOTS) {
    lines.push(`User-agent: ${ua}`);
    lines.push("Disallow: /");
    lines.push("");
  }
  for (const ua of SEARCH_BOTS) {
    lines.push(`User-agent: ${ua}`);
    lines.push("Allow: /");
    for (const p of BLOCKED) lines.push(`Disallow: ${p}`);
    lines.push("");
  }
  lines.push(`Sitemap: ${SITE_URL}/sitemap.xml`);
  lines.push(`Host: ${SITE_URL}`);
  return new Response(lines.join("\n"), {
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}
