"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import type { ReactNode } from "react";
import type { SectionAnimation, SectionAnimationTrigger } from "@/lib/sections/types";

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

function interactiveTarget(animation: Exclude<SectionAnimation, "none">) {
  switch (animation) {
    case "fade":
      return { opacity: 0.72 };
    case "slide-up":
      return { y: -8 };
    case "slide-down":
      return { y: 8 };
    case "slide-left":
      return { x: -10 };
    case "slide-right":
      return { x: 10 };
    case "zoom":
      return { scale: 1.035 };
    case "float":
      return { y: -8 };
    case "shimmer":
      return { filter: "brightness(1.18)" };
  }
}

export function SectionMotion({
  animation,
  trigger,
  delay,
  children,
}: {
  animation: SectionAnimation;
  trigger: SectionAnimationTrigger;
  delay: number;
  children: ReactNode;
}) {
  const reduced = useReducedMotion();
  if (animation === "none" || reduced) return <>{children}</>;

  const variants = VARIANTS[animation];
  const isLoop = animation === "float" || animation === "shimmer";
  const baseTransition = isLoop
    ? { duration: animation === "float" ? 4 : 2.4, repeat: Infinity, ease: "easeInOut", delay: delay / 1000 }
    : { duration: 0.6, ease: [0.22, 1, 0.36, 1], delay: delay / 1000 };

  if (trigger === "hover" || trigger === "tap") {
    const target = interactiveTarget(animation);
    return (
      <MotionDiv
        initial="visible"
        animate="visible"
        variants={variants}
        whileHover={trigger === "hover" ? target : undefined}
        whileTap={trigger === "tap" ? target : undefined}
        transition={{ duration: 0.22, ease: "easeOut", delay: delay / 1000 }}
      >
        {children}
      </MotionDiv>
    );
  }

  return (
    <MotionDiv
      initial="hidden"
      animate={trigger === "load" ? "visible" : undefined}
      whileInView={trigger === "view" ? "visible" : undefined}
      variants={variants}
      transition={baseTransition}
      viewport={{ once: true, amount: 0.2 }}
    >
      {children}
    </MotionDiv>
  );
}
