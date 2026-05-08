import type { CSSProperties } from "react";

const shellStyle: CSSProperties = {
  background: "linear-gradient(180deg, var(--vc-bg, #0a0a0a) 0%, color-mix(in srgb, var(--vc-bg-2, #141414) 72%, var(--vc-bg, #0a0a0a)) 100%)",
  color: "var(--vc-fg, #f7f3ea)",
};

const columnStyle: CSSProperties = {
  width: "100%",
  maxWidth: "min(100%, var(--vc-max-width, 480px))",
  background: "var(--vc-bg, #0a0a0a)",
  color: "var(--vc-fg, #f7f3ea)",
};

const blockStyle: CSSProperties = {
  background: "color-mix(in srgb, var(--vc-bg-2, #141414) 82%, var(--vc-fg, #f7f3ea) 8%)",
  border: "1px solid color-mix(in srgb, var(--vc-accent, #d4af37) 18%, transparent)",
};

function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={["animate-pulse rounded-card", className].join(" ").trim()} style={blockStyle} />;
}

export default function PublicProfileLoading() {
  return (
    <main className="vc-profile-shell home-theme min-h-screen" style={shellStyle} aria-busy="true" aria-label="Loading profile">
      <div className="mx-auto px-4 pb-24 pt-8 sm:px-6 sm:pt-10 vc-profile" style={columnStyle}>
        <div className="vc-profile-stack">
          <header className="flex flex-col items-center text-center">
            <SkeletonBlock className="h-36 w-full" />
            <div className="-mt-12 size-24 animate-pulse rounded-full border-[3px]" style={{ ...blockStyle, background: "var(--vc-bg, #0a0a0a)" }} />
            <SkeletonBlock className="mt-4 h-8 w-44 max-w-[70%]" />
            <div className="mt-3 flex max-w-full flex-wrap justify-center gap-2 px-4">
              <SkeletonBlock className="h-7 w-20 rounded-pill" />
              <SkeletonBlock className="h-7 w-28 rounded-pill" />
            </div>
            <SkeletonBlock className="mt-4 h-4 w-64 max-w-[82%]" />
          </header>

          <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
            <SkeletonBlock className="h-12" />
            <SkeletonBlock className="h-12 w-12" />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <SkeletonBlock className="aspect-square" />
            <SkeletonBlock className="aspect-square" />
            <SkeletonBlock className="aspect-square" />
            <SkeletonBlock className="aspect-square" />
          </div>

          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-14" />
          <SkeletonBlock className="h-28" />
        </div>
      </div>
    </main>
  );
}
