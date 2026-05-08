"use client";

import Link from "next/link";
import { useState } from "react";

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

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? "Close menu" : "Open menu"}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="flex size-10 items-center justify-center rounded-full border border-paper-200 text-ink-500 hover:border-ink/20 hover:text-ink"
      >
        {open ? (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="4" y1="8" x2="20" y2="8" />
            <line x1="4" y1="16" x2="20" y2="16" />
          </svg>
        )}
      </button>

      {open && (
        <div className="absolute inset-x-0 top-full z-50 border-b border-paper-200 bg-white/95 shadow-md backdrop-blur-md">
          <nav className="safe-menu-panel mx-auto max-w-7xl py-4">
            <ul className="space-y-1">
              {NAV_LINKS.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    onClick={() => setOpen(false)}
                    className="block rounded-lg px-3 py-3 text-sm text-ink-500 hover:bg-paper-50 hover:text-ink"
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
                      className="block rounded-lg px-3 py-3 text-sm text-ink-500 hover:bg-paper-50 hover:text-ink"
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
