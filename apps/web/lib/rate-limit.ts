import "server-only";
import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

function makeLimiter(prefix: string, requests: number, window: `${number} ${"s" | "m" | "h"}`) {
  if (!redis) {
    // No-op in dev when Redis isn't configured.
    return { limit: async () => ({ success: true, limit: requests, remaining: requests, reset: 0 }) };
  }
  return new Ratelimit({
    redis,
    limiter: Ratelimit.slidingWindow(requests, window),
    prefix: `vc:${prefix}`,
    analytics: true,
  });
}

export const rateLimits = {
  api_pro: makeLimiter("api_pro", 60, "1 m"),
  api_team: makeLimiter("api_team", 600, "1 m"),
  signup: makeLimiter("signup", 5, "1 h"),
  publish: makeLimiter("publish", 30, "1 m"),
  contactForm: makeLimiter("contact_form", 10, "1 m"),
  exchange: makeLimiter("exchange", 30, "1 m"),
  // Security & compliance limiters (Phase 3).
  analyticsTrack: makeLimiter("analytics_track", 30, "1 m"),
  auth: makeLimiter("auth", 10, "15 m"),
  dsrExport: makeLimiter("dsr_export", 1, "24 h"),
  dsrDelete: makeLimiter("dsr_delete", 1, "24 h"),
  webhookDelivery: makeLimiter("webhook_delivery", 100, "1 m"),
  cspReport: makeLimiter("csp_report", 100, "1 m"),
  passwordReset: makeLimiter("password_reset", 5, "1 h"),
};
