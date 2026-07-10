import { AbsoluteFill } from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { FONT_STACK, GRADIENT_BG, INK } from "./theme";

/** Plain hard-cut scene wrapper (background + font only). Scenes previously
 *  self-faded in/out via opacity, but since Remotion unmounts each Sequence
 *  outside its own frame range (no overlap), the outgoing and incoming scene
 *  were never actually on screen at the same time — both just independently
 *  dipped to near-zero opacity right at the cut, which read as a flash/
 *  flicker to the background color rather than a smooth crossfade. A clean
 *  hard cut looks better here anyway for a fast-paced promo. Per-element
 *  entrances inside each scene (spring/slide-ins) still provide the motion. */
export function Scene({
  children,
  background = true,
  style,
}: {
  children: ReactNode;
  durationInFrames: number;
  background?: boolean;
  style?: CSSProperties;
}) {
  return (
    <AbsoluteFill
      style={{
        background: background ? GRADIENT_BG : undefined,
        fontFamily: FONT_STACK,
        color: INK.strong,
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
