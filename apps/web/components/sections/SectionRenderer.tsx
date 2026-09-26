import type { CSSProperties } from "react";
import type { LinkStyle, Section } from "@/lib/sections/types";
import { designAttributes, speedMultiplier } from "@/lib/sections/design";
import { StatsCounter } from "./StatsCounter";
import { AmbientVideo } from "./AmbientVideo";
import { markdownToHtml, socialHref } from "@/lib/sections/rendering";
import { BrandedQR } from "@/components/BrandedQR";
import { ProfileImage } from "@/components/profile/ProfileImage";
import { LeadFormSectionClient } from "./LeadFormSectionClient";
import { SectionMotion } from "./SectionMotion";
import { GallerySectionClient } from "./GallerySectionClient";
import { EmbedSectionClient } from "./EmbedSectionClient";
import { StoreSectionClient } from "./StoreSectionClient";
import { BookingSectionClient } from "./BookingSectionClient";
import { TipSectionClient } from "./TipSectionClient";
import { LinkIconGlyph } from "./LinkIcon";
import { BadgeCheck } from "lucide-react";

const SURFACE_BORDER = "color-mix(in srgb, var(--vc-accent, #d4af37) 24%, transparent)";

const cardStyle: CSSProperties = {
  background: "var(--vc-bg-2, #141414)",
  border: `1px solid ${SURFACE_BORDER}`,
  borderRadius: "var(--vc-radius, 14px)",
  color: "var(--vc-fg, #f7f3ea)",
  boxShadow: "0 18px 48px -28px rgba(0, 0, 0, 0.45)",
};

const pillStyle: CSSProperties = {
  border: `1px solid ${SURFACE_BORDER}`,
  borderRadius: "999px",
  color: "var(--vc-fg, #f7f3ea)",
  background: "color-mix(in srgb, var(--vc-bg-2, #141414) 85%, transparent)",
};

const ghostStyle: CSSProperties = {
  border: `1px solid ${SURFACE_BORDER}`,
  borderRadius: "var(--vc-radius, 14px)",
  color: "var(--vc-accent, #d4af37)",
  background: "transparent",
};

function socialIconName(platform: string) {
  switch (platform) {
    case "instagram":
    case "snapchat":
      return "camera";
    case "tiktok":
      return "music";
    case "youtube":
      return "youtube";
    case "github":
      return "github";
    case "linkedin":
      return "linkedin";
    case "threads":
      return "message";
    case "facebook":
      return "user";
    case "x":
      return "external";
    default:
      return "link";
  }
}

function scheduleLabel(provider: "calcom" | "calendly" | "ed5") {
  switch (provider) {
    case "calcom":
      return "Book on Cal.com";
    case "calendly":
      return "Book on Calendly";
    case "ed5":
      return "Book with ED5";
  }
}
/** Photo and/or looping video painted behind a section (design.media). */
function DesignMedia({ section }: { section: Section }) {
  const media = section.design?.media;
  if (!media?.image && !media?.video) return null;
  return (
    <div className="vc-design-media" aria-hidden>
      {media.image ? <ProfileImage src={media.image} alt="" fill sizes="(max-width: 768px) 100vw, 1200px" className="object-cover" /> : null}
      {media.video ? <AmbientVideo src={media.video} poster={media.image} /> : null}
    </div>
  );
}

// Premium styles are painted by `[data-vc-link-style]` rules in globals.css.
const PREMIUM_LINK_STYLES = new Set<LinkStyle>(["gold", "glass", "outline", "underline", "neon"]);

function renderLinkStyle(style: LinkStyle): CSSProperties | undefined {
  switch (style) {
    case "pill":
      return pillStyle;
    case "ghost":
      return ghostStyle;
    case "card":
      return cardStyle;
    default:
      return PREMIUM_LINK_STYLES.has(style) ? { borderRadius: "999px" } : cardStyle;
  }
}

export function SectionRenderer({
  section,
  verified,
  username,
  canEdit,
  editHref,
  isTop,
  topBleedOffset = "page",
}: {
  section: Section;
  verified?: boolean;
  username?: string;
  canEdit?: boolean;
  editHref?: string;
  isTop?: boolean;
  topBleedOffset?: "page" | "none";
}) {
  if (!section.visible) return null;
  const animation = section.display?.animation ?? "none";
  const animationTrigger = section.display?.animationTrigger ?? "load";
  const delay = section.display?.animationDelay ?? 0;
  const speed = speedMultiplier(section.design);
  const design = designAttributes(section.design);
  const designProps = design
    ? { className: design.className, style: design.style as CSSProperties, ...design.data }
    : {};
  // Top-of-page full-bleed: when this is the first section AND it opts in, escape page padding
  // (px-4/sm:px-6 + pt-8/sm:pt-10) and cover the top safe-area inset so cover/header images go
  // edge-to-edge and reach the very top of the viewport (under the notch on iOS).
  const wantsTopBleed = !!isTop && (
    (section.type === "header" && !!section.props.coverUrl) ||
    (section.type === "image" && (section.props as { fullWidth?: boolean }).fullWidth === true)
  );
  if (wantsTopBleed) {
    const topBleedClassName = topBleedOffset === "none" ? "-mx-4 sm:-mx-6" : "-mx-4 -mt-8 sm:-mx-6 sm:-mt-10";
    const sectionFrame = (
      <div
        data-vc-section
        data-section-type={section.type}
        data-vc-top-bleed="1"
        {...designProps}
        className={[topBleedClassName, design?.className].filter(Boolean).join(" ")}
        style={{ ...(topBleedOffset === "none" ? {} : { paddingTop: "env(safe-area-inset-top, 0px)" }), ...(design?.style as CSSProperties | undefined) }}
      >
        <DesignMedia section={section} />
        {renderSectionInner(section, verified, username, canEdit, editHref, true)}
      </div>
    );

    if (animation === "none") return sectionFrame;

    return (
      <SectionMotion animation={animation} trigger={animationTrigger} delay={delay} speed={speed}>
        {sectionFrame}
      </SectionMotion>
    );
  }

  const sectionFrame = (
    <div data-vc-section data-section-type={section.type} {...designProps}>
      <DesignMedia section={section} />
      {renderSectionInner(section, verified, username, canEdit, editHref)}
    </div>
  );

  if (animation === "none") return sectionFrame;

  return (
    <SectionMotion animation={animation} trigger={animationTrigger} delay={delay} speed={speed}>
      {sectionFrame}
    </SectionMotion>
  );
}

function renderSectionInner(
  section: Section,
  verified?: boolean,
  username?: string,
  canEdit?: boolean,
  editHref?: string,
  topBleed?: boolean,
) {
  switch (section.type) {
    case "header": {
      const p = section.props;
      const descriptors = p.descriptors?.filter(Boolean) ?? [];
      if (p.layout === "hero") {
        return (
          <header className="vc-hero p-6 sm:p-8 md:p-10" data-vc-hero>
            <div className="vc-hero-media" aria-hidden>
              {p.coverUrl ? <ProfileImage src={p.coverUrl} alt="" fill priority sizes="100vw" className="object-cover" /> : <div className="absolute inset-0" style={{ background: "radial-gradient(120% 90% at 30% 20%, color-mix(in srgb, var(--vc-accent, #d4af37) 45%, #000), #050505)" }} />}
              {p.coverVideoUrl ? <AmbientVideo src={p.coverVideoUrl} poster={p.coverUrl} /> : null}
            </div>
            <div className="relative flex max-w-2xl flex-col gap-4">
              {p.avatarUrl ? (
                <div className={["size-16 overflow-hidden border-2 shadow-2xl sm:size-20", p.avatarShape === "square" ? "rounded-md" : p.avatarShape === "rounded" ? "rounded-[28%]" : "rounded-full"].join(" ")} style={{ borderColor: "color-mix(in srgb, var(--vc-accent, #d4af37) 75%, #fff)" }}>
                  <ProfileImage src={p.avatarUrl} alt={p.name} width={80} height={80} sizes="80px" className="size-full object-cover" />
                </div>
              ) : null}
              {descriptors.length > 0 ? (
                <p className="text-[11px] font-medium uppercase tracking-[0.35em]" style={{ color: "color-mix(in srgb, var(--vc-accent, #d4af37) 40%, #fff)" }}>
                  {descriptors.join("  ·  ")}
                </p>
              ) : null}
              <h1 className="font-display text-4xl leading-[1.02] tracking-tight drop-shadow-[0_4px_24px_rgba(0,0,0,0.5)] sm:text-5xl md:text-6xl" style={{ overflowWrap: "anywhere" }}>
                {p.name}
                {verified && p.showVerified ? (
                  <span className="ml-2 inline-flex align-middle" style={{ color: "var(--vc-accent, #d4af37)" }} title="Verified badge">
                    <BadgeCheck className="size-7" aria-hidden />
                    <span className="sr-only">Verified badge</span>
                  </span>
                ) : null}
              </h1>
              {p.tagline ? <p className="max-w-xl text-base leading-relaxed text-white/85 sm:text-lg">{p.tagline}</p> : null}
              {canEdit && editHref ? (
                <a href={editHref} className="w-fit rounded-pill border border-white/40 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-white/90" data-testid="profile-edit-link" aria-label="Edit profile">Edit</a>
              ) : null}
            </div>
          </header>
        );
      }
      const fullBleedTopHeader = !!topBleed && !!p.coverUrl;
      const avatarOverlapClass = p.coverUrl ? "-mt-12" : "";
      const avatarRadiusClass = p.avatarShape === "square" ? "rounded-md" : p.avatarShape === "rounded" ? "rounded-[28%]" : "rounded-full";
      const fullBleedStyle: CSSProperties | undefined = p.coverFullBleed || fullBleedTopHeader
        ? (topBleed
            ? { width: "100%", marginLeft: 0, marginRight: 0, borderRadius: 0, border: "none" }
            : { width: "calc(100% + 40px)", marginLeft: "-20px", marginRight: "-20px", borderRadius: 0, border: "none" })
        : undefined;
      const coverStyle: CSSProperties = {
        ...cardStyle,
        ...fullBleedStyle,
        boxShadow: p.coverShadow ? cardStyle.boxShadow : "none",
      };
      return (
        <header
          className={[
            "relative flex flex-col",
            p.layout === "left" ? "items-start text-left [&>div]:justify-start [&>h1]:px-0 [&>p]:px-0 [&>div]:px-0" : "items-center text-center",
            fullBleedTopHeader ? "" : "pt-6",
          ].join(" ").trim()}
          style={{ color: "var(--vc-fg, #f7f3ea)" }}
        >
          {p.coverUrl ? (
            <div className={["relative mb-0 w-full overflow-hidden", fullBleedTopHeader ? "sticky top-0 z-0 h-48 sm:h-64" : "h-36"].join(" ").trim()} style={coverStyle} data-vc-header-cover>
              <ProfileImage src={p.coverUrl} alt={`${p.name} cover`} fill sizes={fullBleedTopHeader ? "100vw" : "(max-width: 640px) 100vw, 480px"} priority={fullBleedTopHeader} className="object-cover" />
              <div
                className="pointer-events-none absolute inset-x-0 bottom-0 h-24"
                style={{ background: "linear-gradient(to top, var(--vc-bg, #0a0a0a), color-mix(in srgb, var(--vc-bg, #0a0a0a) 52%, transparent), transparent)" }}
                aria-hidden
              />
            </div>
          ) : null}
          {p.avatarUrl ? (
            <div
              className={[
                "relative z-10 overflow-hidden p-0.5 shadow-[0_18px_42px_-22px_rgba(0,0,0,0.95),0_0_0_1px_rgba(255,255,255,0.08)]",
                avatarRadiusClass,
                p.avatarRing === "none" ? "border-0" : "border-[3px]",
                avatarOverlapClass,
              ].join(" ").trim()}
              style={{
                backgroundColor: "var(--vc-bg, #0a0a0a)",
                ...(p.avatarRing === "gradient"
                  ? {
                      borderColor: "transparent",
                      background: "linear-gradient(var(--vc-bg, #0a0a0a), var(--vc-bg, #0a0a0a)) padding-box, conic-gradient(from 140deg, var(--vc-accent, #d4af37), var(--vc-accent-2, #f0d97e), #fff4d6, var(--vc-accent, #d4af37)) border-box",
                    }
                  : { borderColor: "color-mix(in srgb, var(--vc-accent, #d4af37) 68%, rgba(255,255,255,0.28))" }),
              }}
            >
              <ProfileImage src={p.avatarUrl} alt={p.name} width={96} height={96} sizes="96px" className={["size-24 object-cover", avatarRadiusClass].join(" ")} />
            </div>
          ) : null}
          <h1 className="relative z-10 mt-3 w-full break-words px-4 font-display text-2xl leading-tight drop-shadow-[0_2px_12px_rgba(0,0,0,0.45)]" style={{ color: "var(--vc-fg, #f7f3ea)", maxWidth: "calc(100% - 2rem)", overflowWrap: "anywhere" }}>
            {p.name}
            {verified && p.showVerified ? (
              <span className="ml-1.5 inline-flex items-center align-middle" style={{ color: "var(--vc-accent, #d4af37)" }} title="Verified badge">
                <BadgeCheck className="size-5 drop-shadow-[0_0_10px_rgba(212,175,55,0.28)]" aria-hidden />
                <span className="sr-only">Verified badge</span>
              </span>
            ) : null}
            {canEdit && editHref ? (
              <a
                href={editHref}
                className="ml-2 inline-flex items-center rounded-pill border px-2 py-0.5 align-middle text-[10px] uppercase tracking-[0.18em]"
                style={{
                  borderColor: "color-mix(in srgb, var(--vc-accent, #d4af37) 60%, transparent)",
                  color: "var(--vc-accent, #d4af37)",
                  background: "color-mix(in srgb, var(--vc-accent, #d4af37) 12%, transparent)",
                }}
                data-testid="profile-edit-link"
                aria-label="Edit profile"
              >
                Edit
              </a>
            ) : null}
          </h1>
          {descriptors.length > 0 ? (
            <div className="relative z-10 mt-2 flex max-w-full flex-wrap justify-center gap-1.5 px-4">
              {descriptors.map((descriptor) => (
                <span key={descriptor} className="rounded-pill px-3 py-1 text-[11px] font-medium" style={pillStyle}>
                  {descriptor}
                </span>
              ))}
            </div>
          ) : p.handle ? <p className="relative z-10 mt-1 w-full break-words px-4 text-sm font-medium" style={{ color: "color-mix(in srgb, var(--vc-fg-mute, #a8a39a) 86%, var(--vc-accent, #d4af37))", maxWidth: "calc(100% - 2rem)", overflowWrap: "anywhere" }}>@{p.handle}</p> : null}
          {p.tagline ? <p className="relative z-10 mt-2 w-full max-w-sm text-balance px-4 text-sm leading-relaxed" style={{ color: "var(--vc-fg-mute, #a8a39a)", maxWidth: "min(24rem, calc(100% - 2rem))", overflowWrap: "anywhere" }}>{p.tagline}</p> : null}
        </header>
      );
    }
    case "link": {
      const p = section.props;
      return (
        <a
          href={p.url}
          target="_blank"
          rel="noopener noreferrer"
          data-section-type="link"
          data-vc-link
          className={[
            "flex items-center justify-between gap-3 px-4 py-3.5 text-sm transition",
            p.style === "card" || p.style === "ghost" ? "rounded-card" : "rounded-pill",
          ].join(" ")}
          style={renderLinkStyle(p.style)}
          data-vc-link-style={PREMIUM_LINK_STYLES.has(p.style) ? p.style : undefined}
        >
          <span className="flex min-w-0 items-center gap-3">
            {p.iconImageUrl ? (
              <ProfileImage src={p.iconImageUrl} alt="" width={36} height={36} sizes="36px" className="size-9 shrink-0 rounded-full object-cover" />
            ) : p.iconName ? (
              <span
                className="flex size-9 shrink-0 items-center justify-center rounded-full"
                style={{
                  background: "color-mix(in srgb, var(--vc-accent, #d4af37) 12%, transparent)",
                  color: "var(--vc-accent, #d4af37)",
                }}
              >
                <LinkIconGlyph name={p.iconName} className="size-4" />
              </span>
            ) : p.icon ? (
              <span
                className="shrink-0 rounded-pill px-2 py-1 text-[10px] uppercase tracking-[0.24em]"
                style={{
                  background: "color-mix(in srgb, var(--vc-accent, #d4af37) 12%, transparent)",
                  color: "var(--vc-accent, #d4af37)",
                }}
              >
                {p.icon}
              </span>
            ) : null}
            <span className="truncate">{p.label}</span>
          </span>
          <span className="shrink-0" style={{ color: "var(--vc-accent, #d4af37)" }}><LinkIconGlyph name="external" className="size-4" /></span>
        </a>
      );
    }
    case "phone": {
      const p = section.props;
      return (
        <a href={`tel:${p.phone.replace(/[^+\d]/g, "") || p.phone}`} data-vc-link className="flex items-center justify-between gap-3 rounded-card px-4 py-3.5 text-sm transition" style={renderLinkStyle("card")}>
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--vc-accent, #d4af37) 12%, transparent)", color: "var(--vc-accent, #d4af37)" }}>
              <LinkIconGlyph name="phone" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{p.label}</span>
              <span className="block truncate text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{p.note ?? p.phone}</span>
            </span>
          </span>
          <span className="shrink-0" style={{ color: "var(--vc-accent, #d4af37)" }}><LinkIconGlyph name="external" className="size-4" /></span>
        </a>
      );
    }
    case "email": {
      const p = section.props;
      const subject = p.subject ? `?subject=${encodeURIComponent(p.subject)}` : "";
      return (
        <a href={`mailto:${p.email}${subject}`} data-vc-link className="flex items-center justify-between gap-3 rounded-card px-4 py-3.5 text-sm transition" style={renderLinkStyle("card")}>
          <span className="flex min-w-0 items-center gap-3">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--vc-accent, #d4af37) 12%, transparent)", color: "var(--vc-accent, #d4af37)" }}>
              <LinkIconGlyph name="mail" className="size-4" />
            </span>
            <span className="min-w-0">
              <span className="block truncate font-medium">{p.label}</span>
              <span className="block truncate text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{p.email}</span>
            </span>
          </span>
          <span className="shrink-0" style={{ color: "var(--vc-accent, #d4af37)" }}><LinkIconGlyph name="external" className="size-4" /></span>
        </a>
      );
    }
    case "image": {
      const p = section.props;
      const fullWidth = (p as { fullWidth?: boolean }).fullWidth === true;
      return (
        <ProfileImage
          src={p.src}
          alt={p.alt}
          width={1200}
          height={800}
          sizes={topBleed && fullWidth ? "100vw" : "(max-width: 640px) 100vw, 480px"}
          priority={!!topBleed && fullWidth}
          className={topBleed && fullWidth ? "h-auto w-full object-cover" : "h-auto w-full object-cover"}
          style={{ borderRadius: (topBleed && fullWidth) ? 0 : (p.rounded ? "var(--vc-radius, 14px)" : undefined) }}
        />
      );
    }
    case "youtube": {
      const p = section.props;
      return (
        <div className="aspect-video overflow-hidden" style={{ borderRadius: "var(--vc-radius, 14px)" }}>
          <iframe
            className="h-full w-full"
            src={`https://www.youtube-nocookie.com/embed/${p.id}`}
            title="YouTube embed"
            loading="lazy"
            allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
            allowFullScreen
          />
        </div>
      );
    }
    case "spotify": {
      const p = section.props;
      const src = `https://open.spotify.com/embed/${p.uri.replace("spotify:", "").replace(/:/g, "/")}`;
      return <iframe className="h-[80px] w-full" style={{ borderRadius: "var(--vc-radius, 14px)" }} src={src} title="Spotify embed" loading="lazy" />;
    }
    case "video": {
      const p = section.props;
      const aspect = p.aspect ? { aspectRatio: p.aspect.replace("/", " / ") } : undefined;
      return (
        <figure className="space-y-2">
          {p.ambient ? (
            <div className="relative w-full overflow-hidden" style={{ borderRadius: "var(--vc-radius, 14px)", aspectRatio: aspect?.aspectRatio ?? "16 / 9" }}>
              {p.poster ? <ProfileImage src={p.poster} alt="" fill sizes="(max-width: 768px) 100vw, 1200px" className="object-cover" /> : null}
              <AmbientVideo src={p.src} poster={p.poster} className="absolute inset-0 size-full object-cover" />
            </div>
          ) : (
            <video
              className="h-auto w-full object-cover"
              style={{ borderRadius: "var(--vc-radius, 14px)", ...aspect }}
              src={p.src}
              poster={p.poster}
              controls
              playsInline
              preload="metadata"
            />
          )}
          {p.caption ? <figcaption className="text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{p.caption}</figcaption> : null}
        </figure>
      );
    }
    case "social": {
      const p = section.props;
      const displayMode = p.displayMode ?? "iconLabel";
      return (
        <div className="flex flex-wrap justify-center gap-3">
          {p.items.map((item) => (
            <a
              key={item.platform + item.handle}
              href={socialHref(item.platform, item.handle)}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-xs uppercase tracking-widest"
              style={pillStyle}
              aria-label={item.platform}
            >
              {displayMode !== "label" ? <LinkIconGlyph name={socialIconName(item.platform)} className="size-3.5" /> : null}
              {displayMode !== "icon" ? <span>{item.platform}</span> : null}
            </a>
          ))}
        </div>
      );
    }
    case "markdown":
      return (
        <div
          className="prose max-w-none"
          style={{ color: "var(--vc-fg-mute, #a8a39a)" }}
          dangerouslySetInnerHTML={{ __html: markdownToHtml(section.props.md) }}
        />
      );
    case "divider":
      return <hr className="my-2" style={{ borderColor: SURFACE_BORDER }} />;
    case "spacer":
      return <div style={{ height: section.props.height }} />;
    case "qr":
      return (
        <div className="flex flex-col items-center p-4" style={cardStyle}>
          <BrandedQR
            value={section.props.url}
            size={220}
            variant="onyx"
            ariaLabel={section.props.label ?? "QR"}
            className="rounded-card"
          />
          {section.props.label ? <p className="mt-3 text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{section.props.label}</p> : null}
        </div>
      );
    case "schedule":
      return (
        <a
          href={section.props.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex w-full items-center justify-center rounded-pill px-4 py-3 text-sm font-medium"
          style={{
            background: "var(--vc-accent, #d4af37)",
            color: "var(--vc-bg, #0a0a0a)",
          }}
        >
          {scheduleLabel(section.props.provider)}
        </a>
      );
    case "tip":
      return <TipSectionClient stripeAccountId={section.props.stripeAccountId} amounts={section.props.amounts} username={username} />;
    case "gallery":
      return (
        <GallerySectionClient
          images={section.props.images}
          layout={section.props.layout ?? "grid"}
          lightbox={section.props.lightbox ?? true}
          carouselFullWidth={section.props.carouselFullWidth ?? false}
          filters={section.props.filters ?? []}
          showCategoryStories={section.props.showCategoryStories ?? false}
          radius="var(--vc-radius, 14px)"
        />
      );
    case "embed":
      return (
        <EmbedSectionClient
          html={section.props.html}
          height={section.props.height}
          autoHeight={section.props.autoHeight ?? false}
          allowDomains={section.props.allowDomains ?? []}
          style={cardStyle}
        />
      );
    case "form":
      return <LeadFormSectionClient section={section} />;
    case "store":
      return (
        <StoreSectionClient
          title={section.props.title}
          productIds={section.props.productIds}
          layout={section.props.layout}
          showPrice={section.props.showPrice}
          buttonLabel={section.props.buttonLabel}
          username={username}
        />
      );
    case "booking":
      return (
        <BookingSectionClient
          ownerSlug={section.props.ownerSlug}
          height={section.props.height}
          theme={section.props.theme}
          ctaLabel={section.props.ctaLabel}
          mode={section.props.mode}
          style={cardStyle}
        />
      );
    case "stats": {
      const p = section.props;
      return (
        <div className="space-y-3" data-vc-stats>
          {p.title ? <p className="text-xs uppercase tracking-[0.25em]" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{p.title}</p> : null}
          <div className="grid gap-3" style={{ gridTemplateColumns: `repeat(auto-fit, minmax(${p.items.length > 3 ? 110 : 90}px, 1fr))` }}>
            {p.items.map((item, index) => (
              <div key={`${item.value}-${index}`} className="min-w-0">
                <p className="truncate font-display text-3xl leading-none tracking-tight" style={{ color: "var(--vc-tile-accent, var(--vc-accent, #d4af37))" }}>
                  {p.countUp === false ? item.value : <StatsCounter value={item.value} />}
                </p>
                {item.label ? <p className="mt-1.5 text-xs leading-snug" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{item.label}</p> : null}
              </div>
            ))}
          </div>
        </div>
      );
    }
    case "testimonial": {
      const p = section.props;
      const rating = Math.max(0, Math.min(5, p.rating ?? 0));
      return (
        <figure className="space-y-4" data-vc-testimonial>
          {rating > 0 ? (
            <p aria-label={`${rating} out of 5 stars`} className="text-sm tracking-[0.2em]" style={{ color: "var(--vc-tile-accent, var(--vc-accent, #d4af37))" }}>
              {"★".repeat(rating)}<span style={{ opacity: 0.25 }}>{"★".repeat(5 - rating)}</span>
            </p>
          ) : null}
          <blockquote className="font-display text-lg leading-snug" style={{ color: "var(--vc-fg, #f7f3ea)" }}>
            “{p.quote}”
          </blockquote>
          {p.author || p.role ? (
            <figcaption className="flex items-center gap-3">
              {p.avatarUrl ? (
                <ProfileImage src={p.avatarUrl} alt={p.author} width={40} height={40} className="size-10 shrink-0 rounded-full object-cover" />
              ) : null}
              <span className="min-w-0">
                {p.author ? <span className="block truncate text-sm font-medium">{p.author}</span> : null}
                {p.role ? <span className="block truncate text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{p.role}</span> : null}
              </span>
            </figcaption>
          ) : null}
        </figure>
      );
    }
    case "feature": {
      const p = section.props;
      const isGlyph = !!p.icon && /^[a-z-]+$/.test(p.icon);
      return (
        <div className="space-y-3" data-vc-feature>
          {p.icon ? (
            <span className="inline-flex size-11 items-center justify-center rounded-2xl text-xl" style={{ background: "color-mix(in srgb, var(--vc-tile-accent, var(--vc-accent, #d4af37)) 14%, transparent)", color: "var(--vc-tile-accent, var(--vc-accent, #d4af37))" }} aria-hidden>
              {isGlyph ? <LinkIconGlyph name={p.icon} className="size-5" /> : p.icon}
            </span>
          ) : null}
          <h3 className="font-display text-xl leading-tight" style={{ color: "var(--vc-fg, #f7f3ea)" }}>{p.title}</h3>
          {p.body ? <p className="text-sm leading-relaxed" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{p.body}</p> : null}
          {p.ctaUrl ? (
            <a href={p.ctaUrl} data-vc-link className="inline-flex items-center gap-1.5 text-sm font-medium" style={{ color: "var(--vc-tile-accent, var(--vc-accent, #d4af37))" }} target="_blank" rel="noopener noreferrer">
              {p.ctaLabel || "Learn more"} <span aria-hidden>→</span>
            </a>
          ) : null}
        </div>
      );
    }
    case "map":
      return (
        <div style={cardStyle}>
          <iframe
            className="aspect-video w-full"
            src={`https://www.google.com/maps?q=${section.props.lat},${section.props.lng}&output=embed`}
            title={section.props.label ?? "Map"}
            loading="lazy"
            style={{ border: 0, borderRadius: "var(--vc-radius, 14px)" }}
          />
          {section.props.label ? <p className="px-4 pb-4 pt-2 text-xs" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{section.props.label}</p> : null}
        </div>
      );
  }
}
