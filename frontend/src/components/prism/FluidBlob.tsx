"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * A soft, organically-morphing blob — continuous position/scale/shape drift,
 * plus an optional slow hue-rotate so its color gently cycles within the
 * violet/fuchsia/cyan prism palette rather than sitting static. Shared by the
 * landing page and the auth card so both get the same "fluid glass" motion.
 */
export function FluidBlob({
  className,
  duration = 16,
  delay = 0,
  hueShift = false,
}: {
  className: string;
  duration?: number;
  delay?: number;
  /** Cycles filter: hue-rotate a few degrees either side of 0 — a gentle
   *  color drift that stays within the theme rather than a full rainbow. */
  hueShift?: boolean;
}) {
  return (
    <motion.div
      className={cn("prism-orb -z-10", className)}
      animate={{
        x: [0, 36, -26, 14, 0],
        y: [0, -28, 20, -12, 0],
        scale: [1, 1.14, 0.92, 1.06, 1],
        borderRadius: [
          "42% 58% 65% 35% / 45% 40% 60% 55%",
          "60% 40% 30% 70% / 55% 65% 35% 45%",
          "35% 65% 55% 45% / 40% 55% 45% 60%",
          "42% 58% 65% 35% / 45% 40% 60% 55%",
        ],
        ...(hueShift ? { filter: ["hue-rotate(0deg)", "hue-rotate(18deg)", "hue-rotate(-12deg)", "hue-rotate(0deg)"] } : {}),
      }}
      transition={{ duration, repeat: Infinity, ease: "easeInOut", delay }}
    />
  );
}
