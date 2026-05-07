// Seeds one reusable marketing demo account with three public VoidCard profiles.
// Usage: node scripts/seed-marketing-demo-profiles.mjs

import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import path from "node:path";
import process from "node:process";
import { randomUUID } from "node:crypto";

function cleanEnvValue(value) {
  if (typeof value !== "string") return value;
  return value.trim().replace(/^["']|["']$/g, "");
}

function loadEnvFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  for (const line of fs.readFileSync(filePath, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const separatorIndex = trimmed.indexOf("=");
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    if (!key || process.env[key]) continue;
    process.env[key] = cleanEnvValue(trimmed.slice(separatorIndex + 1));
  }
}

loadEnvFile(path.join(process.cwd(), ".env.local"));

const supabaseUrl = cleanEnvValue(process.env.NEXT_PUBLIC_SUPABASE_URL);
const serviceRoleKey = cleanEnvValue(process.env.SUPABASE_SERVICE_ROLE_KEY);

if (!supabaseUrl || !serviceRoleKey) {
  throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in apps/web/.env.local");
}

const admin = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const EMAIL = "demo+marketing@vcard.ed5enterprise.com";
const PASSWORD = process.env.MARKETING_DEMO_PASSWORD || `VoidCard-Demo-${new Date().getUTCFullYear()}!`;
const SITE = "https://vcard.ed5enterprise.com";

const DEMOS = [
  {
    source: "primary",
    username: "demo-creator",
    displayName: "Mira Vale",
    bio: "Editorial photographer and launch-content director. Book a shoot, browse recent work, or grab the studio kit.",
    theme: "paper-white",
    avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=512&q=80",
    cover: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80",
    customCss: ".vc-profile [data-section-type='link']{letter-spacing:.02em}.vc-profile [data-section-type='gallery'] img{filter:saturate(1.02)}",
    sections: [
      header("demo-creator", "Mira Vale", "Photo campaigns, launch reels, and brand systems for founders.", "https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=512&q=80", "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1400&q=80", true),
      link("Book campaign call", "https://cal.com/voidcard/demo-creator", "calendar", "pill"),
      link("Download media kit", "https://example.com/media-kit", "pdf", "card"),
      gallery("masonry", [
        ["https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=900&q=80", "Studio camera setup"],
        ["https://images.unsplash.com/photo-1516035069371-29a1b244cc32?auto=format&fit=crop&w=900&q=80", "Portrait camera lens"],
        ["https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80", "Editorial shoot detail"],
        ["https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80", "Creative direction table"],
        ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", "Outdoor campaign scene"],
        ["https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80", "Content review workspace"],
      ]),
      video("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=1200&q=80"),
      social([
        ["instagram", "miravale.studio"],
        ["linkedin", "in/miravale"],
        ["youtube", "@miravale"],
      ]),
    ],
    links: [
      { label: "Book campaign call", url: "https://cal.com/voidcard/demo-creator" },
      { label: "Download media kit", url: "https://example.com/media-kit" },
    ],
  },
  {
    source: "secondary",
    username: "demo-coach",
    displayName: "Kai Morgan",
    bio: "Performance coach for founders and sales teams. Programs, speaking, private sessions, and weekly field notes.",
    theme: "emerald-vault",
    avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=512&q=80",
    cover: "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80",
    customCss: ".vc-profile [data-section-type='markdown'] strong{color:var(--vc-accent)}",
    sections: [
      header("demo-coach", "Kai Morgan", "Founder energy, team focus, and durable routines.", "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=512&q=80", "https://images.unsplash.com/photo-1517836357463-d25dfeac3438?auto=format&fit=crop&w=1400&q=80", true),
      markdown("**Now booking:** Q3 founder intensives, sales-team reset workshops, and keynote dates."),
      link("Apply for private coaching", "https://example.com/apply", "apply", "pill"),
      schedule("calcom", "https://cal.com/voidcard/demo-coach"),
      youtube("ysz5S6PUM-U"),
      image("https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=1200&q=80", "Training session", true),
      form("Ask about a program", [
        { name: "email", label: "Email", type: "email", required: true },
        { name: "goal", label: "What are you building?", type: "textarea", required: false },
      ]),
      social([
        ["instagram", "kaimorgan.coach"],
        ["linkedin", "in/kaimorgan"],
        ["threads", "kaimorgan"],
      ]),
    ],
    links: [
      { label: "Apply for private coaching", url: "https://example.com/apply" },
      { label: "Book intro", url: "https://cal.com/voidcard/demo-coach" },
    ],
  },
  {
    source: "secondary",
    username: "demo-studio",
    displayName: "Northline Studio",
    bio: "A design and fabrication studio for interiors, pop-ups, and limited-run retail displays.",
    theme: "sapphire-cardinal",
    avatar: "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=512&q=80",
    cover: "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80",
    customCss: ".vc-profile [data-section-type='image']{box-shadow:0 20px 60px -35px var(--vc-accent)}",
    sections: [
      header("demo-studio", "Northline Studio", "Objects, spaces, pop-ups, and small-batch retail systems.", "https://images.unsplash.com/photo-1542744173-8e7e53415bb0?auto=format&fit=crop&w=512&q=80", "https://images.unsplash.com/photo-1497366811353-6870744d04b2?auto=format&fit=crop&w=1400&q=80", true),
      link("View current portfolio", "https://example.com/portfolio", "work", "card"),
      gallery("grid", [
        ["https://images.unsplash.com/photo-1497366754035-f200968a6e72?auto=format&fit=crop&w=900&q=80", "Studio tables"],
        ["https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80", "Interior vignette"],
        ["https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80", "Architectural detail"],
        ["https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=900&q=80", "Retail atmosphere"],
        ["https://images.unsplash.com/photo-1483058712412-4245e9b90334?auto=format&fit=crop&w=900&q=80", "Design desktop"],
        ["https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=900&q=80", "Installation geometry"],
      ]),
      video("https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4", "https://images.unsplash.com/photo-1518005020951-eccb494ad742?auto=format&fit=crop&w=1200&q=80"),
      map(40.7409, -73.9897, "New York studio visits by appointment"),
      qr(`${SITE}/u/demo-studio`, "Scan the studio profile"),
      social([
        ["instagram", "northline.studio"],
        ["linkedin", "company/northline-studio"],
        ["facebook", "northlinestudio"],
      ]),
    ],
    links: [
      { label: "View current portfolio", url: "https://example.com/portfolio" },
      { label: "Studio visit", url: `${SITE}/u/demo-studio` },
    ],
  },
];

function section(type, props) {
  return { id: randomUUID(), type, visible: true, props };
}

function header(handle, name, tagline, avatarUrl, coverUrl, coverFullBleed = false) {
  return section("header", { handle, name, tagline, avatarUrl, coverUrl, showVerified: true, coverFullBleed });
}

function link(label, url, icon, style = "pill") {
  return section("link", { label, url, icon, style });
}

function image(src, alt, rounded) {
  return section("image", { src, alt, rounded });
}

function video(src, poster) {
  return section("video", { src, poster });
}

function youtube(id) {
  return section("youtube", { id });
}

function markdown(md) {
  return section("markdown", { md });
}

function gallery(layout, images) {
  return section("gallery", { layout, lightbox: true, images: images.map(([src, alt]) => ({ src, alt })) });
}

function schedule(provider, url) {
  return section("schedule", { provider, url });
}

function form(title, fields) {
  return section("form", {
    title,
    fields,
    successMessage: "Thanks. We will follow up shortly.",
    proLeadMode: true,
    requireConsent: false,
    requireCaptcha: false,
  });
}

function map(lat, lng, label) {
  return section("map", { lat, lng, label });
}

function qr(url, label) {
  return section("qr", { url, label });
}

function social(items) {
  return section("social", { items: items.map(([platform, handle]) => ({ platform, handle })) });
}

async function findUserByEmail(email) {
  const { data: profile } = await admin.from("profiles").select("id").eq("email", email).maybeSingle();
  if (profile?.id) return profile.id;
  return null;
}

async function ensureDemoUser() {
  const existingId = await findUserByEmail(EMAIL);
  if (existingId) return existingId;

  const { data, error } = await admin.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: "VoidCard Marketing Demo" },
  });
  if (error) {
    throw new Error(`Could not create ${EMAIL}. If the Auth user already exists, add its id to public.profiles.email first. ${error.message}`);
  }
  if (!data.user?.id) throw new Error("Supabase did not return a demo user id.");
  return data.user.id;
}

async function upsertSharedProfile(userId, primary) {
  const { error } = await admin.from("profiles").upsert(
    {
      id: userId,
      email: EMAIL,
      username: primary.username,
      display_name: "VoidCard Marketing Demo",
      role: "user",
    },
    { onConflict: "id" },
  );
  if (error) throw error;
}

async function upsertEntitlements(userId) {
  const subscriptionPayload = {
    user_id: userId,
    stripe_customer_id: "cus_marketing_demo",
    stripe_subscription_id: "sub_marketing_demo",
    plan: "pro",
    interval: "month",
    status: "active",
    current_period_end: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    seats: 1,
  };
  const { data: existingSubscription, error: subscriptionLookupError } = await admin
    .from("vcard_subscriptions")
    .select("id")
    .eq("user_id", userId)
    .is("team_id", null)
    .limit(1)
    .maybeSingle();
  if (subscriptionLookupError) throw subscriptionLookupError;
  const subscriptionResult = existingSubscription?.id
    ? await admin.from("vcard_subscriptions").update(subscriptionPayload).eq("id", existingSubscription.id)
    : await admin.from("vcard_subscriptions").insert(subscriptionPayload);
  if (subscriptionResult.error) throw subscriptionResult.error;

  const { data: existingVerification, error: lookupError } = await admin
    .from("vcard_verifications")
    .select("id")
    .eq("user_id", userId)
    .eq("status", "approved")
    .limit(1)
    .maybeSingle();
  if (lookupError) throw lookupError;
  if (!existingVerification) {
    const { error } = await admin.from("vcard_verifications").insert({
      user_id: userId,
      method: "earned",
      status: "approved",
      decided_at: new Date().toISOString(),
    });
    if (error) throw error;
  }
}

async function upsertPrimary(userId, profile) {
  const { error } = await admin.from("vcard_profile_ext").upsert(
    {
      user_id: userId,
      username: profile.username,
      display_name: profile.displayName,
      bio: profile.bio,
      avatar_url: profile.avatar,
      theme: { id: profile.theme },
      custom_css: profile.customCss,
      sections: profile.sections,
      sections_draft: profile.sections,
      published: true,
      verified: true,
      plan: "pro",
      remove_branding: false,
      is_indexable: true,
      ai_indexing: "allow_all",
      origin_site: "vcard.ed5enterprise.com",
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}

async function upsertSecondary(userId, profile) {
  const { error } = await admin.from("vcard_profiles").upsert(
    {
      owner_user_id: userId,
      username: profile.username,
      display_name: profile.displayName,
      bio: profile.bio,
      avatar_url: profile.avatar,
      theme: { id: profile.theme },
      custom_css: profile.customCss,
      sections: profile.sections,
      sections_draft: profile.sections,
      links: profile.links,
      published: true,
      remove_branding: false,
      is_indexable: true,
      ai_indexing: "allow_all",
      deleted_at: null,
    },
    { onConflict: "username" },
  );
  if (error) throw error;
}

async function main() {
  const userId = await ensureDemoUser();
  const primary = DEMOS.find((profile) => profile.source === "primary");
  if (!primary) throw new Error("No primary demo profile configured.");

  await upsertSharedProfile(userId, primary);
  await upsertEntitlements(userId);
  await upsertPrimary(userId, primary);

  for (const profile of DEMOS.filter((entry) => entry.source === "secondary")) {
    await upsertSecondary(userId, profile);
  }

  console.log(JSON.stringify({
    userId,
    email: EMAIL,
    usernames: DEMOS.map((profile) => profile.username),
    publicUrls: DEMOS.map((profile) => `${SITE}/u/${profile.username}`),
  }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});