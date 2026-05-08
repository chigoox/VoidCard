import type { Section as SectionRecord, Sections } from "@/lib/sections/types";

type Template = {
  id: string;
  name: string;
  description: string;
  build: (handle: string) => Sections;
};

function id() {
  return crypto.randomUUID();
}

export const SECTION_TEMPLATES: Template[] = [
  {
    id: "creator",
    name: "Creator",
    description: "Header, social row, latest YouTube, links list, tip jar.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Creator · maker · storyteller" }),
      social([
        { platform: "instagram", handle },
        { platform: "youtube", handle },
        { platform: "tiktok", handle },
      ]),
      yt("dQw4w9WgXcQ"),
      link("Latest video", "https://youtube.com"),
      link("Newsletter", "https://example.com"),
      tip(),
    ],
  },
  {
    id: "restaurant",
    name: "Restaurant",
    description: "Hours, menu PDF, reservations, gallery, map.",
    build: (handle) => [
      h({ name: "Your spot", handle, tagline: "Reservations & menu" }),
      link("Reserve a table", "https://opentable.com"),
      link("View the menu", "https://example.com/menu.pdf"),
      gallery(),
      mapSection(),
    ],
  },
  {
    id: "realtor",
    name: "Realtor",
    description: "Header, contact form, schedule, listings.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Realtor · licensed in NY" }),
      form(),
      schedule(),
      link("Active listings", "https://example.com"),
      link("My website", "https://example.com"),
    ],
  },
  {
    id: "freelancer",
    name: "Freelancer",
    description: "Bio, portfolio gallery, contact, schedule.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Designer for hire" }),
      md("**Available for select projects.**\n\nLet's talk about your idea."),
      gallery(),
      schedule(),
      form(),
    ],
  },
  {
    id: "musician",
    name: "Musician",
    description: "Spotify embed, socials, tour links, merch.",
    build: (handle) => [
      h({ name: "Your stage name", handle, tagline: "New record out now" }),
      spotify(),
      social([
        { platform: "instagram", handle },
        { platform: "tiktok", handle },
      ]),
      link("Tour dates", "https://example.com/tour"),
      link("Merch", "https://example.com/merch"),
    ],
  },
];

function h(props: { name: string; handle: string; tagline: string }): SectionRecord {
  return { id: id(), type: "header", visible: true, props: { ...props, showVerified: true, coverFullBleed: false } };
}
function link(label: string, url: string): SectionRecord {
  return { id: id(), type: "link", visible: true, props: { label, url, style: "pill" } };
}
function social(items: { platform: "instagram" | "tiktok" | "x" | "linkedin" | "youtube" | "threads" | "github" | "facebook" | "snapchat"; handle: string }[]): SectionRecord {
  return { id: id(), type: "social", visible: true, props: { items } };
}
function yt(vid: string): SectionRecord {
  return { id: id(), type: "youtube", visible: true, props: { id: vid } };
}
function spotify(): SectionRecord {
  return { id: id(), type: "spotify", visible: true, props: { uri: "spotify:track:11dFghVXANMlKmJXsNCbNl" } };
}
function gallery(): SectionRecord {
  return {
    id: id(),
    type: "gallery",
    visible: true,
    props: {
      images: [
        { src: "https://placehold.co/800x600", alt: "" },
        { src: "https://placehold.co/800x600", alt: "" },
        { src: "https://placehold.co/800x600", alt: "" },
      ],
      layout: "grid",
      lightbox: true,
      filters: [],
      showCategoryStories: false,
    },
  };
}
function mapSection(): SectionRecord {
  return { id: id(), type: "map", visible: true, props: { lat: 40.7128, lng: -74.006, label: "Visit us" } };
}
function form(): SectionRecord {
  return {
    id: id(),
    type: "form",
    visible: true,
    props: {
      title: "Get in touch",
      fields: [
        { name: "name", label: "Your name", type: "text", required: true },
        { name: "email", label: "Email", type: "email", required: true },
        { name: "message", label: "Message", type: "textarea", required: false },
      ],
      successMessage: "Thanks — we'll be in touch.",
      proLeadMode: false,
      requireConsent: false,
      requireCaptcha: false,
    },
  };
}
function schedule(): SectionRecord {
  return { id: id(), type: "schedule", visible: true, props: { provider: "calcom", url: "https://cal.com/your" } };
}
function tip(): SectionRecord {
  return { id: id(), type: "tip", visible: true, props: { stripeAccountId: "acct_xxx", amounts: [200, 500, 1000] } };
}
function md(text: string): SectionRecord {
  return { id: id(), type: "markdown", visible: true, props: { md: text } };
}
