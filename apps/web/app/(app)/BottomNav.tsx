"use client";

import { BarChart3, CreditCard, Home, PencilLine, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  {
    href: "/dashboard",
    label: "Home",
    testid: "tab-home",
    icon: Home,
  },
  {
    href: "/edit",
    label: "Edit",
    testid: "tab-edit",
    icon: PencilLine,
  },
  {
    href: "/cards",
    label: "Cards",
    testid: "tab-cards",
    icon: CreditCard,
  },
  {
    href: "/insights",
    label: "Insights",
    testid: "tab-insights",
    icon: BarChart3,
  },
  {
    href: "/account",
    label: "You",
    testid: "tab-account",
    icon: UserRound,
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-onyx-700/60 bg-onyx-950/95 backdrop-blur-md"
      style={{ paddingBottom: "max(var(--safe-bottom), 0px)" }}
    >
      <ul className="mx-auto grid max-w-md grid-cols-5 px-1 py-1">
        {tabs.map((t) => {
          const active = pathname === t.href || pathname.startsWith(t.href + "/");
          const Icon = t.icon;
          return (
            <li key={t.href}>
              <Link
                href={t.href}
                data-testid={t.testid}
                aria-current={active ? "page" : undefined}
                className={[
                  "flex min-h-14 flex-col items-center justify-center gap-0.5 rounded-card px-1 py-2 text-[10px] uppercase tracking-[0.14em] transition-colors active:scale-[0.98]",
                  active ? "text-gold" : "text-ivory-dim hover:text-ivory",
                ].join(" ")}
              >
                <Icon className="size-5" strokeWidth={active ? 2.2 : 1.6} aria-hidden />
                {t.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
