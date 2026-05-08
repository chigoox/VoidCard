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
  {
    id: "athlete",
    name: "Athlete",
    description: "Sports profile with stats, training schedule, and socials.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Professional athlete" }),
      social([
        { platform: "instagram", handle },
        { platform: "tiktok", handle },
        { platform: "youtube", handle },
      ]),
      md("**Current season stats and training updates.**\n\nFollow along for exclusive content."),
      link("Training program", "https://example.com/training"),
      link("Sponsorships & collabs", "https://example.com/collabs"),
      schedule(),
    ],
  },
  {
    id: "photographer",
    name: "Photographer",
    description: "Portfolio gallery, booking, prints shop.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Photographer · visual storyteller" }),
      gallery(),
      link("View full portfolio", "https://example.com/portfolio"),
      link("Print shop", "https://example.com/prints"),
      schedule(),
      form(),
    ],
  },
  {
    id: "entrepreneur",
    name: "Entrepreneur",
    description: "Startup-founder profile: bio, venture links, newsletter, contact.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Founder · builder · investor" }),
      social([
        { platform: "x", handle },
        { platform: "linkedin", handle },
      ]),
      md("**Building in public.**\n\nSharing lessons from the trenches."),
      link("Current company", "https://example.com"),
      link("Newsletter", "https://example.com/newsletter"),
      link("Angel portfolio", "https://example.com/portfolio"),
      form(),
    ],
  },
  {
    id: "podcaster",
    name: "Podcaster",
    description: "Episode feed, Spotify, YouTube clips, socials.",
    build: (handle) => [
      h({ name: "Your podcast name", handle, tagline: "New episode every week" }),
      spotify(),
      yt("dQw4w9WgXcQ"),
      social([
        { platform: "instagram", handle },
        { platform: "x", handle },
        { platform: "youtube", handle },
      ]),
      link("Subscribe on Apple Podcasts", "https://podcasts.apple.com"),
      link("Support the show", "https://example.com/support"),
    ],
  },
  {
    id: "consultant",
    name: "Consultant",
    description: "Professional services: intro, booking, contact form, testimonials.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Consultant · advisor · speaker" }),
      social([
        { platform: "linkedin", handle },
        { platform: "x", handle },
      ]),
      md("**I help teams solve their hardest problems.**\n\nBook a free 20-min discovery call below."),
      schedule(),
      link("Case studies", "https://example.com/cases"),
      link("Speaking", "https://example.com/speaking"),
      form(),
    ],
  },
  {
    id: "nail-tech",
    name: "Nail Tech",
    description: "Book appointments, show off nail art gallery, sell gift cards.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Nail artist · book your next set" }),
      social([
        { platform: "instagram", handle },
        { platform: "tiktok", handle },
      ]),
      gallery(),
      link("Book an appointment", "https://example.com/book"),
      link("View my full portfolio", "https://www.instagram.com"),
      link("Gift cards", "https://example.com/gift"),
      form(),
    ],
  },
  {
    id: "lash-tech",
    name: "Lash Tech",
    description: "Lash & brow artist: service menu, booking, before/after gallery.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Lash artist · certified & insured" }),
      social([
        { platform: "instagram", handle },
        { platform: "tiktok", handle },
      ]),
      md("**Services:** Classic · Hybrid · Volume · Mega Volume\n\nFill appointments available every 3–4 weeks."),
      gallery(),
      link("Book now", "https://example.com/book"),
      link("Aftercare instructions", "https://example.com/aftercare"),
      form(),
    ],
  },
  {
    id: "hairstylist",
    name: "Hairstylist",
    description: "Stylist or barber: services, gallery, booking, and product links.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Hairstylist · color specialist" }),
      social([
        { platform: "instagram", handle },
        { platform: "tiktok", handle },
        { platform: "facebook", handle },
      ]),
      gallery(),
      link("Book a service", "https://example.com/book"),
      link("Product recommendations", "https://example.com/products"),
      link("Refer a friend", "https://example.com/referral"),
      form(),
    ],
  },
  {
    id: "makeup-artist",
    name: "Makeup Artist",
    description: "MUA profile: portfolio gallery, service packages, bookings.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Makeup artist · available for events" }),
      social([
        { platform: "instagram", handle },
        { platform: "tiktok", handle },
        { platform: "youtube", handle },
      ]),
      gallery(),
      md("**Bridal · Editorial · Glam · Special FX**\n\nTravel available. Inquire for rates."),
      link("Book your session", "https://example.com/book"),
      link("Shop my kit", "https://example.com/kit"),
      schedule(),
      form(),
    ],
  },
  {
    id: "tattoo-artist",
    name: "Tattoo Artist",
    description: "Flash + custom work gallery, deposit form, flash sale links.",
    build: (handle) => [
      h({ name: "Your name", handle, tagline: "Tattoo artist · booking open" }),
      social([
        { platform: "instagram", handle },
        { platform: "tiktok", handle },
      ]),
      gallery(),
      md("**Custom work & flash available.**\n\nDeposits required to hold your date. DM for pricing."),
      link("Request a custom piece", "https://example.com/custom"),
      link("View flash sheets", "https://example.com/flash"),
      link("Aftercare guide", "https://example.com/aftercare"),
      form(),
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
