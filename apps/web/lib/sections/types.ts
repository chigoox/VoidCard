import { z } from "zod";

// 17 section types per BUILD_PLAN.md §11
export const SECTION_TYPES = [
  "header", "link", "image", "video", "spotify", "youtube",
  "map", "embed", "form", "gallery", "markdown", "divider",
  "spacer", "social", "qr", "tip", "schedule",
] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

const Base = z.object({
  id: z.string().uuid(),
  type: z.enum(SECTION_TYPES),
  visible: z.boolean().default(true),
});

const Header = Base.extend({
  type: z.literal("header"),
  props: z.object({
    avatarUrl: z.string().url().optional(),
    coverUrl: z.string().url().optional(),
    name: z.string(),
    handle: z.string().optional(),
    tagline: z.string().optional(),
    showVerified: z.boolean().default(true),
  }),
});

const Link = Base.extend({
  type: z.literal("link"),
  props: z.object({
    label: z.string(),
    url: z.string().url(),
    icon: z.string().optional(),
    style: z.enum(["pill", "card", "ghost"]).default("pill"),
  }),
});

const Image = Base.extend({
  type: z.literal("image"),
  props: z.object({ src: z.string().url(), alt: z.string().default(""), rounded: z.boolean().default(true) }),
});

const Video = Base.extend({ type: z.literal("video"), props: z.object({ src: z.string().url(), poster: z.string().url().optional() }) });
const Spotify = Base.extend({ type: z.literal("spotify"), props: z.object({ uri: z.string() }) });
const YouTube = Base.extend({ type: z.literal("youtube"), props: z.object({ id: z.string() }) });
const MapS = Base.extend({ type: z.literal("map"), props: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() }) });
const Embed = Base.extend({ type: z.literal("embed"), props: z.object({ html: z.string(), height: z.number().int().positive().max(1200) }) });
const Form = Base.extend({
  type: z.literal("form"),
  props: z.object({
    title: z.string(),
    fields: z.array(z.object({ name: z.string(), label: z.string(), required: z.boolean().default(false), type: z.enum(["text", "email", "phone", "textarea"]) })),
    successMessage: z.string().default("Thanks — we'll be in touch."),
    proLeadMode: z.boolean().default(false), // gated server-side
  }),
});
const Gallery = Base.extend({ type: z.literal("gallery"), props: z.object({ images: z.array(z.object({ src: z.string().url(), alt: z.string().default("") })).max(20) }) });
const Markdown = Base.extend({ type: z.literal("markdown"), props: z.object({ md: z.string().max(8000) }) });
const Divider = Base.extend({ type: z.literal("divider"), props: z.object({}).default({}) });
const Spacer = Base.extend({ type: z.literal("spacer"), props: z.object({ height: z.number().int().positive().max(200).default(24) }) });
const Social = Base.extend({
  type: z.literal("social"),
  props: z.object({
    items: z.array(z.object({
      platform: z.enum(["instagram", "tiktok", "x", "linkedin", "youtube", "threads", "github", "facebook", "snapchat"]),
      handle: z.string(),
    })).max(12),
  }),
});
const QR = Base.extend({ type: z.literal("qr"), props: z.object({ url: z.string().url(), label: z.string().optional() }) });
const Tip = Base.extend({ type: z.literal("tip"), props: z.object({ stripeAccountId: z.string(), amounts: z.array(z.number().int().positive()).default([200, 500, 1000]) }) });
const Schedule = Base.extend({ type: z.literal("schedule"), props: z.object({ provider: z.enum(["calcom", "calendly", "ed5"]), url: z.string().url() }) });

export const Section = z.discriminatedUnion("type", [
  Header, Link, Image, Video, Spotify, YouTube, MapS, Embed, Form, Gallery, Markdown, Divider, Spacer, Social, QR, Tip, Schedule,
]);
export type Section = z.infer<typeof Section>;
export const Sections = z.array(Section);
export type Sections = z.infer<typeof Sections>;
