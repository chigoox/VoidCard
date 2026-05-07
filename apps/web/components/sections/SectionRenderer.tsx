import type { CSSProperties } from "react";
import type { Section } from "@/lib/sections/types";
import { BrandedQR } from "@/components/BrandedQR";
import { LeadFormSectionClient } from "./LeadFormSectionClient";
import { SectionMotion } from "./SectionMotion";
import { GallerySectionClient } from "./GallerySectionClient";
import { EmbedSectionClient } from "./EmbedSectionClient";
import { StoreSectionClient } from "./StoreSectionClient";

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

function socialBase(platform: string) {
  const map: Record<string, string> = {
    instagram: "https://instagram.com/",
    tiktok: "https://tiktok.com/@",
    x: "https://x.com/",
    linkedin: "https://linkedin.com/in/",
    youtube: "https://youtube.com/@",
    threads: "https://threads.net/@",
    github: "https://github.com/",
    facebook: "https://facebook.com/",
    snapchat: "https://snapchat.com/add/",
  };

  return map[platform] ?? "https://example.com/";
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

export function SectionRenderer({ section, verified, username }: { section: Section; verified?: boolean; username?: string }) {
  if (!section.visible) return null;
  const animation = section.display?.animation ?? "none";
  const delay = section.display?.animationDelay ?? 0;
  return (
    <SectionMotion animation={animation} delay={delay}>
      <div data-vc-section data-section-type={section.type}>
        {renderSectionInner(section, verified, username)}
      </div>
    </SectionMotion>
  );
}

function renderSectionInner(section: Section, verified?: boolean, username?: string) {
  switch (section.type) {
    case "header": {
      const p = section.props;
      const fullBleedStyle: CSSProperties | undefined = p.coverFullBleed
        ? { width: "calc(100% + 40px)", marginLeft: "-20px", marginRight: "-20px", borderRadius: 0, border: "none" }
        : undefined;
      return (
        <header className="flex flex-col items-center pt-6 text-center" style={{ color: "var(--vc-fg, #f7f3ea)" }}>
          {p.coverUrl ? (
            <div className="mb-4 w-full overflow-hidden" style={{ ...cardStyle, ...fullBleedStyle }}>
              <img src={p.coverUrl} alt={`${p.name} cover`} loading="lazy" decoding="async" className="h-32 w-full object-cover" />
            </div>
          ) : null}
          {p.avatarUrl ? (
            <div className="overflow-hidden rounded-full border-2" style={{ borderColor: SURFACE_BORDER }}>
              <img src={p.avatarUrl} alt={p.name} loading="lazy" decoding="async" className="size-24 object-cover" />
            </div>
          ) : null}
          <h1 className="mt-4 font-display text-2xl" style={{ color: "var(--vc-fg, #f7f3ea)" }}>
            {p.name}
            {verified && p.showVerified ? (
              <span className="ml-1" style={{ color: "var(--vc-accent, #d4af37)" }}>✓</span>
            ) : null}
          </h1>
          {p.handle ? <p className="mt-1 text-sm" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>@{p.handle}</p> : null}
          {p.tagline ? <p className="mt-3 max-w-sm text-sm" style={{ color: "var(--vc-fg-mute, #a8a39a)" }}>{p.tagline}</p> : null}
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
      return (
        <img
          src={p.src}
          alt={p.alt}
          loading="lazy"
          decoding="async"
          className="h-auto w-full object-cover"
          style={{ borderRadius: p.rounded ? "var(--vc-radius, 14px)" : undefined }}
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
              href={`${socialBase(item.platform)}${item.handle}`}
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
          dangerouslySetInnerHTML={{ __html: escape(section.props.md) }}
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
      return (
        <div className="p-4" style={cardStyle}>
          <p className="mb-2 text-sm uppercase tracking-widest" style={{ color: "var(--vc-accent, #d4af37)" }}>Leave a tip</p>
          <div className="flex gap-2">
            {section.props.amounts.map((amount) => (
              <button key={amount} className="flex-1 rounded-pill px-3 py-2.5 text-sm" style={ghostStyle}>
                ${(amount / 100).toFixed(0)}
              </button>
            ))}
          </div>
        </div>
      );
    case "gallery":
      return (
        <GallerySectionClient
          images={section.props.images}
          layout={section.props.layout ?? "grid"}
          lightbox={section.props.lightbox ?? true}
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

function escape(s: string) {
  return s.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c] as string));
}
