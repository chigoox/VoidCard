"use client";

let warned = false;

/**
 * Lightweight PostHog capture wrapper. No-ops on the server, when consent is
 * absent, or when posthog-js is not available. Safe to call from any client
 * component.
 */
export async function capture(event: string, properties?: Record<string, unknown>) {
  if (typeof window === "undefined") return;
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  if (!key) return;
  try {
    type PHType = {
      __loaded?: boolean;
      init?: (apiKey: string, opts?: Record<string, unknown>) => void;
      capture?: (event: string, properties?: Record<string, unknown>) => void;
    };
    const mod = (await import("posthog-js")).default as PHType;
    if (!mod.__loaded && typeof mod.init === "function") {
      mod.init(key, {
        api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST ?? "https://app.posthog.com",
        capture_pageview: false,
        persistence: "localStorage+cookie",
      });
    }
    mod.capture?.(event, properties);
  } catch (err) {
    if (!warned) {
      warned = true;
      console.warn("[posthog] capture failed", err);
    }
  }
}
