import type { Sections } from "@/lib/sections/types";

export type Vibe = {
  id: string;
  label: string;
  blurb: string;
  themeId: string;
  build: (input: { displayName: string; username: string }) => Sections;
};

function uid() {
  // crypto.randomUUID is available in modern browsers + Node 19+
  return (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function")
    ? crypto.randomUUID()
    : `xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx`.replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        const v = c === "x" ? r : (r & 0x3) | 0x8;
        return v.toString(16);
      });
}

function header(name: string, tagline: string): Sections[number] {
  return {
    id: uid(),
    type: "header",
    visible: true,
    props: { name, tagline, showVerified: true, coverFullBleed: false, coverShadow: false },
  };
}

function divider(): Sections[number] {
  return { id: uid(), type: "divider", visible: true, props: {} };
}

export const VIBES: readonly Vibe[] = [
  {
    id: "creator",
    label: "Creator",
    blurb: "Bold header, top links, a gallery slot.",
    themeId: "neon-grid",
    build: ({ displayName }) => [
      header(displayName, "Creator · making things"),
      { id: uid(), type: "social", visible: true, props: { displayMode: "iconLabel", items: [] } },
      divider(),
      { id: uid(), type: "gallery", visible: true, props: { images: [], layout: "grid", lightbox: true, carouselFullWidth: false, filters: [], showCategoryStories: false } },
    ],
  },
  {
    id: "founder",
    label: "Founder",
    blurb: "Tagline, key links, a contact form.",
    themeId: "onyx-gold",
    build: ({ displayName }) => [
      header(displayName, "Founder · building something useful"),
      divider(),
      {
        id: uid(),
        type: "form",
        visible: true,
        props: {
          title: "Get in touch",
          fields: [
            { name: "name", label: "Name", required: true, type: "text" },
            { name: "email", label: "Email", required: true, type: "email" },
            { name: "message", label: "Message", required: false, type: "textarea" },
          ],
          successMessage: "Thanks — we'll be in touch.",
          proLeadMode: false,
          requireConsent: false,
          requireCaptcha: false,
        },
      },
    ],
  },
  {
    id: "pro",
    label: "Professional",
    blurb: "Clean intro, scheduler, contact details.",
    themeId: "ivory-noir",
    build: ({ displayName }) => [
      header(displayName, "Available for new work"),
      { id: uid(), type: "markdown", visible: true, props: { md: "## About\n\nA short bio about who you are and what you do." } },
      divider(),
      { id: uid(), type: "social", visible: true, props: { displayMode: "iconLabel", items: [] } },
    ],
  },
  {
    id: "musician",
    label: "Musician",
    blurb: "Spotify, gigs, links.",
    themeId: "midnight-cyan",
    build: ({ displayName }) => [
      header(displayName, "New music out now"),
      { id: uid(), type: "spotify", visible: true, props: { uri: "spotify:artist:0OdUWJ0sBjDrqHygGUXeCF" } },
      divider(),
      { id: uid(), type: "social", visible: true, props: { displayMode: "iconLabel", items: [] } },
    ],
  },
  {
    id: "shop",
    label: "Shop",
    blurb: "Header, products spotlight, social.",
    themeId: "void-luxury",
    build: ({ displayName }) => [
      header(displayName, "Shop the drop"),
      { id: uid(), type: "markdown", visible: true, props: { md: "## Featured\n\nAdd product links here." } },
      divider(),
      { id: uid(), type: "social", visible: true, props: { displayMode: "iconLabel", items: [] } },
    ],
  },
  {
    id: "minimal",
    label: "Minimal",
    blurb: "One header, three links. Nothing else.",
    themeId: "paper-white",
    build: ({ displayName }) => [header(displayName, "")],
  },
] as const;

export const BLANK_VIBE_ID = "blank";

export function buildVibeSections(vibeId: string, input: { displayName: string; username: string }): Sections {
  if (vibeId === BLANK_VIBE_ID) return [];
  const vibe = VIBES.find((v) => v.id === vibeId);
  if (!vibe) return [];
  return vibe.build(input);
}

export function vibeThemeId(vibeId: string): string | null {
  if (vibeId === BLANK_VIBE_ID) return null;
  return VIBES.find((v) => v.id === vibeId)?.themeId ?? null;
}
