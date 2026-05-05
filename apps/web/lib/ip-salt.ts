import "server-only";
import { createHash } from "node:crypto";
import { Redis } from "@upstash/redis";

/**
 * Daily-rotating salt for hashing IPs in tap analytics, audit log, consent log,
 * and CSP reports. Salt is generated lazily and stored in Upstash Redis with a
 * 36h TTL so it survives clock skew across regions.
 *
 * Falls back to a deterministic per-day hash when Redis isn't configured (dev).
 */

const redis = process.env.UPSTASH_REDIS_REST_URL
  ? new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    })
  : null;

function todayKey(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `vc:tap_salt:${yyyy}${mm}${dd}`;
}

function devFallback(): string {
  // Stable per-day fallback for local dev — NEVER used in production.
  return createHash("sha256")
    .update(`${todayKey()}:${process.env.AUDIT_IP_SALT ?? "dev"}`)
    .digest("hex");
}

export async function getDailySalt(): Promise<string> {
  if (!redis) return devFallback();
  const key = todayKey();
  const existing = await redis.get<string>(key);
  if (existing) return existing;

  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  const salt = Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
  // 36h TTL with NX semantics so concurrent generators don't clobber.
  await redis.set(key, salt, { ex: 60 * 60 * 36, nx: true });
  return (await redis.get<string>(key)) ?? salt;
}

export async function hashIpDaily(ip: string | null | undefined): Promise<string | null> {
  if (!ip) return null;
  const salt = await getDailySalt();
  return createHash("sha256").update(`${ip}:${salt}`).digest("hex").slice(0, 32);
}
