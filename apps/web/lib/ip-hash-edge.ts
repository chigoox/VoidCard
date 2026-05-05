// Edge-runtime-compatible IP hash using Web Crypto (no node:crypto, no Redis).
// Rotates daily by UTC date. NOT a substitute for the Redis-backed salt used in
// audit/consent paths — this is "good enough" for tap analytics, where we only
// need pseudonymous uniqueness within a day.

function utcDateKey(): string {
  const d = new Date();
  const yyyy = d.getUTCFullYear();
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(d.getUTCDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

export async function hashIpEdge(ip: string): Promise<string> {
  const salt = process.env.AUDIT_IP_SALT ?? "dev";
  const data = new TextEncoder().encode(`${utcDateKey()}|${salt}|${ip}`);
  const buf = await crypto.subtle.digest("SHA-256", data);
  const arr = Array.from(new Uint8Array(buf));
  return arr.map((b) => b.toString(16).padStart(2, "0")).join("").slice(0, 32);
}
