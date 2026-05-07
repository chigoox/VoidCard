import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: ["/", "/u/", "/discover", "/shop", "/pricing", "/changelog"],
        disallow: [
          "/api/",
          "/admin",
          "/admin/",
          "/auth/",
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
        userAgent: ["GPTBot", "Google-Extended", "ClaudeBot", "anthropic-ai", "CCBot", "PerplexityBot"],
        // ED5 policy: respect per-profile ai_indexing setting via meta tags; here we
        // signal that the marketing surface is allowed but app/admin must not be crawled.
        allow: ["/", "/u/", "/discover", "/changelog"],
        disallow: ["/api/", "/admin", "/auth/", "/dashboard", "/edit", "/onboarding"],
      },
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
