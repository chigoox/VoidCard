import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

const BLOCKED = ["/admin", "/api/", "/auth/", "/exchange/", "/c/", "/s/"];

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
] as const;

const SEARCH_BOTS = [
  "OAI-SearchBot",
  "ChatGPT-User",
  "PerplexityBot",
  "Claude-Web",
  "DuckAssistBot",
  "YouBot",
  "Amazonbot",
] as const;

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/u/", "/discover", "/shop", "/pricing", "/changelog"],
        disallow: [
          ...BLOCKED,
          "/admin/",
          "/(app)/",
          "/dashboard",
          "/edit",
          "/onboarding",
          "/account",
          "/team",
          "/insights",
          "/contacts",
          "/orders",
          "/variants",
          "/profiles",
          "/cards",
          "/links",
        ],
      },
      {
        userAgent: [...TRAINING_BOTS],
        disallow: ["/"],
      },
      {
        userAgent: [...SEARCH_BOTS],
        allow: ["/", "/u/", "/discover", "/shop", "/pricing", "/changelog"],
        disallow: BLOCKED,
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
