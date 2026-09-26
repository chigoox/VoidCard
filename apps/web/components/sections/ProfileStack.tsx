import type { CSSProperties, ReactNode } from "react";
import type { Section } from "@/lib/sections/types";
import {
  cellStyleVars,
  layoutBottom,
  resolveDesktopLayout,
  visibilityClassName,
  type DesktopLayoutSettings,
} from "@/lib/sections/desktopLayout";

/**
 * Renders profile sections as the mobile stack and, when the desktop layout is
 * enabled, places the same DOM on a 12-column grid at the desktop breakpoint
 * (see `desktopLayoutCss`). Sections render once, so forms, embeds and
 * trackers never duplicate.
 */
export function ProfileStack({
  sections,
  settings,
  renderSection,
  className,
}: {
  sections: Section[];
  settings: DesktopLayoutSettings;
  renderSection: (section: Section, index: number) => ReactNode;
  className?: string;
}) {
  const placements = settings.enabled ? resolveDesktopLayout(sections, settings.rowHeight) : null;
  const bottom = placements ? layoutBottom(placements.values()) : 0;

  return (
    <div className={["vc-profile-stack", className].filter(Boolean).join(" ")}>
      {sections.map((section, index) => {
        const content = renderSection(section, index);
        if (section.visible === false) return <FragmentKey key={section.id}>{content}</FragmentKey>;

        const visibility = visibilityClassName(section);
        const placement = placements?.get(section.id);
        if (!placement && !visibility) return <FragmentKey key={section.id}>{content}</FragmentKey>;

        return (
          <div
            key={section.id}
            className={["vc-cell", visibility].filter(Boolean).join(" ")}
            style={placement ? (cellStyleVars(placement, bottom) as CSSProperties) : undefined}
            data-sticky={placement?.sticky ? "" : undefined}
            data-section-id={section.id}
            data-section-type={section.type}
          >
            <div className="vc-cell-inner">{content}</div>
          </div>
        );
      })}
    </div>
  );
}

function FragmentKey({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
