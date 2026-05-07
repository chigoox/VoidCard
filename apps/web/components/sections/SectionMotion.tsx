"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import type { SectionAnimation } from "@/lib/sections/types";

const VARIANTS: Record<Exclude<SectionAnimation, "none">, Variants> = {
  fade: {
    hidden: { opacity: 0 },
    visible: { opacity: 1 },
  },
  "slide-up": {
    hidden: { opacity: 0, y: 16 },
    visible: { opacity: 1, y: 0 },
  },
  "slide-down": {
    hidden: { opacity: 0, y: -16 },
    visible: { opacity: 1, y: 0 },
  },
  "slide-left": {
    hidden: { opacity: 0, x: 24 },
    visible: { opacity: 1, x: 0 },
  },
  "slide-right": {
    hidden: { opacity: 0, x: -24 },
    visible: { opacity: 1, x: 0 },
  },
  zoom: {
    hidden: { opacity: 0, scale: 0.92 },
    visible: { opacity: 1, scale: 1 },
  },
  float: {
    hidden: { y: 0 },
    visible: { y: [0, -6, 0] },
  },
  shimmer: {
    hidden: { filter: "brightness(1)" },
    visible: { filter: ["brightness(1)", "brightness(1.18)", "brightness(1)"] },
  },
};

// framer-motion 11 has a TypeScript clash with React 19's stricter ReactNode.
// Cast through a typed alias to avoid friction without losing motion props.
type MotionDivProps = Omit<React.ComponentProps<typeof motion.div>, "children"> & {
  children?: ReactNode;
};
const MotionDiv = motion.div as unknown as React.FC<MotionDivProps>;

export function SectionMotion({
  animation,
  delay,
  children,
}: {
  animation: SectionAnimation;
  delay: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  if (animation === "none" || reduced) return <>{children}</>;

  const variants = VARIANTS[animation];
  const isLoop = animation === "float" || animation === "shimmer";

  return (
    <MotionDiv
      initial="hidden"
      animate="visible"
      variants={variants}
      transition={
        isLoop
          ? { duration: animation === "float" ? 4 : 2.4, repeat: Infinity, ease: "easeInOut", delay: delay / 1000 }
          : { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: delay / 1000 }
      }
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </MotionDiv>
  );
}
