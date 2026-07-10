import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Pill } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 125;

export function S2PoweredBy() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fireworksScale = spring({ frame: frame - 18, fps, config: { damping: 14 }, durationInFrames: 20 });
  const amdScale = spring({ frame: frame - 40, fps, config: { damping: 14 }, durationInFrames: 20 });
  const pulse = 1 + Math.sin(frame / 8) * 0.02;

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
          gap: 42,
        }}
      >
        <div
          style={{
            fontSize: 24,
            fontWeight: 700,
            letterSpacing: 4,
            textTransform: "uppercase",
            color: INK.muted,
            opacity: headerOpacity,
          }}
        >
          Built for the AMD × Fireworks AI Hackathon
        </div>
        <div style={{ display: "flex", gap: 28 }}>
          <div style={{ transform: `scale(${fireworksScale * pulse})` }}>
            <Pill tint={COLOR.amber}>🔥&nbsp; Fireworks AI — gpt-oss-120b</Pill>
          </div>
          <div style={{ transform: `scale(${amdScale * pulse})` }}>
            <Pill tint="#ED1C24">⚙️&nbsp; Running on AMD Infrastructure</Pill>
          </div>
        </div>
      </div>
    </Scene>
  );
}

