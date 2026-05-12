"use client";

import { Menu, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useState } from "react";

type MobileNavProps = {
  isLoggedIn: boolean;
};

const NAV_LINKS = [
  { href: "/why-voidcard", label: "Why VoidCard" },
  { href: "/pricing", label: "Pricing" },
  { href: "/shop", label: "Shop" },
  { href: "/customers", label: "Customers" },
];

export function MobileNav({ isLoggedIn }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((v) => !v)}
        className="flex size-11 items-center justify-center rounded-full border border-paper-200 text-ink-500 transition hover:border-ink/20 hover:text-ink active:scale-[0.98]"
      >
        {open ? <X className="size-5" aria-hidden /> : <Menu className="size-5" aria-hidden />}
      </button>

      {open && (
        <div
          id={menuId}
          className="fixed inset-x-0 top-[calc(4rem+env(safe-area-inset-top,0px))] z-50 border-b border-paper-200 bg-white/95 shadow-md backdrop-blur-md"
        >
          <nav className="safe-menu-panel mx-auto max-w-7xl py-4">
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block min-h-11 rounded-lg px-3 py-3 text-sm text-ink-500 hover:bg-paper-50 hover:text-ink"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
              <li className="border-t border-paper-100 pt-3 mt-3">
                {isLoggedIn ? (
                  <Link
                    href="/dashboard"
                    onClick={() => setOpen(false)}
                    className="btn-primary block text-center"
                  >
                    Dashboard
                  </Link>
                ) : (
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/login"
                      onClick={() => setOpen(false)}
                      className="block min-h-11 rounded-lg px-3 py-3 text-sm text-ink-500 hover:bg-paper-50 hover:text-ink"
                    >
                      Sign in
                    </Link>
                    <Link
                      href="/shop"
                      onClick={() => setOpen(false)}
                      className="btn-primary block text-center"
                    >
                      Get your card
                    </Link>
                  </div>
                )}
              </li>
            </ul>
          </nav>
        </div>
      )}
    </div>
  );
}
