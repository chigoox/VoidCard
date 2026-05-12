"use client";

import "client-only";

import Link from "next/link";
import {
  ArrowDown,
  ArrowUp,
  Copy,
  Eye,
  EyeOff,
  GripVertical,
  Mail,
  Palette,
  Phone,
  Plus,
  RotateCcw,
  Sparkles,
  Type,
  X,
} from "lucide-react";
import {
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
  type ReactNode,
} from "react";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { Sections, type Section, type Sections as SectionList } from "@/lib/sections/types";
import { THEME_PRESETS, getThemePreset, themeToCss } from "@/lib/themes/presets";

const STORAGE_KEY = "vc.try.draft.v2";
const TABS = ["sections", "style", "settings", "advanced"] as const;
const LINK_STYLES = ["pill", "card", "ghost"] as const;
const SOCIAL_PLATFORMS = [
  "instagram",
  "tiktok",
  "x",
  "linkedin",
  "youtube",
  "threads",
  "github",
  "facebook",
  "snapchat",
] as const;
const VISIBLE_THEMES = THEME_PRESETS.slice(0, 8);

type EditorTab = (typeof TABS)[number];
type DemoTemplate = {
  id: string;
  name: string;
  description: string;
  build: (profile: HeaderProfile) => SectionList;
};
type DraftShape = {
  version: 2;
  themeId: string;
  customCss: string;
  sections: SectionList;
};
type HeaderProps = {
  name: string;
  showVerified: boolean;
  coverFullBleed: boolean;
  coverShadow: boolean;
  avatarUrl?: string;
  coverUrl?: string;
  handle?: string;
  descriptors?: string[];
  tagline?: string;
};
type HeaderSection = Omit<Section, "type" | "props"> & { type: "header"; props: HeaderProps };
type HeaderProfile = {
  name: string;
  handle: string;
  tagline: string;
};

const DEFAULT_HEADER_SECTION: HeaderSection = {
  id: "00000000-0000-4000-8000-000000000001",
  type: "header",
  visible: true,
  props: {
    name: "Your Name",
    handle: "yourhandle",
    tagline: "Founder · creator · always shipping.",
    showVerified: true,
    coverFullBleed: false,
    coverShadow: false,
  },
};

const DEFAULT_DRAFT: DraftShape = {
  version: 2,
  themeId: "onyx-gold",
  customCss: "",
  sections: [
    DEFAULT_HEADER_SECTION,
    {
      id: "00000000-0000-4000-8000-000000000002",
      type: "markdown",
      visible: true,
      props: {
        md: "**What should people do next?**\n\nGive them one clear move, then one backup option.",
      },
    },
    {
      id: "00000000-0000-4000-8000-000000000003",
      type: "link",
      visible: true,
      props: {
        label: "Book a call",
        url: "https://example.com/book",
        style: "pill",
      },
    },
    {
      id: "00000000-0000-4000-8000-000000000004",
      type: "link",
      visible: true,
      props: {
        label: "See my latest work",
        url: "https://example.com/work",
        style: "card",
      },
    },
    {
      id: "00000000-0000-4000-8000-000000000005",
      type: "social",
      visible: true,
      props: {
        items: [
          { platform: "instagram", handle: "yourhandle" },
          { platform: "linkedin", handle: "yourhandle" },
          { platform: "tiktok", handle: "yourhandle" },
        ],
      },
    },
    {
      id: "00000000-0000-4000-8000-000000000006",
      type: "email",
      visible: true,
      props: {
        label: "Email me",
        email: "hello@example.com",
        subject: "Let\'s work together",
      },
    },
  ],
};

const DEMO_TEMPLATES: DemoTemplate[] = [
  {
    id: "creator",
    name: "Creator",
    description: "Video-first profile with a short intro, links, and socials.",
    build: (profile) => [
      createHeaderSection(profile),
      createMarkdownSection("**New drop this week.**\n\nUse this block for the one sentence that makes people tap."),
      createLinkSection("Watch the latest video", "https://example.com/video", "pill"),
      createLinkSection("Join the newsletter", "https://example.com/newsletter", "card"),
      createSocialSection([
        { platform: "instagram", handle: profile.handle || "yourhandle" },
        { platform: "youtube", handle: profile.handle || "yourhandle" },
        { platform: "tiktok", handle: profile.handle || "yourhandle" },
      ]),
      createEmailSection("Work with me", "hello@example.com", "Creator collaboration"),
    ],
  },
  {
    id: "consultant",
    name: "Consultant",
    description: "Discovery call, case studies, and direct contact.",
    build: (profile) => [
      createHeaderSection({ ...profile, tagline: "Advisor · operator · speaker" }),
      createMarkdownSection("**I help teams ship faster without bloating the stack.**"),
      createLinkSection("Book a discovery call", "https://example.com/book", "pill"),
      createLinkSection("Read case studies", "https://example.com/cases", "ghost"),
      createPhoneSection("Text or call", "+1 (555) 123-4567", "Fastest reply"),
      createEmailSection("Email", "hello@example.com", "Project inquiry"),
      createSocialSection([
        { platform: "x", handle: profile.handle || "yourhandle" },
        { platform: "linkedin", handle: profile.handle || "yourhandle" },
      ]),
    ],
  },
  {
    id: "service",
    name: "Service",
    description: "Appointments, pricing, and contact for local businesses.",
    build: (profile) => [
      createHeaderSection({ ...profile, tagline: "Appointments, pricing, and contact in one place" }),
      createLinkSection("Book now", "https://example.com/book", "pill"),
      createLinkSection("View service menu", "https://example.com/menu", "card"),
      createMarkdownSection("**Open Tue-Sat.**\n\nAdd your location, service details, or aftercare instructions here."),
      createPhoneSection("Call the studio", "+1 (555) 222-1111", "Open 10AM-6PM"),
      createEmailSection("Email", "bookings@example.com", "Appointment request"),
      createSocialSection([
        { platform: "instagram", handle: profile.handle || "yourhandle" },
        { platform: "facebook", handle: profile.handle || "yourhandle" },
      ]),
    ],
  },
];

export default function TryClient() {
  const [sections, setSections] = useState<SectionList>(DEFAULT_DRAFT.sections);
  const [themeId, setThemeId] = useState(DEFAULT_DRAFT.themeId);
  const [customCss, setCustomCss] = useState(DEFAULT_DRAFT.customCss);
  const [editorTab, setEditorTab] = useState<EditorTab>("sections");
  const [templatesOpen, setTemplatesOpen] = useState(false);
  const [addMenuOpen, setAddMenuOpen] = useState(false);
  const [filter, setFilter] = useState("");
  const deferredFilter = useDeferredValue(filter);
  const [mobilePreviewOpen, setMobilePreviewOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [restoredFromStorage, setRestoredFromStorage] = useState(false);
  const [pending, startTransition] = useTransition();
  const hasHydratedStorage = useRef(false);

  const header = useMemo<HeaderSection>(() => {
    const current = sections.find((section): section is HeaderSection => section.type === "header");
    return current ?? DEFAULT_HEADER_SECTION;
  }, [sections]);

  const previewTheme = useMemo(() => getThemePreset(themeId), [themeId]);
  const previewCustomCss = useMemo(() => sanitizeCss(customCss), [customCss]);
  const firstVisibleSectionId = useMemo(() => sections.find((section) => section.visible)?.id ?? null, [sections]);
  const previewStartsWithTopBleed = useMemo(() => {
    const firstVisible = sections.find((section) => section.visible);
    if (!firstVisible) return false;
    if (firstVisible.type === "header") return !!firstVisible.props.coverUrl;
    if (firstVisible.type === "image") return firstVisible.props.fullWidth === true;
    return false;
  }, [sections]);
  const profileUrl = useMemo(() => {
    const handle = header.props.handle?.trim() || "yourhandle";
    return `https://vcard.ed5enterprise.com/u/${handle}`;
  }, [header.props.handle]);
  const filteredSections = useMemo(
    () => sections.filter((section) => sectionMatchesFilter(section, deferredFilter)),
    [deferredFilter, sections],
  );

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      const draft = readStoredDraft(stored);
      if (draft) {
        startTransition(() => {
          setSections(draft.sections);
          setThemeId(draft.themeId);
          setCustomCss(draft.customCss);
          setRestoredFromStorage(true);
        });
      }
    } catch {}
    hasHydratedStorage.current = true;
  }, [startTransition]);

  useEffect(() => {
    if (!hasHydratedStorage.current) return;
    const nextDraft: DraftShape = {
      version: 2,
      themeId,
      customCss,
      sections,
    };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(nextDraft));
    } catch {}
  }, [customCss, sections, themeId]);

  useEffect(() => {
    if (!copied) return undefined;
    const timer = window.setTimeout(() => setCopied(false), 1200);
    return () => window.clearTimeout(timer);
  }, [copied]);

  function updateSection(id: string, updater: (section: Section) => Section) {
    setSections((current) => current.map((section) => (section.id === id ? updater(section) : section)));
  }

  function moveSection(id: string, direction: -1 | 1) {
    setSections((current) => {
      const index = current.findIndex((section) => section.id === id);
      if (index === -1) return current;
      const nextIndex = index + direction;
      if (nextIndex < 0 || nextIndex >= current.length) return current;
      const next = [...current];
      const [item] = next.splice(index, 1);
      next.splice(nextIndex, 0, item);
      return next;
    });
  }

  function removeSection(id: string) {
    setSections((current) => current.filter((section) => section.id !== id || section.type === "header"));
  }

  function toggleSectionVisible(id: string) {
    updateSection(id, (section) => ({ ...section, visible: !section.visible }));
  }

  function applyTemplate(template: DemoTemplate) {
    startTransition(() => {
      setSections(template.build({
        name: header.props.name,
        handle: header.props.handle ?? "yourhandle",
        tagline: header.props.tagline ?? "Founder · creator · always shipping.",
      }));
      setTemplatesOpen(false);
    });
  }

  function addSection(kind: "link" | "phone" | "email" | "markdown" | "social") {
    setSections((current) => {
      const handle = header.props.handle ?? "yourhandle";
      const nextSection =
        kind === "phone"
          ? createPhoneSection("Call", "+1 (555) 000-0000", "Available weekdays")
          : kind === "email"
            ? createEmailSection("Email", "hello@example.com", "Quick question")
            : kind === "markdown"
              ? createMarkdownSection("**Short context block.**\n\nUse this for an intro, offer, or testimonial.")
              : kind === "social"
                ? createSocialSection([{ platform: "instagram", handle }])
                : createLinkSection("New link", "https://example.com", "pill");
      return [...current, nextSection];
    });
    setAddMenuOpen(false);
  }

  async function copyPreviewUrl() {
    try {
      await navigator.clipboard.writeText(profileUrl);
      setCopied(true);
    } catch {}
  }

  function resetDemo() {
    startTransition(() => {
      setSections(DEFAULT_DRAFT.sections);
      setThemeId(DEFAULT_DRAFT.themeId);
      setCustomCss(DEFAULT_DRAFT.customCss);
      setFilter("");
      setTemplatesOpen(false);
      setAddMenuOpen(false);
      setRestoredFromStorage(false);
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {}
    });
  }

  return (
    <section className="relative overflow-hidden bg-onyx-950 text-ivory">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(212,168,83,0.12),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(255,255,255,0.05),transparent_22%)]" />
      <div className="relative mx-auto max-w-7xl px-6 py-10 md:py-12">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.28em] text-gold/80">Sandbox</p>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight md:text-5xl">
              Try the editor
            </h1>
            <p className="mt-3 max-w-xl text-sm leading-6 text-ivory-dim md:text-base">
              Same editor shell, same live profile renderer, no sign-in required. This draft stays in local storage until you create an account.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="btn-ghost px-3 py-2 text-xs md:hidden"
              onClick={() => setMobilePreviewOpen((open) => !open)}
            >
              {mobilePreviewOpen ? "Hide preview" : "Open preview"}
            </button>
            <Link href="/signup" className="btn-gold px-4 py-2 text-sm">
              Save this page
            </Link>
          </div>
        </div>

        <div className="mb-6 grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto]">
          <div className="card flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-ivory">Draft saved in this browser</p>
              <p className="text-xs text-ivory-dim">
                {restoredFromStorage ? "Restored your last sandbox session." : "Start here, then claim it when you sign up."}
              </p>
            </div>
            <div className="flex flex-wrap gap-2">
              <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={copyPreviewUrl}>
                <Copy className="size-4" aria-hidden />
                <span>{copied ? "Copied" : "Copy preview URL"}</span>
              </button>
              <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={resetDemo} disabled={pending}>
                <RotateCcw className="size-4" aria-hidden />
                <span>{pending ? "Resetting..." : "Reset demo"}</span>
              </button>
            </div>
          </div>

          <div className="card flex items-center gap-2 px-4 py-3 text-xs text-ivory-dim">
            <Sparkles className="size-4 text-gold" aria-hidden />
            Public sandbox backed by local storage.
          </div>
        </div>

        <div className="grid min-w-0 gap-4 md:grid-cols-2 md:gap-6">
          <div
            className={[
              "order-2 min-w-0 md:order-2 md:sticky md:top-24 md:self-start",
              mobilePreviewOpen
                ? "safe-modal-frame fixed inset-0 z-[80] flex flex-col overflow-y-auto bg-onyx-950/95 p-6 backdrop-blur-md md:static md:bg-transparent md:p-0"
                : "hidden md:block",
            ].join(" ")}
            data-testid="preview-column"
          >
            {mobilePreviewOpen ? (
              <div className="mb-3 flex items-center justify-between md:hidden">
                <p className="text-xs uppercase tracking-widest text-ivory-mute">Live preview</p>
                <button
                  type="button"
                  className="btn-ghost px-3 py-2 text-xs"
                  onClick={() => setMobilePreviewOpen(false)}
                >
                  Close
                </button>
              </div>
            ) : null}

            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-widest text-ivory-mute">Live preview</p>
                <p className="text-xs text-ivory-dim">{profileUrl.replace("https://", "")}</p>
              </div>
              <Link href="/signup" className="btn-ghost px-3 py-2 text-xs">
                Claim handle
              </Link>
            </div>

            <style dangerouslySetInnerHTML={{ __html: themeToCss(previewTheme, ".vc-try-preview") }} />
            {previewCustomCss ? <style dangerouslySetInnerHTML={{ __html: previewCustomCss }} /> : null}

            <div className="phone-frame mx-auto">
              <div
                className={[
                  "vc-profile vc-try-preview flex h-full flex-col overflow-y-auto overscroll-contain px-4 pb-16 select-none [&_a]:pointer-events-none [&_button]:pointer-events-none",
                  previewStartsWithTopBleed ? "pt-0" : "pt-8",
                ].join(" ")}
                style={{ background: "var(--vc-bg, #0a0a0a)", color: "var(--vc-fg, #f7f3ea)" }}
              >
                <div className="vc-profile-stack">
                  {sections.map((section) => (
                    <SectionRenderer
                      key={section.id}
                      section={section}
                      verified
                      username={header.props.handle}
                      isTop={section.id === firstVisibleSectionId}
                      topBleedOffset={previewStartsWithTopBleed ? "none" : "page"}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="order-1 flex min-h-[36rem] min-w-0 flex-col gap-4 md:order-1 md:h-[calc(100dvh-var(--safe-top)-11rem)]">
            <div role="tablist" className="card flex overflow-hidden p-0 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-onyx-950/85">
              {TABS.map((tab) => (
                <button
                  key={tab}
                  type="button"
                  role="tab"
                  aria-selected={editorTab === tab}
                  onClick={() => setEditorTab(tab)}
                  className={[
                    "flex-1 px-2 py-3 text-xs uppercase tracking-widest transition",
                    editorTab === tab
                      ? "bg-onyx-900 text-gold shadow-[inset_0_-2px_0_rgba(212,168,83,0.8)]"
                      : "text-ivory-mute hover:bg-onyx-900/40 hover:text-ivory",
                  ].join(" ")}
                >
                  {tab === "sections" ? "Sections" : tab === "style" ? "Style" : tab === "settings" ? "Settings" : "Advanced"}
                </button>
              ))}
            </div>

            {editorTab === "sections" ? (
              <div className="card flex min-h-0 flex-1 flex-col border border-onyx-700 bg-onyx-950/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-onyx-950/85">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-widest text-ivory-mute">
                      Sections <span className="ml-1 text-ivory-dim/70 normal-case tracking-normal">· {sections.length}</span>
                    </p>
                    <p className="mt-1 text-sm text-ivory-dim">Build the same way the signed-in editor does: sections first, preview beside it.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setTemplatesOpen((open) => !open)}
                      className="btn-ghost px-3 py-2 text-xs"
                    >
                      Templates
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddMenuOpen((open) => !open)}
                      className="btn-gold px-4 py-2 text-sm"
                    >
                      {addMenuOpen ? "Close" : "+ Add section"}
                    </button>
                  </div>
                </div>

                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <input
                    value={filter}
                    onChange={(event) => setFilter(event.target.value)}
                    placeholder="Filter sections..."
                    className="input max-w-xs flex-1"
                  />
                </div>

                {templatesOpen ? (
                  <div className="mt-4 grid gap-3 md:grid-cols-3">
                    {DEMO_TEMPLATES.map((template) => (
                      <button
                        key={template.id}
                        type="button"
                        className="rounded-card border border-onyx-800 bg-onyx-950/60 p-4 text-left transition hover:border-gold/40 hover:bg-onyx-900"
                        onClick={() => applyTemplate(template)}
                      >
                        <p className="text-sm font-medium text-ivory">{template.name}</p>
                        <p className="mt-2 text-xs leading-5 text-ivory-dim">{template.description}</p>
                      </button>
                    ))}
                  </div>
                ) : null}

                {addMenuOpen ? (
                  <div className="mt-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
                    <button type="button" className="btn-ghost justify-center px-3 py-3 text-xs" onClick={() => addSection("link")}>
                      <Plus className="size-4" aria-hidden />
                      Link
                    </button>
                    <button type="button" className="btn-ghost justify-center px-3 py-3 text-xs" onClick={() => addSection("phone")}>
                      <Phone className="size-4" aria-hidden />
                      Phone
                    </button>
                    <button type="button" className="btn-ghost justify-center px-3 py-3 text-xs" onClick={() => addSection("email")}>
                      <Mail className="size-4" aria-hidden />
                      Email
                    </button>
                    <button type="button" className="btn-ghost justify-center px-3 py-3 text-xs" onClick={() => addSection("markdown")}>
                      <Type className="size-4" aria-hidden />
                      Text
                    </button>
                    <button type="button" className="btn-ghost justify-center px-3 py-3 text-xs" onClick={() => addSection("social")}>
                      <Sparkles className="size-4" aria-hidden />
                      Social
                    </button>
                  </div>
                ) : null}

                <div className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto pr-1">
                  {filteredSections.length === 0 ? (
                    <div className="rounded-card border border-dashed border-onyx-700 bg-onyx-950/40 px-4 py-5 text-sm text-ivory-dim">
                      No section matched that filter.
                    </div>
                  ) : null}

                  {filteredSections.map((section, index) => (
                    <div key={section.id} className="rounded-card border border-onyx-800 bg-onyx-950/55 p-4">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-card border border-onyx-700 bg-onyx-900 text-ivory-mute">
                            <GripVertical className="size-4" aria-hidden />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-ivory">{sectionLabel(section)}</p>
                            <p className="truncate text-xs text-ivory-dim">{sectionSummary(section)}</p>
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-2">
                          <button
                            type="button"
                            className="btn-ghost px-2.5 py-2 text-xs"
                            onClick={() => moveSection(section.id, -1)}
                            disabled={index === 0}
                            aria-label="Move section up"
                          >
                            <ArrowUp className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost px-2.5 py-2 text-xs"
                            onClick={() => moveSection(section.id, 1)}
                            disabled={index === sections.length - 1}
                            aria-label="Move section down"
                          >
                            <ArrowDown className="size-4" aria-hidden />
                          </button>
                          <button
                            type="button"
                            className="btn-ghost px-2.5 py-2 text-xs"
                            onClick={() => toggleSectionVisible(section.id)}
                            aria-label={section.visible ? "Hide section" : "Show section"}
                          >
                            {section.visible ? <Eye className="size-4" aria-hidden /> : <EyeOff className="size-4" aria-hidden />}
                          </button>
                          {section.type !== "header" ? (
                            <button
                              type="button"
                              className="btn-ghost px-2.5 py-2 text-xs"
                              onClick={() => removeSection(section.id)}
                              aria-label="Remove section"
                            >
                              <X className="size-4" aria-hidden />
                            </button>
                          ) : null}
                        </div>
                      </div>

                      <div className="mt-4 space-y-3">
                        {section.type === "header" ? (
                          <>
                            <Field label="Display name">
                              <input
                                value={section.props.name}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "header" ? { ...current, props: { ...current.props, name: event.target.value } } : current)}
                                className="input"
                                maxLength={64}
                              />
                            </Field>
                            <Field label="Handle">
                              <input
                                value={section.props.handle ?? ""}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "header" ? { ...current, props: { ...current.props, handle: sanitizeHandle(event.target.value) } } : current)}
                                className="input"
                                maxLength={32}
                              />
                            </Field>
                            <Field label="Tagline">
                              <textarea
                                value={section.props.tagline ?? ""}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "header" ? { ...current, props: { ...current.props, tagline: event.target.value } } : current)}
                                className="input min-h-[88px]"
                                maxLength={180}
                              />
                            </Field>
                          </>
                        ) : null}

                        {section.type === "markdown" ? (
                          <Field label="Copy">
                            <textarea
                              value={section.props.md}
                              onChange={(event) => updateSection(section.id, (current) => current.type === "markdown" ? { ...current, props: { ...current.props, md: event.target.value } } : current)}
                              className="input min-h-[120px]"
                            />
                          </Field>
                        ) : null}

                        {section.type === "link" ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Label">
                              <input
                                value={section.props.label}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "link" ? { ...current, props: { ...current.props, label: event.target.value } } : current)}
                                className="input"
                              />
                            </Field>
                            <Field label="URL">
                              <input
                                value={section.props.url}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "link" ? { ...current, props: { ...current.props, url: event.target.value } } : current)}
                                className="input"
                              />
                            </Field>
                            <Field label="Style" className="md:col-span-2">
                              <select
                                value={section.props.style}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "link" ? { ...current, props: { ...current.props, style: event.target.value as (typeof LINK_STYLES)[number] } } : current)}
                                className="input"
                              >
                                {LINK_STYLES.map((style) => (
                                  <option key={style} value={style}>
                                    {style}
                                  </option>
                                ))}
                              </select>
                            </Field>
                          </div>
                        ) : null}

                        {section.type === "phone" ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Label">
                              <input
                                value={section.props.label}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "phone" ? { ...current, props: { ...current.props, label: event.target.value } } : current)}
                                className="input"
                              />
                            </Field>
                            <Field label="Phone">
                              <input
                                value={section.props.phone}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "phone" ? { ...current, props: { ...current.props, phone: event.target.value } } : current)}
                                className="input"
                              />
                            </Field>
                            <Field label="Note" className="md:col-span-2">
                              <input
                                value={section.props.note ?? ""}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "phone" ? { ...current, props: { ...current.props, note: event.target.value } } : current)}
                                className="input"
                              />
                            </Field>
                          </div>
                        ) : null}

                        {section.type === "email" ? (
                          <div className="grid gap-3 md:grid-cols-2">
                            <Field label="Label">
                              <input
                                value={section.props.label}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "email" ? { ...current, props: { ...current.props, label: event.target.value } } : current)}
                                className="input"
                              />
                            </Field>
                            <Field label="Email">
                              <input
                                value={section.props.email}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "email" ? { ...current, props: { ...current.props, email: event.target.value } } : current)}
                                className="input"
                              />
                            </Field>
                            <Field label="Subject" className="md:col-span-2">
                              <input
                                value={section.props.subject ?? ""}
                                onChange={(event) => updateSection(section.id, (current) => current.type === "email" ? { ...current, props: { ...current.props, subject: event.target.value } } : current)}
                                className="input"
                              />
                            </Field>
                          </div>
                        ) : null}

                        {section.type === "social" ? (
                          <div className="space-y-3">
                            {section.props.items.map((item, itemIndex) => (
                              <div key={`${section.id}-${item.platform}-${itemIndex}`} className="grid gap-2 sm:grid-cols-[minmax(0,9rem)_1fr_auto] sm:items-end">
                                <Field label="Platform">
                                  <select
                                    value={item.platform}
                                    onChange={(event) => updateSection(section.id, (current) => current.type === "social" ? {
                                      ...current,
                                      props: {
                                        ...current.props,
                                        items: current.props.items.map((entry, index) => index === itemIndex ? { ...entry, platform: event.target.value as (typeof SOCIAL_PLATFORMS)[number] } : entry),
                                      },
                                    } : current)}
                                    className="input"
                                  >
                                    {SOCIAL_PLATFORMS.map((platform) => (
                                      <option key={platform} value={platform}>
                                        {platform}
                                      </option>
                                    ))}
                                  </select>
                                </Field>
                                <Field label="Handle">
                                  <input
                                    value={item.handle}
                                    onChange={(event) => updateSection(section.id, (current) => current.type === "social" ? {
                                      ...current,
                                      props: {
                                        ...current.props,
                                        items: current.props.items.map((entry, index) => index === itemIndex ? { ...entry, handle: sanitizeHandle(event.target.value) } : entry),
                                      },
                                    } : current)}
                                    className="input"
                                  />
                                </Field>
                                <button
                                  type="button"
                                  className="btn-ghost px-3 py-2 text-xs"
                                  onClick={() => updateSection(section.id, (current) => current.type === "social" ? {
                                    ...current,
                                    props: {
                                      ...current.props,
                                      items: current.props.items.filter((_, index) => index !== itemIndex),
                                    },
                                  } : current)}
                                  disabled={section.props.items.length <= 1}
                                >
                                  Remove
                                </button>
                              </div>
                            ))}
                            <button
                              type="button"
                              className="btn-ghost px-3 py-2 text-xs"
                              onClick={() => updateSection(section.id, (current) => current.type === "social" ? {
                                ...current,
                                props: {
                                  ...current.props,
                                  items: [...current.props.items, { platform: "instagram", handle: header.props.handle ?? "yourhandle" }],
                                },
                              } : current)}
                              disabled={section.props.items.length >= 6}
                            >
                              + Add social
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {editorTab === "style" ? (
              <div className="card flex min-h-0 flex-1 flex-col border border-onyx-700 bg-onyx-950/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-onyx-950/85">
                <div className="flex items-center gap-2 text-sm font-medium text-ivory">
                  <Palette className="size-4 text-gold" aria-hidden />
                  Theme quick switch
                </div>
                <p className="mt-2 text-sm text-ivory-dim">Use the same preset system as the main editor, then layer custom CSS on top.</p>
                <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {VISIBLE_THEMES.map((theme) => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setThemeId(theme.id)}
                      className={[
                        "rounded-card border p-3 text-left transition",
                        themeId === theme.id
                          ? "border-gold/60 bg-onyx-900 text-ivory"
                          : "border-onyx-800 bg-onyx-950/50 text-ivory-dim hover:border-gold/30 hover:bg-onyx-900",
                      ].join(" ")}
                    >
                      <div className="mb-3 flex gap-2">
                        <span className="size-4 rounded-full border border-white/10" style={{ backgroundColor: theme.preview.bg }} />
                        <span className="size-4 rounded-full border border-white/10" style={{ backgroundColor: theme.preview.fg }} />
                        <span className="size-4 rounded-full border border-white/10" style={{ backgroundColor: theme.preview.accent }} />
                      </div>
                      <p className="text-sm font-medium">{theme.name}</p>
                      <p className="mt-1 text-xs leading-5 text-ivory-dim">{theme.description}</p>
                    </button>
                  ))}
                </div>

                <Field label="Custom CSS" className="mt-5 flex-1">
                  <textarea
                    value={customCss}
                    onChange={(event) => setCustomCss(event.target.value)}
                    className="input min-h-[220px]"
                    placeholder=".vc-try-preview [data-section-type='link'] { letter-spacing: 0.02em; }"
                  />
                </Field>
              </div>
            ) : null}

            {editorTab === "settings" ? (
              <div className="card flex min-h-0 flex-1 flex-col border border-onyx-700 bg-onyx-950/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-onyx-950/85">
                <p className="text-sm font-medium text-ivory">Profile settings</p>
                <p className="mt-2 text-sm text-ivory-dim">Set the public URL and decide what happens next after the sandbox wow moment.</p>

                <div className="mt-5 grid gap-3">
                  <Field label="Public URL">
                    <div className="flex gap-2">
                      <input value={profileUrl} readOnly className="input flex-1" />
                      <button type="button" className="btn-ghost px-3 py-2 text-xs" onClick={copyPreviewUrl}>
                        {copied ? "Copied" : "Copy"}
                      </button>
                    </div>
                  </Field>

                  <div className="rounded-card border border-onyx-800 bg-onyx-950/50 p-4">
                    <p className="text-sm font-medium text-ivory">What happens after signup</p>
                    <p className="mt-2 text-sm leading-6 text-ivory-dim">We can hydrate this local draft into the real editor flow instead of sending people from a toy screen into a different product.</p>
                  </div>

                  <div className="rounded-card border border-onyx-800 bg-onyx-950/50 p-4">
                    <p className="text-sm font-medium text-ivory">Recommended CTA</p>
                    <p className="mt-2 text-sm text-ivory-dim">Keep the claim/save action attached to the current draft, not a separate fake experience.</p>
                  </div>
                </div>
              </div>
            ) : null}

            {editorTab === "advanced" ? (
              <div className="card flex min-h-0 flex-1 flex-col border border-onyx-700 bg-onyx-950/95 p-4 shadow-lg backdrop-blur supports-[backdrop-filter]:bg-onyx-950/85">
                <p className="text-sm font-medium text-ivory">Advanced</p>
                <p className="mt-2 text-sm text-ivory-dim">This sandbox is intentionally thin: local draft, real preview, and a shell that matches the signed-in editor.</p>

                <div className="mt-5 space-y-3">
                  <div className="rounded-card border border-onyx-800 bg-onyx-950/50 p-4">
                    <p className="text-sm font-medium text-ivory">Local storage key</p>
                    <p className="mt-1 text-xs text-ivory-dim">{STORAGE_KEY}</p>
                  </div>
                  <div className="rounded-card border border-onyx-800 bg-onyx-950/50 p-4">
                    <p className="text-sm font-medium text-ivory">Signed-in editor still adds</p>
                    <p className="mt-2 text-sm leading-6 text-ivory-dim">Autosave, publish flow, templates, media library, scheduling, versions, and A/B variants. This page now mirrors the shell so the transition is coherent.</p>
                  </div>
                </div>
              </div>
            ) : null}

            <div className="card border border-gold/25 bg-onyx-950/95 p-4 shadow-lg">
              <p className="text-xs uppercase tracking-[0.22em] text-gold/80">Ready to keep it?</p>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-medium text-ivory">Save this draft to a real profile</p>
                  <p className="text-xs text-ivory-dim">Free forever. No card required.</p>
                </div>
                <Link href="/signup" className="btn-gold px-4 py-2 text-sm">
                  Save this as my profile
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs uppercase tracking-widest text-ivory-mute">{label}</span>
      {children}
    </label>
  );
}

function createHeaderSection(profile: HeaderProfile): Extract<Section, { type: "header" }> {
  return {
    id: crypto.randomUUID(),
    type: "header",
    visible: true,
    props: {
      name: profile.name,
      handle: sanitizeHandle(profile.handle) || "yourhandle",
      tagline: profile.tagline,
      showVerified: true,
      coverFullBleed: false,
      coverShadow: false,
    },
  };
}

function createMarkdownSection(md: string): Extract<Section, { type: "markdown" }> {
  return {
    id: crypto.randomUUID(),
    type: "markdown",
    visible: true,
    props: { md },
  };
}

function createLinkSection(
  label: string,
  url: string,
  style: (typeof LINK_STYLES)[number],
): Extract<Section, { type: "link" }> {
  return {
    id: crypto.randomUUID(),
    type: "link",
    visible: true,
    props: { label, url, style },
  };
}

function createPhoneSection(
  label: string,
  phone: string,
  note?: string,
): Extract<Section, { type: "phone" }> {
  return {
    id: crypto.randomUUID(),
    type: "phone",
    visible: true,
    props: { label, phone, note },
  };
}

function createEmailSection(
  label: string,
  email: string,
  subject?: string,
): Extract<Section, { type: "email" }> {
  return {
    id: crypto.randomUUID(),
    type: "email",
    visible: true,
    props: { label, email, subject },
  };
}

function createSocialSection(
  items: Array<{ platform: (typeof SOCIAL_PLATFORMS)[number]; handle: string }>,
): Extract<Section, { type: "social" }> {
  return {
    id: crypto.randomUUID(),
    type: "social",
    visible: true,
    props: { items },
  };
}

function sanitizeHandle(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9_.-]/g, "").slice(0, 32);
}

function sanitizeCss(css: string) {
  return css
    .replace(/@import[^;]+;/gi, "")
    .replace(/javascript:/gi, "")
    .replace(/expression\s*\(/gi, "");
}

function sectionLabel(section: Section) {
  switch (section.type) {
    case "header":
      return "Header";
    case "link":
      return "Link";
    case "phone":
      return "Phone";
    case "email":
      return "Email";
    case "social":
      return "Social";
    case "markdown":
      return "Text";
    default:
      return section.type;
  }
}

function sectionSummary(section: Section) {
  switch (section.type) {
    case "header":
      return `@${section.props.handle ?? "yourhandle"}`;
    case "link":
      return section.props.label || section.props.url;
    case "phone":
      return section.props.note ?? section.props.phone;
    case "email":
      return section.props.email;
    case "social":
      return `${section.props.items.length} profile${section.props.items.length === 1 ? "" : "s"}`;
    case "markdown":
      return section.props.md.replace(/[*_`>#-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 72) || "Text block";
    default:
      return section.type;
  }
}

function sectionMatchesFilter(section: Section, filter: string) {
  const query = filter.trim().toLowerCase();
  if (!query) return true;
  return `${sectionLabel(section)} ${sectionSummary(section)}`.toLowerCase().includes(query);
}

function readStoredDraft(raw: string | null): DraftShape | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!isStoredDraft(parsed)) return null;
    const validatedSections = Sections.safeParse(parsed.sections);
    const sections = validatedSections.success ? validatedSections.data : parsed.sections;
    const nextDraft: DraftShape = {
      version: 2,
      themeId: parsed.themeId || DEFAULT_DRAFT.themeId,
      customCss: parsed.customCss,
      sections,
    };
    if (!nextDraft.sections.some((section) => section.type === "header")) {
      return DEFAULT_DRAFT;
    }
    return nextDraft;
  } catch {
    return null;
  }
}

function isStoredDraft(
  value: unknown,
): value is { version: 2; themeId: string; customCss: string; sections: SectionList } {
  if (!value || typeof value !== "object") return false;
  const record = value as Record<string, unknown>;
  return (
    record.version === 2
    && typeof record.themeId === "string"
    && typeof record.customCss === "string"
    && Array.isArray(record.sections)
  );
}
