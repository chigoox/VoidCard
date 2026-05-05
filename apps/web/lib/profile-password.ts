import "server-only";

const PROFILE_PASSWORD_VERSION = "pbkdf2-sha256";
const PROFILE_PASSWORD_ITERATIONS = 120_000;
const PROFILE_PASSWORD_BYTES = 32;
const PROFILE_UNLOCK_TTL_SECONDS = 60 * 60 * 24 * 30;
const PROFILE_UNLOCK_COOKIE_PREFIX = "vc_profile_unlock_";

const encoder = new TextEncoder();

type ParsedProfilePasswordHash = {
  iterations: number;
  salt: string;
  hash: string;
};

function toHex(bytes: Uint8Array) {
  return Array.from(bytes)
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

function fromHex(value: string) {
  if (!/^[0-9a-f]+$/i.test(value) || value.length % 2 !== 0) return null;
  const bytes = new Uint8Array(value.length / 2);
  for (let index = 0; index < value.length; index += 2) {
    bytes[index / 2] = parseInt(value.slice(index, index + 2), 16);
  }
  return bytes;
}

function subtle() {
  if (!globalThis.crypto?.subtle) {
    throw new Error("webcrypto_unavailable");
  }
  return globalThis.crypto.subtle;
}

async function derivePasswordHash(password: string, saltHex: string, iterations: number) {
  const salt = fromHex(saltHex);
  if (!salt) throw new Error("invalid_salt");
  const key = await subtle().importKey("raw", encoder.encode(password), "PBKDF2", false, ["deriveBits"]);
  const bits = await subtle().deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations,
    },
    key,
    PROFILE_PASSWORD_BYTES * 8,
  );
  return toHex(new Uint8Array(bits));
}

function parseProfilePasswordHash(value: string): ParsedProfilePasswordHash | null {
  const [version, iterationValue, salt, hash] = value.split("$");
  const iterations = Number(iterationValue);
  if (
    version !== PROFILE_PASSWORD_VERSION ||
    !Number.isInteger(iterations) ||
    iterations < 10_000 ||
    !salt ||
    !hash
  ) {
    return null;
  }
  return { iterations, salt, hash };
}

function constantTimeEqual(left: string, right: string) {
  if (left.length !== right.length) return false;
  let diff = 0;
  for (let index = 0; index < left.length; index += 1) {
    diff |= left.charCodeAt(index) ^ right.charCodeAt(index);
  }
  return diff === 0;
}

function unlockSecret() {
  return (
    process.env.PROFILE_PASSWORD_SECRET ??
    process.env.APP_SECRET ??
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.SUPABASE_ANON_KEY ??
    null
  );
}

async function signUnlockPayload(username: string, passwordHash: string, expiresAt: number) {
  const secret = unlockSecret();
  if (!secret) return null;
  const key = await subtle().importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const payload = `${normalizeUsername(username)}|${expiresAt}|${passwordHash}`;
  const signature = await subtle().sign("HMAC", key, encoder.encode(payload));
  return toHex(new Uint8Array(signature));
}

function normalizeUsername(username: string) {
  return username.trim().toLowerCase();
}

export function profileUnlockCookieName(username: string) {
  const safeUsername = normalizeUsername(username).replace(/[^a-z0-9_-]/g, "_").slice(0, 48) || "profile";
  return `${PROFILE_UNLOCK_COOKIE_PREFIX}${safeUsername}`;
}

export async function hashProfilePassword(password: string) {
  const salt = toHex(globalThis.crypto.getRandomValues(new Uint8Array(16)));
  const hash = await derivePasswordHash(password, salt, PROFILE_PASSWORD_ITERATIONS);
  return `${PROFILE_PASSWORD_VERSION}$${PROFILE_PASSWORD_ITERATIONS}$${salt}$${hash}`;
}

export async function verifyProfilePassword(password: string, storedHash: string) {
  const parsed = parseProfilePasswordHash(storedHash);
  if (!parsed) return false;
  const actual = await derivePasswordHash(password, parsed.salt, parsed.iterations);
  return constantTimeEqual(actual, parsed.hash);
}

export async function createProfileUnlockCookieValue(username: string, passwordHash: string) {
  const expiresAt = Date.now() + PROFILE_UNLOCK_TTL_SECONDS * 1000;
  const signature = await signUnlockPayload(username, passwordHash, expiresAt);
  if (!signature) return null;
  return {
    value: `${expiresAt}.${signature}`,
    maxAge: PROFILE_UNLOCK_TTL_SECONDS,
  };
}

export async function verifyProfileUnlockCookieValue(
  username: string,
  passwordHash: string,
  cookieValue: string | null | undefined,
) {
  if (!cookieValue) return false;
  const [expiresAtValue, signature] = cookieValue.split(".");
  const expiresAt = Number(expiresAtValue);
  if (!Number.isFinite(expiresAt) || expiresAt <= Date.now() || !signature) return false;
  const expected = await signUnlockPayload(username, passwordHash, expiresAt);
  return expected ? constantTimeEqual(signature, expected) : false;
}