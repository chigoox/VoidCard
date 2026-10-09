"use client";

import { useEffect, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls } from "framer-motion";
import { X } from "lucide-react";

export function BottomSheet({
  open,
  onClose,
  title,
  eyebrow,
  children,
  footer,
  testId,
  doneLabel = "Done",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  eyebrow?: string;
  children: ReactNode;
  footer?: ReactNode;
  testId?: string;
  doneLabel?: string;
}) {
  const [portalTarget, setPortalTarget] = useState<HTMLElement | null>(null);
  const dragControls = useDragControls();
  useEffect(() => {
    // Portal target resolves after mount so SSR markup stays stable.
    const frame = requestAnimationFrame(() => setPortalTarget(document.body));
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!portalTarget) return null;

  return <>{createPortal(
    <AnimatePresence>
      {open ? (
        <div className="fixed inset-0 z-[110]" data-testid={testId}>
          <motion.button
            type="button"
            aria-label="Close"
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label={title}
            className="absolute inset-x-0 bottom-0 flex max-h-[88dvh] flex-col rounded-t-[26px] border-t border-onyx-700 bg-onyx-950 text-ivory shadow-[0_-30px_80px_-20px_rgba(0,0,0,0.8)]"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 32, stiffness: 340 }}
            drag="y"
            dragListener={false}
            dragControls={dragControls}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.6 }}
            onDragEnd={(_, info) => {
              if (info.offset.y > 120 || info.velocity.y > 600) onClose();
            }}
          >
            {/* Only the grabber + title bar start a swipe-to-close, so scrolling and inputs inside never fight it. */}
            <div className="shrink-0 touch-none" onPointerDown={(event) => dragControls.start(event)}>
            <div className="flex cursor-grab justify-center pt-2.5" aria-hidden>
              <span className="h-1.5 w-10 rounded-full bg-onyx-600" />
            </div>
            <div className="flex items-start justify-between gap-3 px-5 pb-3 pt-2">
              <div className="min-w-0">
                {eyebrow ? <p className="text-[10px] uppercase tracking-[0.25em] text-gold/80">{eyebrow}</p> : null}
                <p className="truncate font-display text-xl">{title}</p>
              </div>
              <button type="button" onClick={onClose} className="btn-gold shrink-0 px-4 py-2 text-sm" data-testid="sheet-done">
                {doneLabel}
              </button>
            </div>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-4">
              {children}
            </div>
            {footer ? (
              <div className="shrink-0 border-t border-onyx-800 px-3 pt-2" style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}>
                {footer}
              </div>
            ) : (
              <div style={{ height: "env(safe-area-inset-bottom)" }} />
            )}
            <button type="button" onClick={onClose} className="sr-only">
              <X aria-hidden /> Close
            </button>
          </motion.div>
        </div>
      ) : null}
    </AnimatePresence>,
    portalTarget,
  )}</>;
}
