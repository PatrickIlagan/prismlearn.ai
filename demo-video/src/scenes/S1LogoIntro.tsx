import { Easing, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Mascot } from "../Mascot";
import { Wordmark } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 110;

export function S1LogoIntro() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mascotScale = spring({ frame, fps, config: { damping: 13, stiffness: 130 }, durationInFrames: 24 });
  const wordmarkY = interpolate(frame, [16, 34], [24, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.cubic),
  });
  const wordmarkOpacity = interpolate(frame, [16, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [38, 54], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glow = interpolate(frame, [0, DURATION], [0, 1], {
    extrapolateRight: "clamp",
    easing: Easing.out(Easing.quad),
  });

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
            background: `radial-gradient(circle, ${COLOR.violet500}3a, transparent 65%)`,
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
            color: INK.muted,
            opacity: taglineOpacity,
          }}
        >
          Learn anything. Faster.
        </div>
      </div>
    </Scene>
  );
}
