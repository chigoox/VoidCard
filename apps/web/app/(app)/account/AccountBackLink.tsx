"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function AccountBackLink() {
  const pathname = usePathname();
  if (pathname === "/account") return null;

  return (
    <Link
      href="/account"
      className="inline-flex items-center gap-1.5 text-sm text-ivory-dim hover:text-gold transition-colors"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M19 12H5M12 5l-7 7 7 7" />
      </svg>
      You
    </Link>
  );
}
