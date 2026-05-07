import fs from "node:fs";
import path from "node:path";
import process from "node:process";

import { createClient } from "@supabase/supabase-js";

const DEFAULT_ORIGIN_SITE = "vcard.ed5enterprise.com";

function cleanEnvValue(value) {
  if (typeof value !== "string") return value;
  return value.trim().replace(/^['\"]|['\"]$/g, "");
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;

  const content = fs.readFileSync(filePath, "utf8");
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;

    const key = trimmed.slice(0, separatorIndex).trim();
    const value = cleanEnvValue(trimmed.slice(separatorIndex + 1));
    if (!key || process.env[key]) continue;
    process.env[key] = value;
  }
}

function profileOriginSite() {
  try {
    return new URL(process.env.NEXT_PUBLIC_SITE_URL ?? `https://${DEFAULT_ORIGIN_SITE}`).hostname.toLowerCase();
  } catch {
    return DEFAULT_ORIGIN_SITE;
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const supabaseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function lookupAuthEmail(userId) {
  const { data, error } = await admin.auth.admin.getUserById(userId);
  if (error) throw error;
  return data.user?.email ?? null;
}

async function main() {
  const write = process.argv.includes("--write");
  const { data: extRows, error: extError } = await admin
    .from("vcard_profile_ext")
    .select("user_id, username, display_name, origin_site");

  if (extError) throw extError;

  const profileRows = extRows ?? [];
  const userIds = [...new Set(profileRows.map((row) => row.user_id).filter(Boolean))];
  const { data: sharedRows, error: sharedError } = userIds.length
    ? await admin.from("profiles").select("id, email, username, display_name, role").in("id", userIds)
    : { data: [], error: null };

  if (sharedError) throw sharedError;

  const sharedById = new Map((sharedRows ?? []).map((row) => [row.id, row]));
  const operations = [];

  for (const row of profileRows) {
    const shared = sharedById.get(row.user_id);

    if (!shared) {
      const email = await lookupAuthEmail(row.user_id).catch(() => null);
      operations.push({
        kind: "insert",
        userId: row.user_id,
        payload: {
          id: row.user_id,
          email,
          username: row.username ?? null,
          display_name: row.display_name ?? null,
          role: "user",
        },
      });
      continue;
    }

    const nextEmail = !shared.email ? await lookupAuthEmail(row.user_id).catch(() => null) : null;

    const patch = Object.fromEntries(
      Object.entries({
        email: nextEmail ?? undefined,
        username: (row.username ?? null) !== (shared.username ?? null) ? row.username ?? null : undefined,
        display_name:
          (row.display_name ?? null) !== (shared.display_name ?? null)
            ? row.display_name ?? null
            : undefined,
      }).filter(([, value]) => value !== undefined),
    );

    if (Object.keys(patch).length > 0) {
      operations.push({ kind: "update", userId: row.user_id, payload: patch });
    }
  }

  const summary = {
    write,
    extCount: profileRows.length,
    sharedCount: (sharedRows ?? []).length,
    changeCount: operations.length,
    insertCount: operations.filter((operation) => operation.kind === "insert").length,
    updateCount: operations.filter((operation) => operation.kind === "update").length,
    sample: operations.slice(0, 10),
  };

  console.log(JSON.stringify(summary, null, 2));

  if (!write || operations.length === 0) {
    return;
  }

  for (const operation of operations) {
    if (operation.kind === "insert") {
      const { error } = await admin.from("profiles").upsert(operation.payload, { onConflict: "id" });
      if (error) throw error;
      continue;
    }

    const { error } = await admin.from("profiles").update(operation.payload).eq("id", operation.userId);
    if (error) throw error;
  }

  console.log(JSON.stringify({ applied: operations.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});