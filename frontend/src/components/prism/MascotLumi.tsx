"use client";

import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface MascotLumiProps {
  size?: number;
  /** When true (TTS speaking), Lumi pulses and rotates in sync. */
  speaking?: boolean;
  className?: string;
}

/** The 3D prism mascot — pure CSS/SVG, animated with Framer Motion. */
export function MascotLumi({ size = 44, speaking = false, className }: MascotLumiProps) {
  return (
    <motion.div
      className={cn("relative", className)}
      style={{ width: size, height: size }}
      animate={
        speaking
          ? { rotate: [0, 8, -8, 0], scale: [1, 1.08, 1] }
          : { rotate: 0, scale: 1, y: [0, -3, 0] }
      }
      transition={
        speaking
          ? { duration: 1.4, repeat: Infinity, ease: "easeInOut" }
          : { duration: 3, repeat: Infinity, ease: "easeInOut" }
      }
    >
      <svg viewBox="0 0 100 100" width={size} height={size} aria-label="Lumi mascot">
        <defs>
          <linearGradient id="lumi-face-a" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#A78BFA" />
            <stop offset="100%" stopColor="#7C3AED" />
          </linearGradient>
          <linearGradient id="lumi-face-b" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#C4B5FD" />
            <stop offset="100%" stopColor="#8B5CF6" />
          </linearGradient>
          <linearGradient id="lumi-face-c" x1="0" y1="1" x2="1" y2="0">
            <stop offset="0%" stopColor="#DDD6FE" />
            <stop offset="100%" stopColor="#A78BFA" />
          </linearGradient>
        </defs>
        {/* three faces of a prism to give a faceted 3D feel */}
        <polygon points="50,8 88,72 50,58" fill="url(#lumi-face-a)" />
        <polygon points="50,8 50,58 12,72" fill="url(#lumi-face-b)" />
        <polygon points="12,72 50,58 88,72 50,92" fill="url(#lumi-face-c)" />
        {/* eyes */}
        <circle cx="42" cy="52" r="3.2" fill="#312E81" />
        <circle cx="60" cy="52" r="3.2" fill="#312E81" />
      </svg>
    </motion.div>
  );
}
