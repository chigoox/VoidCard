import Link from "next/link";
import { requireAdmin } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const u = await requireAdmin();
  const tabs = [
    { href: "/admin", label: "Overview" },
    { href: "/admin/products", label: "Products" },
    { href: "/admin/plans", label: "Plans" },
    { href: "/admin/orders", label: "Orders" },
    { href: "/admin/subscriptions", label: "Subscriptions" },
    { href: "/admin/users", label: "Users" },
    { href: "/admin/verifications", label: "Verifications" },
    { href: "/admin/cards", label: "Cards" },
    { href: "/admin/shortlinks", label: "Shortlinks" },
    { href: "/admin/flags", label: "Flags" },
    { href: "/admin/audit", label: "Audit" },
    { href: "/admin/dsr", label: "DSR" },
    { href: "/admin/csp", label: "CSP" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="home-theme min-h-screen bg-onyx-grad">
      <header className="border-b border-onyx-700/60 bg-onyx-950/70 pt-[env(safe-area-inset-top)] backdrop-blur-md">
        <div className="safe-menu-panel mx-auto flex min-h-16 max-w-7xl flex-wrap items-center justify-between gap-3 py-3 sm:h-16 sm:flex-nowrap sm:py-0">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="font-display text-lg text-gold-grad">VoidCard</Link>
            <span className="rounded-pill bg-gold-grad px-2.5 py-0.5 text-xs font-semibold text-onyx-950">
              ADMIN
            </span>
          </div>
          <span className="max-w-[48vw] truncate text-xs text-ivory-mute sm:max-w-none">{u.email}</span>
        </div>
        <nav className="safe-menu-panel mx-auto flex max-w-7xl gap-2 overflow-x-auto pb-3 text-sm">
          {tabs.map((t) => (
            <Link
              key={t.href}
              href={t.href}
              className="rounded-pill border border-onyx-700/60 px-3 py-1.5 text-ivory-dim hover:border-gold/50 hover:text-ivory"
            >
              {t.label}
            </Link>
          ))}
        </nav>
      </header>

      <main className="safe-menu-panel safe-bottom-panel mx-auto max-w-7xl py-8">{children}</main>
    </div>
  );
}
