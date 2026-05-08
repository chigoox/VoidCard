import type { CSSProperties } from "react";
import type { Section } from "@/lib/sections/types";
import { markdownToHtml, socialHref } from "@/lib/sections/rendering";
import { BrandedQR } from "@/components/BrandedQR";
import { LeadFormSectionClient } from "./LeadFormSectionClient";
import { SectionMotion } from "./SectionMotion";
import { GallerySectionClient } from "./GallerySectionClient";
import { EmbedSectionClient } from "./EmbedSectionClient";
import { StoreSectionClient } from "./StoreSectionClient";
import { BookingSectionClient } from "./BookingSectionClient";
import { TipSectionClient } from "./TipSectionClient";

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
function renderLinkStyle(style: "pill" | "card" | "ghost") {
  switch (style) {
    case "pill":
      return pillStyle;
    case "ghost":
      return ghostStyle;
    default:
      return cardStyle;
  }
}

export function SectionRenderer({
  section,
  verified,
  username,
  isTop,
  topBleedOffset = "page",
}: {
  section: Section;
  verified?: boolean;
  username?: string;
  isTop?: boolean;
  topBleedOffset?: "page" | "none";
}) {
  if (!section.visible) return null;
  const animation = section.display?.animation ?? "none";
  const delay = section.display?.animationDelay ?? 0;
  // Top-of-page full-bleed: when this is the first section AND it opts in, escape page padding
  // (px-4/sm:px-6 + pt-8/sm:pt-10) and cover the top safe-area inset so cover/header images go
  // edge-to-edge and reach the very top of the viewport (under the notch on iOS).
  const wantsTopBleed = !!isTop && (
    (section.type === "header" && !!section.props.coverUrl) ||
    (section.type === "image" && (section.props as { fullWidth?: boolean }).fullWidth === true)
  );
  if (wantsTopBleed) {
    const topBleedClassName = topBleedOffset === "none" ? "-mx-4 sm:-mx-6" : "-mx-4 -mt-8 sm:-mx-6 sm:-mt-10";
    return (
      <SectionMotion animation={animation} delay={delay}>
        <div
          data-vc-section
          data-section-type={section.type}
          data-vc-top-bleed="1"
          className={topBleedClassName}
          style={topBleedOffset === "none" ? undefined : { paddingTop: "env(safe-area-inset-top, 0px)" }}
        >
          {renderSectionInner(section, verified, username, true)}
        </div>
      </SectionMotion>
    );
  }
  return (
    <SectionMotion animation={animation} delay={delay}>
      <div data-vc-section data-section-type={section.type}>
        {renderSectionInner(section, verified, username)}
      </div>
    </SectionMotion>
  );
}

function renderSectionInner(section: Section, verified?: boolean, username?: string, topBleed?: boolean) {
  switch (section.type) {
    case "header": {
      const p = section.props;
      const fullBleedTopHeader = !!topBleed && !!p.coverUrl;
      const fullBleedStyle: CSSProperties | undefined = p.coverFullBleed || fullBleedTopHeader
        ? (topBleed
            ? { width: "100%", marginLeft: 0, marginRight: 0, borderRadius: 0, border: "none" }
            : { width: "calc(100% + 40px)", marginLeft: "-20px", marginRight: "-20px", borderRadius: 0, border: "none" })
        : undefined;
      return (
        <header className={["relative flex flex-col items-center text-center", fullBleedTopHeader ? "" : "pt-6"].join(" ").trim()} style={{ color: "var(--vc-fg, #f7f3ea)" }}>
          {p.coverUrl ? (
            <div className={["mb-4 w-full overflow-hidden", fullBleedTopHeader ? "sticky top-0 z-0" : ""].join(" ").trim()} style={{ ...cardStyle, ...fullBleedStyle }}>
              <img src={p.coverUrl} alt={`${p.name} cover`} loading="lazy" decoding="async" className={fullBleedTopHeader ? "h-48 w-full object-cover sm:h-64" : "h-32 w-full object-cover"} />
            </div>
          ) : null}
          {p.avatarUrl ? (
            <div className="relative z-10 overflow-hidden rounded-full border-2" style={{ borderColor: SURFACE_BORDER }}>
              <img src={p.avatarUrl} alt={p.name} loading="lazy" decoding="async" className="size-24 object-cover" />
            </div>
          ) : null}
          <h1 className="relative z-10 mt-4 font-display text-2xl" style={{ color: "var(--vc-fg, #f7f3ea)" }}>
            {p.name}
            {verified && p.showVerified ? (
              <span className="ml-1" style={{ color: "var(--vc-accent, #d4af37)" }}>✓</span>
            ) : null}
          </h1>
          {p.handle ? <p className="relative z-10 mt-1 text-sm" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>@{p.handle}</p> : null}
          {p.tagline ? <p className="relative z-10 mt-3 max-w-sm text-sm" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{p.tagline}</p> : null}
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
            p.style === "pill" ? "rounded-pill" : "rounded-card",
          ].join(" ")}
          style={renderLinkStyle(p.style)}
        >
          <span className="flex min-w-0 items-center gap-3">
            {p.icon ? (
              <span
                className="rounded-pill px-2 py-1 text-[10px] uppercase tracking-[0.24em]"
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
          <span style={{ color: "var(--vc-accent, #d4af37)" }}>→</span>
        </a>
      );
    }
    case "image": {
      const p = section.props;
      const fullWidth = (p as { fullWidth?: boolean }).fullWidth === true;
      return (
        <img
          src={p.src}
          alt={p.alt}
          loading="lazy"
          decoding="async"
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
      return (
        <video
          className="h-auto w-full"
          style={{ borderRadius: "var(--vc-radius, 14px)" }}
          src={p.src}
          poster={p.poster}
          controls
          preload="metadata"
        />
      );
    }
    case "social": {
      const p = section.props;
      return (
        <div className="flex flex-wrap justify-center gap-3">
          {p.items.map((item) => (
            <a
              key={item.platform + item.handle}
              href={socialHref(item.platform, item.handle)}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-pill px-3 py-1 text-xs uppercase tracking-widest"
              style={pillStyle}
            >
              {item.platform}
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
