import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/?source=pwa",
    name: "VoidCard",
    short_name: "VoidCard",
    description: "NFC business cards + living profiles.",
    start_url: "/?source=pwa",
    scope: "/",
    display: "standalone",
    display_override: ["window-controls-overlay", "standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#0a0a0b",
    theme_color: "#0a0a0b",
    categories: ["business", "productivity", "social"],
    lang: "en",
    dir: "ltr",
    icons: [
      { src: "/icons/icon.svg", sizes: "192x192", type: "image/svg+xml" },
      { src: "/icons/icon.svg", sizes: "512x512", type: "image/svg+xml" },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "192x192",
        type: "image/svg+xml",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-maskable.svg",
        sizes: "512x512",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "Dashboard", url: "/dashboard", short_name: "Dashboard" },
      { name: "Insights", url: "/insights" },
      { name: "Shop", url: "/shop" },
      { name: "Pair card", url: "/cards/pair" },
    ],
    prefer_related_applications: false,
  };
}
