import type { Section, SectionType } from "@/lib/sections/types";

export type SectionMeta = { label: string; hint: string; group: "Essentials" | "Media" | "Text & layout" | "Grow" };

export const SECTION_META: Record<SectionType, SectionMeta> = {
  header: { label: "Profile header", hint: "Photo, name and tagline", group: "Essentials" },
  link: { label: "Link button", hint: "Send people to any URL", group: "Essentials" },
  social: { label: "Social icons", hint: "Instagram, TikTok, X and more", group: "Essentials" },
  phone: { label: "Call button", hint: "Tap to call you", group: "Essentials" },
  email: { label: "Email button", hint: "Tap to email you", group: "Essentials" },
  image: { label: "Image", hint: "A single photo or graphic", group: "Media" },
  gallery: { label: "Photo gallery", hint: "Grid, masonry or carousel", group: "Media" },
  video: { label: "Video", hint: "Play an uploaded video", group: "Media" },
  youtube: { label: "YouTube", hint: "Embed a YouTube video", group: "Media" },
  spotify: { label: "Spotify", hint: "A track, album or playlist", group: "Media" },
  markdown: { label: "Text", hint: "Headings, paragraphs, lists", group: "Text & layout" },
  feature: { label: "Feature card", hint: "Icon, title, description and a link", group: "Text & layout" },
  stats: { label: "Stats", hint: "Big numbers that build trust", group: "Grow" },
  testimonial: { label: "Testimonial", hint: "A quote from a happy client", group: "Grow" },
  divider: { label: "Divider", hint: "A thin line between sections", group: "Text & layout" },
  spacer: { label: "Spacer", hint: "Empty breathing room", group: "Text & layout" },
  form: { label: "Contact form", hint: "Collect leads and messages", group: "Grow" },
  schedule: { label: "Scheduling link", hint: "Cal.com or Calendly", group: "Grow" },
  booking: { label: "Booking", hint: "Let people book you", group: "Grow" },
  store: { label: "Store", hint: "Sell your products", group: "Grow" },
  tip: { label: "Tip jar", hint: "Accept tips", group: "Grow" },
  qr: { label: "QR code", hint: "Scan to open a link", group: "Grow" },
  map: { label: "Map", hint: "Show a location", group: "Grow" },
  embed: { label: "Embed code", hint: "Paste HTML from another site", group: "Grow" },
};

export const GROUPS: SectionMeta["group"][] = ["Essentials", "Media", "Text & layout", "Grow"];

export function sectionTitle(section: Section): string {
  switch (section.type) {
    case "header": return section.props.name || SECTION_META.header.label;
    case "link": return section.props.label || SECTION_META.link.label;
    case "phone": return section.props.label || SECTION_META.phone.label;
    case "email": return section.props.label || SECTION_META.email.label;
    case "store": return section.props.title || SECTION_META.store.label;
    case "form": return section.props.title || SECTION_META.form.label;
    default: return SECTION_META[section.type].label;
  }
}

/**
 * Mobile-first "what you see is what you edit" canvas: the real page is the
 * editor. Tap any part to edit it in a bottom sheet; tap + to insert.
 */
