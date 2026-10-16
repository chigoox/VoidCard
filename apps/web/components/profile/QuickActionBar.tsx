"use client";

import { useEffect, useState } from "react";
import { CalendarCheck, Download, Phone, ShoppingBag } from "lucide-react";

export type QuickAction =
  | { kind: "book" | "shop"; label: string; sectionId: string }
  | { kind: "call"; label: string; href: string }
  | { kind: "save"; label: string; href: string };

const ICONS = { book: CalendarCheck, shop: ShoppingBag, call: Phone, save: Download } as const;

/**
 * Phone-only bar pinned to the bottom of a public profile once the visitor
 * scrolls past the header, so Book / Shop / Call / Save are always one tap away.
 */
export function QuickActionBar({ actions }: { actions: QuickAction[] }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 360);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  if (actions.length === 0) return null;

  return (
    <nav
      aria-label="Quick actions"
      data-testid="profile-quick-actions"
      className={[
        "fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+12px)] z-40 mx-auto flex max-w-md gap-1.5 rounded-full border p-1.5 backdrop-blur-xl transition duration-300 md:hidden",
        visible ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-24 opacity-0",
      ].join(" ")}
      style={{
        background: "color-mix(in srgb, var(--vc-bg, #0a0a0a) 95%, transparent)",
        borderColor: "color-mix(in srgb, var(--vc-accent, #d4af37) 28%, transparent)",
        boxShadow: "0 18px 40px -20px rgba(0,0,0,0.6)",
      }}
    >
      {actions.map((action, index) => {
        const Icon = ICONS[action.kind];
        const primary = index === 0;
        const style = primary
          ? { background: "var(--vc-accent, #d4af37)", color: "var(--vc-bg, #0a0a0a)" }
          : { color: "var(--vc-fg, #f7f3ea)" };
        const className = "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-full px-3 text-sm font-semibold transition active:scale-[0.98]";
        const content = (
          <>
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="truncate">{action.label}</span>
          </>
        );
        if ("sectionId" in action) {
          return (
            <button
              key={action.kind}
              type="button"
              className={className}
              style={style}
              onClick={() => {
                // Grid cells carry the section id; plain stacks only the type.
                const target =
                  document.querySelector(`[data-section-id="${CSS.escape(action.sectionId)}"]`) ??
                  document.querySelector(`[data-section-type="${action.kind === "book" ? "booking" : "store"}"]`);
                target?.scrollIntoView({ behavior: "smooth", block: "start" });
              }}
            >
              {content}
            </button>
          );
        }
        return (
          <a key={action.kind} href={action.href} className={className} style={style}>
            {content}
          </a>
        );
      })}
    </nav>
  );
}
