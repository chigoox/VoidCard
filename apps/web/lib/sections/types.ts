import { z } from "zod";

// 24 section types: 17 per BUILD_PLAN.md §11 + direct contact sections + 'store' (Stripe Connect storefront) + 'booking' (Boox)
// + landing-page blocks: 'stats', 'testimonial', 'feature'.
export const SECTION_TYPES = [
  "header", "link", "phone", "email", "image", "video", "spotify", "youtube",
  "map", "embed", "form", "gallery", "markdown", "divider",
  "spacer", "social", "qr", "tip", "schedule", "store", "booking",
  "stats", "testimonial", "feature",
] as const;

// Media can be an absolute URL (uploads, CDN) or a site-relative path for
// first-party assets such as the designed templates' banners.
export const MediaUrl = z.union([
  z.string().url().refine((v) => /^https?:\/\//i.test(v), "Use an http(s) link"),
  z.string().max(512).regex(/^\/(?!\/)[A-Za-z0-9._~\-/]+$/),
]);

export const STORE_LAYOUTS = ["grid", "list"] as const;
export const LINK_STYLES = ["pill", "card", "ghost", "gold", "glass", "outline", "underline", "neon"] as const;
export type LinkStyle = (typeof LINK_STYLES)[number];
export const AVATAR_SHAPES = ["circle", "rounded", "square"] as const;
export const AVATAR_RINGS = ["accent", "gradient", "none"] as const;
export const HEADER_LAYOUTS = ["center", "left", "hero"] as const;
export const VIDEO_ASPECTS = ["16/9", "21/9", "4/5", "1/1", "9/16"] as const;
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
  // Premium entrances
  "blur-in",
  "rise",
  "reveal",
  "scale-in",
  "flip-in",
  "tilt-in",
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

export const DESKTOP_GRID_COLUMNS = 12;
export const DESKTOP_MAX_ROWS = 400;
export const DESKTOP_CELL_ALIGNS = ["start", "center", "end", "stretch"] as const;
export type DesktopCellAlign = (typeof DESKTOP_CELL_ALIGNS)[number];

// Placement on the 12-column desktop grid. x/y are zero-based grid cells;
// w/h are spans. Rows are a minimum height — content taller than its tile
// grows the row on the public page instead of being clipped.
export const DesktopPlacement = z.object({
  x: z.number().int().min(0).max(DESKTOP_GRID_COLUMNS - 1),
  y: z.number().int().min(0).max(DESKTOP_MAX_ROWS),
  w: z.number().int().min(1).max(DESKTOP_GRID_COLUMNS),
  h: z.number().int().min(1).max(60),
  align: z.enum(DESKTOP_CELL_ALIGNS).optional(),
  sticky: z.boolean().optional(),
});
export type DesktopPlacement = z.infer<typeof DesktopPlacement>;

const HEX_COLOR = /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i;
// Tile images are interpolated into an inline CSS url(), so only plain https
// URLs without quotes, parens, backslashes or whitespace are accepted.
const SAFE_CSS_URL = /^https:\/\/[^\s"'()\\<>]+$/;

export const TILE_TEXT_MODES = ["auto", "light", "dark"] as const;
export const TileStyle = z.object({
  color: z.string().regex(HEX_COLOR).optional(),
  image: z.string().max(2048).regex(SAFE_CSS_URL).optional(),
  overlay: z.number().int().min(0).max(90).optional(), // % black over the image
  padding: z.number().int().min(0).max(64).optional(),
  radius: z.number().int().min(0).max(48).optional(),
  text: z.enum(TILE_TEXT_MODES).optional(),
});
export type TileStyle = z.infer<typeof TileStyle>;

const Layout = z
  .object({
    desktop: DesktopPlacement.optional(),
    tablet: DesktopPlacement.optional(),
    tile: TileStyle.optional(),
    // hideOnDesktop applies to tablets and desktops (>=768px); hideOnMobile to phones.
    hideOnDesktop: z.boolean().optional(),
    hideOnMobile: z.boolean().optional(),
  })
  .optional();
export type SectionLayout = z.infer<typeof Layout>;

// ─── Premium per-section design ───────────────────────────────────────────
export const DESIGN_SURFACES = ["none", "card", "glass", "outline", "gradient", "foil", "spotlight"] as const;
export const DESIGN_SHADOWS = ["none", "soft", "lift", "glow"] as const;
export const DESIGN_HOVERS = ["none", "lift", "glow", "tilt", "shine", "press"] as const;
export const DESIGN_AMBIENTS = ["none", "float", "breathe", "shimmer", "aurora", "border-flow"] as const;
export const DESIGN_ALIGNS = ["start", "center", "end"] as const;
export const DESIGN_SCALES = ["sm", "md", "lg", "xl"] as const;
export const DESIGN_FONTS = ["inherit", "display", "sans", "mono"] as const;

const HexColor = z.string().regex(/^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i);

export const SectionDesign = z.object({
  surface: z.enum(DESIGN_SURFACES).optional(),
  shadow: z.enum(DESIGN_SHADOWS).optional(),
  hover: z.enum(DESIGN_HOVERS).optional(),
  ambient: z.enum(DESIGN_AMBIENTS).optional(),
  align: z.enum(DESIGN_ALIGNS).optional(),
  scale: z.enum(DESIGN_SCALES).optional(),
  font: z.enum(DESIGN_FONTS).optional(),
  // Colours are emitted into inline CSS custom properties, so strictly hex.
  accent: HexColor.optional(),
  text: HexColor.optional(),
  bg: HexColor.optional(),
  bg2: HexColor.optional(), // second stop: makes the background a gradient
  gradientAngle: z.number().int().min(0).max(360).optional(),
  border: HexColor.optional(),
  borderWidth: z.number().int().min(0).max(8).optional(),
  letterSpacing: z.number().int().min(-5).max(40).optional(), // hundredths of an em
  uppercase: z.boolean().optional(),
  speed: z.enum(["slow", "normal", "fast"]).optional(), // ambient + entrance tempo
  radius: z.number().int().min(0).max(48).optional(),
  padding: z.number().int().min(0).max(64).optional(),
  // Photo or looping video painted behind the section's content.
  media: z.object({
    image: MediaUrl.optional(),
    video: MediaUrl.optional(),
    overlay: z.number().int().min(0).max(90).optional(),
    minHeight: z.number().int().min(0).max(900).optional(),
  }).optional(),
  preset: z.string().max(32).optional(),
});
export type SectionDesign = z.infer<typeof SectionDesign>;

const Base = z.object({
  id: z.string().uuid(),
  type: z.enum(SECTION_TYPES),
  visible: z.boolean().default(true),
  display: Display,
  layout: Layout,
  design: SectionDesign.optional(),
});

const Header = Base.extend({
  type: z.literal("header"),
  props: z.object({
    avatarUrl: z.string().url().optional(),
    coverUrl: MediaUrl.optional(),
    // Looping, muted banner video; coverUrl doubles as its poster.
    coverVideoUrl: MediaUrl.optional(),
    name: z.string(),
    handle: z.string().optional(),
    descriptors: z.array(z.string().trim().min(1).max(32)).max(6).optional(),
    tagline: z.string().optional(),
    saveContactName: z.string().trim().max(120).optional(),
    showSaveContact: z.boolean().default(true),
    showVerified: z.boolean().default(true),
    coverFullBleed: z.boolean().default(false),
    coverShadow: z.boolean().default(false),
    avatarShape: z.enum(AVATAR_SHAPES).optional(),
    avatarRing: z.enum(AVATAR_RINGS).optional(),
    layout: z.enum(HEADER_LAYOUTS).optional(),
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
    style: z.enum(LINK_STYLES).default("pill"),
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
  props: z.object({ src: MediaUrl, alt: z.string().default(""), rounded: z.boolean().default(true), fullWidth: z.boolean().default(false) }),
});

const Video = Base.extend({
  type: z.literal("video"),
  props: z.object({
    src: MediaUrl,
    poster: MediaUrl.optional(),
    // Ambient: autoplays muted and loops with no controls, like a moving photo.
    ambient: z.boolean().optional(),
    aspect: z.enum(VIDEO_ASPECTS).optional(),
    caption: z.string().max(140).optional(),
  }),
});
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
    images: z.array(z.object({ src: MediaUrl, alt: z.string().default(""), category: z.string().max(40).optional() })).max(20),
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

const Stats = Base.extend({
  type: z.literal("stats"),
  props: z.object({
    title: z.string().max(80).optional(),
    countUp: z.boolean().optional(),
    items: z.array(z.object({
      value: z.string().trim().min(1).max(24),
      label: z.string().max(60).default(""),
    })).min(1).max(6),
  }),
});

const Testimonial = Base.extend({
  type: z.literal("testimonial"),
  props: z.object({
    quote: z.string().trim().min(1).max(600),
    author: z.string().max(80).default(""),
    role: z.string().max(80).optional(),
    avatarUrl: z.string().url().optional(),
    rating: z.number().int().min(0).max(5).optional(),
  }),
});

const Feature = Base.extend({
  type: z.literal("feature"),
  props: z.object({
    icon: z.string().max(40).optional(), // LinkIcon glyph name or a short emoji
    title: z.string().trim().min(1).max(80),
    body: z.string().max(400).default(""),
    ctaLabel: z.string().max(40).optional(),
    ctaUrl: z.string().url().optional(),
  }),
});

export const Section = z.discriminatedUnion("type", [
  Header, Link, Phone, Email, Image, Video, Spotify, YouTube, MapS, Embed, Form, Gallery, Markdown, Divider, Spacer, Social, QR, Tip, Schedule, Store, Booking,
  Stats, Testimonial, Feature,
]);
export type Section = z.infer<typeof Section>;
export const Sections = z.array(Section);
export type Sections = z.infer<typeof Sections>;
