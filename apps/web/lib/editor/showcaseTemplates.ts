// Fully designed starting points. Each sets a theme, a desktop layout
// and per-section design, so no two look alike out of the box.

import type { Section as SectionRecord, SectionDesign, Sections } from "@/lib/sections/types";
import type { DesktopLayoutSettings, DesktopPresetId } from "@/lib/sections/desktopLayout";

export type ShowcaseTemplate = {
  id: string;
  name: string;
  description: string;
  themeId: string;
  desktop: Partial<DesktopLayoutSettings> & { preset: DesktopPresetId };
  build: (handle: string) => Sections;
};

const uid = () => crypto.randomUUID();
type Anim = NonNullable<SectionRecord["display"]>["animation"];

function motion(animation: Anim, delay = 0, trigger: "load" | "view" = "view"): SectionRecord["display"] {
  return { animation, animationTrigger: trigger, animationDelay: delay };
}

function header(props: { name: string; handle: string; tagline: string; descriptors?: string[]; avatarShape?: "circle" | "rounded" | "square"; avatarRing?: "accent" | "gradient" | "none"; layout?: "center" | "left" | "hero"; coverUrl?: string; coverVideoUrl?: string }, design: SectionDesign, display?: SectionRecord["display"]): SectionRecord {
  return { id: uid(), type: "header", visible: true, design, display, props: { ...props, showSaveContact: true, showVerified: true, coverFullBleed: false, coverShadow: false } };
}
function stats(items: Array<[string, string]>, design: SectionDesign, title?: string, display?: SectionRecord["display"], countUp = true): SectionRecord {
  return { id: uid(), type: "stats", visible: true, design, display, props: { title, countUp, items: items.map(([value, label]) => ({ value, label })) } };
}
function feature(icon: string, title: string, body: string, design: SectionDesign, display?: SectionRecord["display"], cta?: [string, string]): SectionRecord {
  return { id: uid(), type: "feature", visible: true, design, display, props: { icon, title, body, ...(cta ? { ctaLabel: cta[0], ctaUrl: cta[1] } : {}) } };
}
function quote(text: string, author: string, role: string, design: SectionDesign, display?: SectionRecord["display"], rating = 5): SectionRecord {
  return { id: uid(), type: "testimonial", visible: true, design, display, props: { quote: text, author, role, rating } };
}
function link(label: string, url: string, style: "pill" | "card" | "ghost" | "gold" | "glass" | "outline" | "underline" | "neon", display?: SectionRecord["display"], design?: SectionDesign): SectionRecord {
  return { id: uid(), type: "link", visible: true, display, design, props: { label, url, style } };
}
function text(md: string, design: SectionDesign, display?: SectionRecord["display"]): SectionRecord {
  return { id: uid(), type: "markdown", visible: true, design, display, props: { md } };
}
function social(handle: string, platforms: Array<"instagram" | "tiktok" | "x" | "linkedin" | "youtube">, design?: SectionDesign): SectionRecord {
  return { id: uid(), type: "social", visible: true, design, props: { displayMode: "iconLabel", items: platforms.map((platform) => ({ platform, handle })) } };
}
function image(src: string, alt: string, design?: SectionDesign, display?: SectionRecord["display"]): SectionRecord {
  return { id: uid(), type: "image", visible: true, design, display, props: { src, alt, rounded: true, fullWidth: false } };
}
function ambientVideo(src: string, poster: string, aspect: "16/9" | "21/9" | "4/5" | "1/1", caption?: string, display?: SectionRecord["display"]): SectionRecord {
  return { id: uid(), type: "video", visible: true, display, props: { src, poster, ambient: true, aspect, caption } };
}

// First-party media shipped in /public (see scripts/showcase-media).
const M = {
  // Note: the marketing file names don't match their content.
  portrait: "/marketing/doctor-use-case.png", // two women in black tailoring, portrait
  handoff: "/marketing/handoff-hero.png", // couple exchanging a card at a bar
  gold: "/showcase/gold-dust.mp4",
  goldStill: "/showcase/gold-dust.jpg",
  aurora: "/showcase/aurora-silk.mp4",
  auroraStill: "/showcase/aurora-silk.jpg",
  auroraStill2: "/showcase/aurora-silk-2.jpg",
  auroraStill3: "/showcase/aurora-silk-3.jpg",
  light: "/showcase/light-shadow.mp4",
  lightStill: "/showcase/light-shadow.jpg",
  neon: "/showcase/neon-grid.mp4",
  neonStill: "/showcase/neon-grid.jpg",
  neonStill2: "/showcase/neon-grid-2.jpg",
  botanical: "/showcase/botanical-light.mp4",
  botanicalStill: "/showcase/botanical-light.jpg",
};

// Photo slots for the business templates. Swap a path here to re-shoot a
// template; every section that uses the slot follows.
const P = {
  fashionHero: M.portrait,
  fashionLook1: "/marketing/luxury-banner.png",
  fashionLook2: M.handoff,
  fashionLook3: M.portrait,
  hairHero: "/marketing/luxury-banner.png",
  hairWork1: "/marketing/luxury-banner.png",
  hairWork2: M.portrait,
  hairWork3: M.handoff,
  musicHero: M.handoff,
  musicStage: M.neonStill2,
  nailsHero: "/marketing/luxury-banner.png",
  nailsSet1: M.auroraStill2,
  nailsSet2: M.auroraStill3,
  nailsSet3: M.auroraStill,
};

function gallery(photos: Array<[string, string]>, design: SectionDesign, display?: SectionRecord["display"], layout: "grid" | "masonry" | "carousel" = "grid"): SectionRecord {
  return { id: uid(), type: "gallery", visible: true, design, display, props: { images: photos.map(([src, alt]) => ({ src, alt })), layout, lightbox: true, carouselFullWidth: false, filters: [], showCategoryStories: false } };
}
function booking(handle: string, ctaLabel: string, display?: SectionRecord["display"], design?: SectionDesign): SectionRecord {
  // Button mode works before a Boox account is connected; switch to "embed"
  // in the editor to show the live calendar inline.
  return { id: uid(), type: "booking", visible: true, display, design, props: { provider: "boox", ownerSlug: handle, mode: "button", theme: "onyx", height: 820, ctaLabel } };
}

function email(label: string, address: string, design?: SectionDesign): SectionRecord {
  return { id: uid(), type: "email", visible: true, design, props: { label, email: address } };
}

export const SHOWCASE_TEMPLATES: ShowcaseTemplate[] = [
  {
    id: "maison-noir",
    name: "Maison Noir",
    description: "Luxury stylist · gold foil, pinned sidebar, onyx.",
    themeId: "onyx-gold",
    desktop: { preset: "sidebar", maxWidth: 1240, gap: 22, rowHeight: 40, tiles: "none" },
    build: (handle) => [
      header(
        { name: "Maison Noir", handle, tagline: "Private wardrobe styling for people who dress with intent.", descriptors: ["Paris", "London", "By appointment"], layout: "hero", coverUrl: M.portrait },
        { radius: 30, shadow: "lift" },
        motion("blur-in", 0, "load"),
      ),
      stats([["14", "Years dressing clients"], ["1,200+", "Looks composed"], ["98%", "Clients who return"]], { surface: "foil", ambient: "border-flow", shadow: "glow", radius: 26, padding: 34, align: "start", speed: "slow", media: { video: M.gold, image: M.goldStill, overlay: 25, minHeight: 200 } }, "The atelier", motion("rise", 80)),
      feature("calendar", "Private consultation", "Ninety minutes in your wardrobe or ours. We edit first, then build — one inevitable piece at a time.", { surface: "card", shadow: "lift", hover: "lift", radius: 26, padding: 30, align: "start" }, motion("rise", 140), ["Reserve a date", "https://example.com/book"]),
      feature("briefcase", "Travel capsule", "A complete, packable wardrobe for your next season abroad — delivered pressed.", { surface: "card", shadow: "lift", hover: "lift", radius: 26, padding: 30, align: "start" }, motion("rise", 200)),
      image(M.handoff, "A client handing over her Maison Noir card over evening drinks", { radius: 26, shadow: "lift", hover: "shine" }, motion("reveal", 100)),
      quote("She saw the version of me I kept putting off. Every piece still feels inevitable.", "Camille R.", "Gallery director, Paris", { surface: "outline", font: "display", scale: "lg", radius: 26, padding: 34, align: "start" }, motion("reveal", 120)),
      link("Book a consultation", "https://example.com/book", "gold", motion("rise", 240)),
      link("View the lookbook", "https://example.com/lookbook", "glass", motion("rise", 300)),
      social(handle, ["instagram", "tiktok"]),
    ],
  },
  {
    id: "aurora-studio",
    name: "Aurora Studio",
    description: "Creative agency · aurora gradients, bento, 3D tilt.",
    themeId: "obsidian-amethyst",
    desktop: { preset: "bento", maxWidth: 1280, gap: 18, rowHeight: 36, tiles: "none" },
    build: (handle) => [
      header(
        { name: "Aurora Studio", handle, tagline: "Brand worlds for companies that refuse to look ordinary.", descriptors: ["Identity", "Motion", "Digital"], layout: "hero", coverUrl: M.auroraStill, coverVideoUrl: M.aurora },
        { radius: 34, shadow: "lift", accent: "#f0abfc" },
        motion("blur-in", 0, "load"),
      ),
      stats([["86", "Brands launched"], ["12", "Design awards"], ["4 wks", "Average sprint"]], { surface: "spotlight", hover: "tilt", shadow: "lift", radius: 28, padding: 30, accent: "#c084fc" }, undefined, motion("scale-in", 60)),
      feature("star", "Identity", "Names, marks and systems with a point of view.", { hover: "tilt", shadow: "lift", radius: 28, padding: 28, accent: "#f0abfc", media: { image: M.auroraStill2, overlay: 45, minHeight: 240 } }, motion("tilt-in", 100)),
      feature("video", "Motion", "Logos that breathe. Launch films that stop thumbs.", { surface: "glass", hover: "tilt", shadow: "lift", radius: 28, padding: 28, accent: "#a5b4fc" }, motion("tilt-in", 180)),
      feature("globe", "Digital", "Sites and products that feel as good as they look.", { hover: "tilt", shadow: "lift", radius: 28, padding: 28, accent: "#67e8f9", media: { image: M.auroraStill3, overlay: 45, minHeight: 240 } }, motion("tilt-in", 260)),
      quote("Aurora didn't redesign our brand — they gave it a pulse. Sign-ups doubled in a month.", "Maya Chen", "Founder, Lumen", { surface: "card", shadow: "lift", radius: 28, padding: 32, bg: "#12051f", border: "#7c3aed", borderWidth: 1, accent: "#f0abfc" }, motion("rise", 120)),
      link("Start a project", "https://example.com/start", "neon", motion("rise", 200), { accent: "#e879f9" }),
      link("See case studies", "https://example.com/work", "glass", motion("rise", 260)),
    ],
  },
  {
    id: "ivory-stone",
    name: "Ivory & Stone",
    description: "Architecture studio · editorial serif, magazine layout.",
    themeId: "ivory-noir",
    desktop: { preset: "magazine", maxWidth: 1180, gap: 28, rowHeight: 40, tiles: "none" },
    build: (handle) => [
      header(
        { name: "Ivory & Stone", handle, tagline: "Architecture and interiors, drawn by hand, built to last a century.", descriptors: ["Residential", "Hospitality", "Est. 1998"], layout: "hero", coverUrl: M.lightStill, coverVideoUrl: M.light },
        { radius: 4, letterSpacing: -2 },
        motion("reveal", 0, "load"),
      ),
      text("## Practice\nWe design quiet buildings for loud cities — rooms that hold light, age gracefully and ask nothing of the people inside them.", { surface: "outline", font: "display", align: "start", radius: 2, padding: 34, borderWidth: 1 }, motion("reveal", 120)),
      stats([["40", "Buildings completed"], ["9", "Countries"], ["26", "Years in practice"]], { surface: "outline", font: "display", align: "start", radius: 2, padding: 30 }, "In numbers", motion("reveal", 180)),
      feature("map-pin", "Residences", "Private homes from Lisbon to Kyoto, each drawn around a single view.", { surface: "outline", hover: "lift", align: "start", radius: 2, padding: 30 }, motion("reveal", 220), ["Selected homes", "https://example.com/homes"]),
      feature("briefcase", "Hospitality", "Hotels and restaurants designed to be remembered, not photographed.", { surface: "outline", hover: "lift", align: "start", radius: 2, padding: 30 }, motion("reveal", 280), ["Selected work", "https://example.com/hospitality"]),
      quote("They listened for a year before drawing a single line. The house feels like it was always there.", "Henrik & Sofia L.", "Clients, Copenhagen", { font: "display", scale: "lg", align: "start", padding: 12 }, motion("reveal", 160)),
      link("Studio journal", "https://example.com/journal", "underline"),
      link("Enquiries", "https://example.com/contact", "underline"),
      email("Write to the studio", "studio@example.com", { surface: "outline", radius: 2, padding: 6 }),
    ],
  },
  {
    id: "nova-nights",
    name: "Nova Nights",
    description: "DJ & artist · neon glow, breathing light, mono type.",
    themeId: "tokyo-nights",
    desktop: { preset: "bento", maxWidth: 1240, gap: 16, rowHeight: 32, tiles: "none" },
    build: (handle) => [
      header(
        { name: "DJ NOVA", handle, tagline: "Deep house & late-night techno · Tokyo → Berlin", descriptors: ["Resident @ Void", "Afterglow EP out now"], layout: "hero", coverUrl: M.neonStill, coverVideoUrl: M.neon },
        { shadow: "glow", ambient: "breathe", accent: "#f472b6", radius: 22, uppercase: true, letterSpacing: 4 },
        motion("scale-in", 0, "load"),
      ),
      stats([["48M", "Streams"], ["120", "Shows a year"], ["3", "Continents"]], { surface: "glass", shadow: "glow", accent: "#f472b6", font: "mono", radius: 20, padding: 26 }, undefined, motion("rise", 80)),
      feature("calendar", "Berlin · Oct 12", "Headline set at Void, 02:00 till close. Last 200 tickets.", { hover: "glow", accent: "#22d3ee", font: "mono", radius: 20, padding: 26, media: { image: M.neonStill2, overlay: 55, minHeight: 220 } }, motion("flip-in", 120), ["Get tickets", "https://example.com/tickets"]),
      feature("music", "Afterglow EP", "Four tracks for the hour after the lights come up.", { surface: "glass", hover: "glow", ambient: "float", accent: "#f472b6", font: "mono", radius: 20, padding: 26, speed: "slow" }, motion("flip-in", 200), ["Listen now", "https://example.com/listen"]),
      link("Listen on Spotify", "https://open.spotify.com", "neon", motion("rise", 240), { accent: "#22d3ee" }),
      link("Tour tickets", "https://example.com/tickets", "neon", motion("rise", 300), { accent: "#f472b6" }),
      link("Booking & press", "https://example.com/booking", "outline", motion("rise", 360), { accent: "#a78bfa" }),
      social(handle, ["instagram", "tiktok", "youtube"], { font: "mono" }),
    ],
  },
  {
    id: "verdant",
    name: "Verdant",
    description: "Wellness coach · soft glass, floating cards, calm greens.",
    themeId: "matcha",
    desktop: { preset: "sidebar", maxWidth: 1180, gap: 24, rowHeight: 40, tiles: "none" },
    build: (handle) => [
      header(
        { name: "Maya Linden", handle, tagline: "Breath, strength and nourishment — coaching for a calmer, stronger you.", descriptors: ["Coach", "Breathwork", "Nutrition"], layout: "hero", coverUrl: M.botanicalStill, coverVideoUrl: M.botanical },
        { radius: 34, shadow: "soft", accent: "#d9f99d" },
        motion("rise", 0, "load"),
      ),
      feature("heart", "1:1 coaching", "Twelve weeks, one plan, built around your real life.", { surface: "card", shadow: "soft", hover: "lift", radius: 28, padding: 28 }, motion("rise", 100), ["Apply", "https://example.com/apply"]),
      feature("star", "Breathwork", "Live group sessions every Sunday morning.", { surface: "card", shadow: "soft", hover: "lift", radius: 28, padding: 28 }, motion("rise", 160)),
      stats([["500+", "Clients guided"], ["4.9★", "Average rating"], ["10", "Years practicing"]], { surface: "gradient", bg: "#e7f0da", bg2: "#cfe3c0", gradientAngle: 160, text: "#1f3316", accent: "#3f6b2a", radius: 28, padding: 28 }, undefined, motion("rise", 220)),
      quote("I came for better sleep and left with a whole new relationship with my body.", "Priya S.", "Client since 2023", { surface: "glass", shadow: "soft", radius: 28, padding: 30 }, motion("rise", 260)),
      link("Book a free discovery call", "https://example.com/call", "gold", motion("rise", 300)),
      link("Join the Sunday breathwork", "https://example.com/breath", "outline", motion("rise", 340)),
      social(handle, ["instagram", "youtube"]),
    ],
  },
  {
    id: "row-atelier",
    name: "Row Atelier",
    description: "Clothing boutique · editorial lookbook, drop countdown, sand tones.",
    themeId: "sand-dune",
    desktop: { preset: "magazine", maxWidth: 1240, gap: 22, rowHeight: 40, tiles: "none" },
    build: (handle) => [
      header(
        { name: "Row Atelier", handle, tagline: "Small-batch tailoring and everyday luxury, cut in our studio downtown.", descriptors: ["Womenswear", "Menswear", "Made in LA"], layout: "hero", coverUrl: P.fashionHero },
        { radius: 6, letterSpacing: -1 },
        motion("reveal", 0, "load"),
      ),
      feature("shop", "The Autumn Drop", "Wool overcoats, silk shirting and the trouser everyone asks about. Ships Friday — sizes go fast.", { surface: "card", shadow: "lift", hover: "lift", align: "start", radius: 6, padding: 32, font: "display" }, motion("rise", 80), ["Shop the drop", "https://example.com/shop"]),
      gallery([[P.fashionLook1, "Look 01 — the column coat"], [P.fashionLook2, "Look 02 — evening tailoring"], [P.fashionLook3, "Look 03 — the studio suit"]], { radius: 6, padding: 0 }, motion("reveal", 120)),
      stats([["3", "Pieces per style, max"], ["100%", "Natural fibres"], ["Free", "Alterations for life"]], { surface: "outline", font: "display", align: "start", radius: 6, padding: 28 }, "Why Row", motion("rise", 160)),
      quote("The only coat I've ever been stopped on the street about. Twice in one day.", "Jordan A.", "Customer since 2022", { surface: "outline", font: "display", scale: "lg", align: "start", radius: 6, padding: 32 }, motion("reveal", 120)),
      link("Shop new arrivals", "https://example.com/shop", "card", motion("rise", 200)),
      link("Book a fitting", "https://example.com/fitting", "outline", motion("rise", 240)),
      link("Visit the studio", "https://maps.google.com", "underline", motion("rise", 280)),
      social(handle, ["instagram", "tiktok"]),
    ],
  },
  {
    id: "gloss-hair",
    name: "Gloss Hair Studio",
    description: "Hair salon · champagne glass, service menu, portfolio, one-tap booking.",
    themeId: "champagne-glam",
    desktop: { preset: "sidebar", maxWidth: 1200, gap: 22, rowHeight: 40, tiles: "none" },
    build: (handle) => [
      header(
        { name: "Gloss Hair Studio", handle, tagline: "Colour, cuts and silk-press finishes that move like they're lit from within.", descriptors: ["Colour", "Silk press", "Extensions"], layout: "hero", coverUrl: P.hairHero },
        { radius: 30, shadow: "lift" },
        motion("blur-in", 0, "load"),
      ),
      booking(handle, "Book your chair", motion("rise", 60), { shadow: "glow", radius: 48 }),
      text("## Service menu\n**Signature silk press** — from $95\n\n**Lived-in blonde** — from $240\n\n**Precision cut & finish** — from $80\n\n**Hand-tied extensions** — consult", { surface: "glass", shadow: "soft", align: "start", radius: 26, padding: 30 }, motion("rise", 100)),
      gallery([[P.hairWork1, "Platinum silk press"], [P.hairWork2, "Sleek glass-hair finish"], [P.hairWork3, "Soft evening waves"]], { radius: 26 }, motion("reveal", 140), "masonry"),
      stats([["4.9★", "400+ reviews"], ["12", "Years behind the chair"], ["6", "Stylists"]], { surface: "foil", ambient: "border-flow", shadow: "glow", radius: 26, padding: 28, speed: "slow" }, undefined, motion("rise", 180)),
      quote("My colour has never looked this expensive. I get asked who does my hair every single week.", "Tasha M.", "Client since 2021", { surface: "card", shadow: "lift", font: "display", radius: 26, padding: 30 }, motion("rise", 200)),
      link("Shop aftercare", "https://example.com/aftercare", "glass", motion("rise", 240)),
      social(handle, ["instagram", "tiktok"]),
    ],
  },
  {
    id: "solene",
    name: "Solène",
    description: "Music artist · new single, tour dates, streaming links, rose-dusk glow.",
    themeId: "rose-dusk",
    desktop: { preset: "bento", maxWidth: 1240, gap: 18, rowHeight: 34, tiles: "none" },
    build: (handle) => [
      header(
        { name: "SOLÈNE", handle, tagline: "Midnight soul, velvet synths. New single “Glasshouse” out now.", descriptors: ["Singer", "Songwriter", "Paris → LA"], layout: "hero", coverUrl: P.musicHero },
        { shadow: "glow", radius: 28, uppercase: true, letterSpacing: 6, accent: "#fda4af" },
        motion("scale-in", 0, "load"),
      ),
      feature("music", "Glasshouse — the new single", "Written in one night, recorded live in one take. Out everywhere now.", { hover: "glow", ambient: "breathe", accent: "#fda4af", radius: 26, padding: 30, font: "display", media: { image: P.musicStage, overlay: 50, minHeight: 260 } }, motion("blur-in", 80), ["Listen now", "https://open.spotify.com"]),
      stats([["120M", "Streams"], ["38", "Cities on tour"], ["2", "Gold records"]], { surface: "glass", shadow: "glow", accent: "#fda4af", radius: 24, padding: 26 }, undefined, motion("rise", 120)),
      text("## The Glasshouse Tour\n**Oct 18** — Los Angeles, The Wiltern\n\n**Oct 24** — New York, Brooklyn Steel\n\n**Nov 02** — London, KOKO\n\n**Nov 09** — Paris, La Cigale", { surface: "card", shadow: "lift", align: "start", radius: 24, padding: 30, font: "display" }, motion("rise", 160)),
      link("Listen on Spotify", "https://open.spotify.com", "neon", motion("rise", 200), { accent: "#fda4af" }),
      link("Listen on Apple Music", "https://music.apple.com", "glass", motion("rise", 240)),
      link("Tour tickets", "https://example.com/tour", "gold", motion("rise", 280)),
      link("Merch", "https://example.com/merch", "outline", motion("rise", 320)),
      social(handle, ["instagram", "tiktok", "youtube"]),
    ],
  },
  {
    id: "lacquer-lounge",
    name: "Lacquer Lounge",
    description: "Nail studio · blush gloss, set gallery, price menu, Boox booking.",
    themeId: "blush-studio",
    desktop: { preset: "bento", maxWidth: 1200, gap: 18, rowHeight: 36, tiles: "none" },
    build: (handle) => [
      header(
        { name: "Lacquer Lounge", handle, tagline: "Structured gel, chrome and hand-painted art — sets that last three weeks and look like day one.", descriptors: ["Gel-X", "Chrome", "Nail art"], layout: "hero", coverUrl: P.nailsHero },
        { radius: 32, shadow: "soft", accent: "#f9a8d4" },
        motion("rise", 0, "load"),
      ),
      booking(handle, "Book your set", motion("scale-in", 60), { shadow: "glow", radius: 48, accent: "#ec4899" }),
      gallery([[P.nailsSet1, "Pink chrome almond set"], [P.nailsSet2, "Lilac aura French"], [P.nailsSet3, "Velvet cat-eye"]], { radius: 28 }, motion("reveal", 100)),
      text("## Menu\n**Gel-X full set** — $75\n\n**Structured gel manicure** — $55\n\n**Chrome or cat-eye** — +$15\n\n**Hand-painted art** — from $10 a nail", { surface: "glass", shadow: "soft", align: "start", radius: 28, padding: 30 }, motion("rise", 140)),
      stats([["3 wks", "Wear, guaranteed"], ["2k+", "Sets done"], ["5.0★", "On Google"]], { surface: "gradient", bg: "#fce7f3", bg2: "#fbcfe8", gradientAngle: 150, text: "#500724", accent: "#be185d", radius: 28, padding: 26 }, undefined, motion("rise", 180)),
      quote("Three weeks in and not a single chip. I've stopped going anywhere else.", "Alexis R.", "Regular since 2023", { surface: "card", shadow: "soft", hover: "lift", radius: 28, padding: 30 }, motion("rise", 200)),
      link("Aftercare & policies", "https://example.com/policies", "glass", motion("rise", 240)),
      social(handle, ["instagram", "tiktok"]),
    ],
  },
];
