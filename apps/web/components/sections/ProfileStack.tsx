import type { CSSProperties, ReactNode } from "react";
import type { Section } from "@/lib/sections/types";
import {
  cellStyleVars,
  hasTileStyle,
  layoutBottom,
  resolveDesktopLayout,
  resolveTabletLayout,
  tileStyleVars,
  tileTextMode,
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
  const tabletPlacements = settings.enabled ? resolveTabletLayout(sections, settings.rowHeight) : null;
  const tabletBottom = tabletPlacements ? layoutBottom(tabletPlacements.values()) : 0;

  return (
    <div className={["vc-profile-stack", className].filter(Boolean).join(" ")}>
      {sections.map((section, index) => {
        const content = renderSection(section, index);
        if (section.visible === false) return <FragmentKey key={section.id}>{content}</FragmentKey>;

        const visibility = visibilityClassName(section);
        const placement = placements?.get(section.id);
        const tabletPlacement = tabletPlacements?.get(section.id);
        const tile = section.layout?.tile;
        const tiled = hasTileStyle(tile);
        if (!placement && !visibility && !tiled) return <FragmentKey key={section.id}>{content}</FragmentKey>;

        const style = {
          ...(placement
            ? cellStyleVars(placement, bottom, tabletPlacement ? { placement: tabletPlacement, bottom: tabletBottom } : undefined)
            : {}),
          ...tileStyleVars(tile),
        } as CSSProperties;

        return (
          <div
            key={section.id}
            className={["vc-cell", visibility].filter(Boolean).join(" ")}
            style={style}
            data-tile={tiled ? "" : undefined}
            data-tile-text={tileTextMode(tile)}
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

/** Applies a section's tile background outside the grid (editor previews). */
export function TileWrap({ section, children }: { section: Section; children: ReactNode }) {
  const tile = section.layout?.tile;
  if (!hasTileStyle(tile)) return <>{children}</>;
  return (
    <div className="vc-cell" data-tile="" data-tile-text={tileTextMode(tile)} style={tileStyleVars(tile) as CSSProperties}>
      <div className="vc-cell-inner">{children}</div>
    </div>
  );
}
