import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Mascot } from "../Mascot";
import { Wordmark } from "../components";
import { COLOR } from "../theme";

export const DURATION = 45;

export function S1LogoIntro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mascotScale = spring({ frame, fps, config: { damping: 12, stiffness: 140 }, durationInFrames: 22 });
  const wordmarkY = interpolate(frame, [10, 24], [24, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const wordmarkOpacity = interpolate(frame, [10, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [22, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = interpolate(frame, [0, 45], [0, 1], { extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <div
          style={{
            position: "absolute",
            width: 700,
            height: 700,
            borderRadius: "50%",
            background: `radial-gradient(circle, ${COLOR.violet500}55, transparent 65%)`,
            opacity: glow,
            filter: "blur(10px)",
          }}
        />
        <div style={{ transform: `scale(${mascotScale})` }}>
          <Mascot size={220} />
        </div>
        <div style={{ marginTop: 28, opacity: wordmarkOpacity, transform: `translateY(${wordmarkY}px)` }}>
          <Wordmark size={72} />
        </div>
        <div
          style={{
            marginTop: 14,
            fontSize: 30,
            fontWeight: 500,
            color: "rgba(255,255,255,0.7)",
            opacity: taglineOpacity,
          }}
        >
          Learn anything. Faster.
        </div>
      </div>
    </Scene>
  );
}

