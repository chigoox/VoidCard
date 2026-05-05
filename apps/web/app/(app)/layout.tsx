import Link from "next/link";
import { requireUser } from "@/lib/auth";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const tabs = [
    { href: "/dashboard", label: "Home", testid: "tab-home" },
    { href: "/edit", label: "Edit", testid: "tab-edit" },
    { href: "/links", label: "Links", testid: "tab-links" },
    { href: "/insights", label: "Insights", testid: "tab-insights" },
    { href: "/account", label: "You", testid: "tab-account" },
  ];

  return (
    <div className="min-h-screen bg-onyx-grad pb-24">
      <header className="sticky top-0 z-30 border-b border-onyx-700/60 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between px-4">
          <Link href="/dashboard" className="font-display text-lg text-gold-grad">VoidCard</Link>
          <div className="flex items-center gap-3">
            <Link href="/account/notifications" className="text-ivory-dim hover:text-gold" aria-label="Notifications">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6">
                <path d="M6 8a6 6 0 1 1 12 0c0 7 3 7 3 9H3c0-2 3-2 3-9Z" />
                <path d="M9 21a3 3 0 0 0 6 0" />
              </svg>
            </Link>
            <span data-testid="user-handle" className="text-sm text-ivory-dim">@{user.username ?? "you"}</span>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6">{children}</main>

      {/* Bottom tab bar (mobile-first per mockups) */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 border-t border-onyx-700/60 bg-onyx-950/95 backdrop-blur-md"
           style={{ paddingBottom: "var(--safe-bottom)" }}>
        <ul className="mx-auto flex max-w-md justify-around py-2">
          {tabs.map((t) => (
            <li key={t.href}>
              <Link href={t.href} data-testid={t.testid}
                    className="px-4 py-2 text-xs uppercase tracking-widest text-ivory-dim hover:text-gold">
                {t.label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}
