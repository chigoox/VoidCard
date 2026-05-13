import { z } from "zod";

// 21 section types: 17 per BUILD_PLAN.md §11 + direct contact sections + 'store' (Stripe Connect storefront) + 'booking' (Boox).
export const SECTION_TYPES = [
  "header", "link", "phone", "email", "image", "video", "spotify", "youtube",
  "map", "embed", "form", "gallery", "markdown", "divider",
  "spacer", "social", "qr", "tip", "schedule", "store", "booking",
] as const;

export const STORE_LAYOUTS = ["grid", "list"] as const;
export const SOCIAL_DISPLAY_MODES = ["icon", "iconLabel", "label"] as const;
export type SectionType = (typeof SECTION_TYPES)[number];

export const SECTION_ANIMATIONS = [
  "none",
  "fade",
  "slide-up",
  "slide-down",
  "slide-left",
  "slide-right",
  "zoom",
  "float",
  "shimmer",
] as const;
export type SectionAnimation = (typeof SECTION_ANIMATIONS)[number];

export const SECTION_ANIMATION_TRIGGERS = ["load", "view", "hover", "tap"] as const;
export type SectionAnimationTrigger = (typeof SECTION_ANIMATION_TRIGGERS)[number];

const Display = z
  .object({
    animation: z.enum(SECTION_ANIMATIONS).default("none"),
    animationTrigger: z.enum(SECTION_ANIMATION_TRIGGERS).default("load"),
    animationDelay: z.number().min(0).max(2000).default(0),
  })
  .partial()
  .optional();

const Base = z.object({
  id: z.string().uuid(),
  type: z.enum(SECTION_TYPES),
  visible: z.boolean().default(true),
  display: Display,
});

const Header = Base.extend({
  type: z.literal("header"),
  props: z.object({
    avatarUrl: z.string().url().optional(),
    coverUrl: z.string().url().optional(),
    name: z.string(),
    handle: z.string().optional(),
    descriptors: z.array(z.string().trim().min(1).max(32)).max(6).optional(),
    tagline: z.string().optional(),
    saveContactName: z.string().trim().max(120).optional(),
    showSaveContact: z.boolean().default(true),
    showVerified: z.boolean().default(true),
    coverFullBleed: z.boolean().default(false),
    coverShadow: z.boolean().default(false),
  }),
});

const Link = Base.extend({
  type: z.literal("link"),
  props: z.object({
    label: z.string(),
    url: z.string().url(),
    icon: z.string().optional(),
    iconName: z.string().max(40).optional(),
    iconImageUrl: z.string().url().optional(),
    style: z.enum(["pill", "card", "ghost"]).default("pill"),
  }),
});

const Phone = Base.extend({
  type: z.literal("phone"),
  props: z.object({
    label: z.string().max(80).default("Call"),
    phone: z.string().min(1).max(40),
    note: z.string().max(120).optional(),
  }),
});

const Email = Base.extend({
  type: z.literal("email"),
  props: z.object({
    label: z.string().max(80).default("Email"),
    email: z.string().email(),
    subject: z.string().max(120).optional(),
  }),
});

const Image = Base.extend({
  type: z.literal("image"),
  props: z.object({ src: z.string().url(), alt: z.string().default(""), rounded: z.boolean().default(true), fullWidth: z.boolean().default(false) }),
});

const Video = Base.extend({ type: z.literal("video"), props: z.object({ src: z.string().url(), poster: z.string().url().optional() }) });
const Spotify = Base.extend({ type: z.literal("spotify"), props: z.object({ uri: z.string() }) });
const YouTube = Base.extend({ type: z.literal("youtube"), props: z.object({ id: z.string() }) });
const MapS = Base.extend({ type: z.literal("map"), props: z.object({ lat: z.number(), lng: z.number(), label: z.string().optional() }) });
const Embed = Base.extend({
  type: z.literal("embed"),
  props: z.object({
    html: z.string(),
    height: z.number().int().positive().max(1200),
    autoHeight: z.boolean().default(false),
    allowDomains: z.array(z.string()).max(20).default([]),
  }),
});
const Form = Base.extend({
  type: z.literal("form"),
  props: z.object({
    title: z.string(),
    fields: z.array(z.object({ name: z.string(), label: z.string(), required: z.boolean().default(false), type: z.enum(["text", "email", "phone", "textarea"]) })),
    successMessage: z.string().default("Thanks — we'll be in touch."),
    proLeadMode: z.boolean().default(false), // gated server-side
    consentText: z.string().max(400).optional(),
    requireConsent: z.boolean().default(false),
    requireCaptcha: z.boolean().default(false),
  }),
});
export const GALLERY_LAYOUTS = ["grid", "masonry", "carousel"] as const;
const Gallery = Base.extend({
  type: z.literal("gallery"),
  props: z.object({
    images: z.array(z.object({ src: z.string().url(), alt: z.string().default(""), category: z.string().max(40).optional() })).max(20),
    layout: z.enum(GALLERY_LAYOUTS).default("grid"),
    lightbox: z.boolean().default(true),
    carouselFullWidth: z.boolean().default(false),
    filters: z.array(z.string().max(40)).max(12).default([]),
    showCategoryStories: z.boolean().default(false),
  }),
});
const Markdown = Base.extend({ type: z.literal("markdown"), props: z.object({ md: z.string().max(8000) }) });
const Divider = Base.extend({ type: z.literal("divider"), props: z.object({}).default({}) });
const Spacer = Base.extend({ type: z.literal("spacer"), props: z.object({ height: z.number().int().positive().max(200).default(24) }) });
const Social = Base.extend({
  type: z.literal("social"),
  props: z.object({
    displayMode: z.enum(SOCIAL_DISPLAY_MODES).default("iconLabel"),
    items: z.array(z.object({
      platform: z.enum(["instagram", "tiktok", "x", "linkedin", "youtube", "threads", "github", "facebook", "snapchat"]),
      handle: z.string(),
    })).max(12),
  }),
});
const QR = Base.extend({ type: z.literal("qr"), props: z.object({ url: z.string().url(), label: z.string().optional() }) });
const Tip = Base.extend({ type: z.literal("tip"), props: z.object({ stripeAccountId: z.string(), amounts: z.array(z.number().int().positive()).default([200, 500, 1000]) }) });
const Schedule = Base.extend({ type: z.literal("schedule"), props: z.object({ provider: z.enum(["calcom", "calendly", "ed5"]), url: z.string().url() }) });
const Store = Base.extend({
  type: z.literal("store"),
  props: z.object({
    title: z.string().max(80).default("Shop"),
    productIds: z.array(z.string().uuid()).max(24).default([]),
    layout: z.enum(STORE_LAYOUTS).default("grid"),
    showPrice: z.boolean().default(true),
    buttonLabel: z.string().max(40).default("Buy now"),
  }),
});

const Booking = Base.extend({
  type: z.literal("booking"),
  props: z.object({
    provider: z.literal("boox").default("boox"),
    ownerSlug: z.string().min(1).max(64),
    mode: z.enum(["embed", "button"]).default("embed"),
    theme: z.enum(["onyx", "light"]).default("onyx"),
    height: z.number().int().positive().max(4000).default(820),
    ctaLabel: z.string().max(40).default("Book now"),
  }),
});

export const Section = z.discriminatedUnion("type", [
  Header, Link, Phone, Email, Image, Video, Spotify, YouTube, MapS, Embed, Form, Gallery, Markdown, Divider, Spacer, Social, QR, Tip, Schedule, Store, Booking,
]);
export type Section = z.infer<typeof Section>;
export const Sections = z.array(Section);
export type Sections = z.infer<typeof Sections>;
