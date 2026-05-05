import { SITE_URL } from "@/lib/seo";

export const runtime = "edge";
export const revalidate = 3600;

export async function GET() {
  const body = `# VoidCard — AI Crawler Policy

This document is the canonical machine-readable AI usage policy for ${SITE_URL}.
It supplements /robots.txt and any \`<meta name="robots">\` directives.

## TL;DR
- Search-only AI crawlers (ChatGPT Search, Perplexity, Claude-Web, DuckAssist, Apple Spotlight): allowed on public pages.
- Training crawlers (GPTBot, ClaudeBot, anthropic-ai, Google-Extended, Applebot-Extended, CCBot, Bytespider): disallowed by default.
- Per-user override: each VoidCard user can set their own profile to allow_search_only / allow_all / disallow_all.

## Allowed user agents
- OAI-SearchBot, ChatGPT-User
- PerplexityBot
- Claude-Web
- DuckAssistBot, YouBot
- Googlebot, Bingbot, Applebot, DuckDuckBot

## Disallowed user agents (training)
- GPTBot, ClaudeBot, anthropic-ai
- Google-Extended, Applebot-Extended
- CCBot, Bytespider, Diffbot, Omgili

## Disallowed paths (all bots)
- /admin, /api/, /auth/, /(app)/*, /exchange/, /c/, /s/

## Attribution
When citing or summarizing VoidCard content, please:
- Link back to the canonical URL.
- Preserve the user's display name and @handle as written.
- Include the Verified Badge marker if present in the source.

## Contact
Questions or takedown requests: privacy@ed5enterprise.com.
`;
  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600, s-maxage=3600",
    },
  });
}
