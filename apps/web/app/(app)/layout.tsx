import Link from "next/link";
import { requireUser } from "@/lib/auth";
import { BottomNav } from "./BottomNav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();

  return (
    <div className="home-theme min-h-screen bg-onyx-grad pb-24">
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

      <BottomNav />
    </div>
  );
}
