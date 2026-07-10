import { AbsoluteFill, interpolate, useCurrentFrame } from "remotion";
import type { CSSProperties, ReactNode } from "react";
import { FONT_STACK, GRADIENT_BG } from "./theme";

/** Every scene gets a free crossfade in/out (8 frames each) so cuts never
 *  hard-pop — matches the "smooth animations everywhere" pass done on the
 *  live app itself. */
export function Scene({
  children,
  durationInFrames,
  background = true,
  style,
}: {
  children: ReactNode;
  durationInFrames: number;
  background?: boolean;
  style?: CSSProperties;
}) {
  const frame = useCurrentFrame();
  const opacity = interpolate(
    frame,
    [0, 8, durationInFrames - 8, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" },
  );
  return (
    <AbsoluteFill
      style={{
        opacity,
        background: background ? GRADIENT_BG : undefined,
        fontFamily: FONT_STACK,
        color: "white",
        ...style,
      }}
    >
      {children}
    </AbsoluteFill>
  );
}
