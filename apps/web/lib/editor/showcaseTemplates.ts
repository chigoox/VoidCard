// Five fully designed starting points. Each sets a theme, a desktop layout
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

function header(props: { name: string; handle: string; tagline: string; descriptors?: string[]; avatarShape?: "circle" | "rounded" | "square"; avatarRing?: "accent" | "gradient" | "none"; layout?: "center" | "left" }, design: SectionDesign, display?: SectionRecord["display"]): SectionRecord {
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
        { name: "Maison Noir", handle, tagline: "Private wardrobe styling for people who dress with intent.", descriptors: ["Paris", "London", "By appointment"], avatarRing: "gradient" },
        { surface: "foil", ambient: "border-flow", shadow: "glow", radius: 30, padding: 36, font: "display", speed: "slow" },
        motion("blur-in", 0, "load"),
      ),
      stats([["14", "Years dressing clients"], ["1,200+", "Looks composed"], ["98%", "Clients who return"]], { surface: "glass", shadow: "lift", radius: 26, padding: 30, align: "start" }, "The atelier", motion("rise", 80)),
      feature("calendar", "Private consultation", "Ninety minutes in your wardrobe or ours. We edit first, then build — one inevitable piece at a time.", { surface: "card", shadow: "lift", hover: "lift", radius: 26, padding: 30, align: "start" }, motion("rise", 140), ["Reserve a date", "https://example.com/book"]),
      feature("briefcase", "Travel capsule", "A complete, packable wardrobe for your next season abroad — delivered pressed.", { surface: "card", shadow: "lift", hover: "lift", radius: 26, padding: 30, align: "start" }, motion("rise", 200)),
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
        { name: "Aurora Studio", handle, tagline: "Brand worlds for companies that refuse to look ordinary.", descriptors: ["Identity", "Motion", "Digital"] },
        { surface: "gradient", ambient: "aurora", shadow: "soft", hover: "shine", bg: "#1e1b4b", bg2: "#831843", gradientAngle: 135, text: "#fdf4ff", accent: "#f0abfc", radius: 34, padding: 48, scale: "lg" },
        motion("blur-in", 0, "load"),
      ),
      stats([["86", "Brands launched"], ["12", "Design awards"], ["4 wks", "Average sprint"]], { surface: "spotlight", hover: "tilt", shadow: "lift", radius: 28, padding: 30, accent: "#c084fc" }, undefined, motion("scale-in", 60)),
      feature("star", "Identity", "Names, marks and systems with a point of view.", { surface: "glass", hover: "tilt", shadow: "lift", radius: 28, padding: 28, accent: "#f0abfc" }, motion("tilt-in", 100)),
      feature("video", "Motion", "Logos that breathe. Launch films that stop thumbs.", { surface: "glass", hover: "tilt", shadow: "lift", radius: 28, padding: 28, accent: "#a5b4fc" }, motion("tilt-in", 180)),
      feature("globe", "Digital", "Sites and products that feel as good as they look.", { surface: "glass", hover: "tilt", shadow: "lift", radius: 28, padding: 28, accent: "#67e8f9" }, motion("tilt-in", 260)),
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
        { name: "Ivory & Stone", handle, tagline: "Architecture and interiors, drawn by hand, built to last a century.", descriptors: ["Residential", "Hospitality", "Est. 1998"], layout: "left" },
        { font: "display", scale: "xl", align: "start", letterSpacing: -2, padding: 8 },
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
        { name: "DJ NOVA", handle, tagline: "Deep house & late-night techno · Tokyo → Berlin", descriptors: ["Resident @ Void", "Afterglow EP out now"], avatarShape: "square" },
        { surface: "outline", shadow: "glow", ambient: "breathe", accent: "#22d3ee", border: "#22d3ee", borderWidth: 1, font: "mono", uppercase: true, letterSpacing: 12, radius: 20, padding: 40 },
        motion("scale-in", 0, "load"),
      ),
      stats([["48M", "Streams"], ["120", "Shows a year"], ["3", "Continents"]], { surface: "glass", shadow: "glow", accent: "#f472b6", font: "mono", radius: 20, padding: 26 }, undefined, motion("rise", 80)),
      feature("calendar", "Berlin · Oct 12", "Headline set at Void, 02:00 till close. Last 200 tickets.", { surface: "glass", hover: "glow", ambient: "float", accent: "#22d3ee", font: "mono", radius: 20, padding: 26, speed: "slow" }, motion("flip-in", 120), ["Get tickets", "https://example.com/tickets"]),
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
        { name: "Maya Linden", handle, tagline: "Breath, strength and nourishment — coaching for a calmer, stronger you.", descriptors: ["Coach", "Breathwork", "Nutrition"], avatarShape: "rounded", avatarRing: "accent" },
        { surface: "glass", shadow: "soft", ambient: "float", radius: 34, padding: 36, speed: "slow" },
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
];
