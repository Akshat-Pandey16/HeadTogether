import type { Variants } from "motion/react";

export const staggerContainer: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.035, delayChildren: 0.02 } },
};

export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { type: "spring", stiffness: 380, damping: 30 } },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
};
