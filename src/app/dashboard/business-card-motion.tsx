"use client";

import type { ReactNode } from "react";
import { motion, useReducedMotion } from "motion/react";

export default function BusinessCardMotion({ children }: { children: ReactNode }) {
  const reduceMotion = useReducedMotion();

  return (
    <motion.article
      className="workspace-card business-card"
      initial={reduceMotion ? false : { opacity: 0, y: 9 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={reduceMotion ? undefined : { y: -2 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.article>
  );
}
