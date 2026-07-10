import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Pill } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 125;

const PARTICLES = [
  { x: -260, y: -70, size: 7, tint: COLOR.violet500, delay: 4 },
  { x: 240, y: -110, size: 5, tint: COLOR.fuchsia500, delay: 14 },
  { x: -180, y: 90, size: 6, tint: COLOR.amber, delay: 24 },
  { x: 300, y: 60, size: 5, tint: COLOR.sky, delay: 8 },
  { x: -320, y: 20, size: 4, tint: COLOR.mint, delay: 30 },
  { x: 100, y: -140, size: 5, tint: "#ED1C24", delay: 18 },
];

export function S2PoweredBy() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const fireworksScale = spring({ frame: frame - 18, fps, config: { damping: 14 }, durationInFrames: 20 });
  const amdScale = spring({ frame: frame - 40, fps, config: { damping: 14 }, durationInFrames: 20 });
  const pulse = 1 + Math.sin(frame / 8) * 0.02;

  return (
    <Scene durationInFrames={DURATION}>
      {/* floating decorative sparks — subtle "compute" ambience behind the badges */}
      <div style={{ position: "absolute", left: "50%", top: "50%" }}>
        {PARTICLES.map((p, i) => {
          const t = interpolate(frame, [p.delay, p.delay + 60], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const drift = Math.sin((frame + i * 40) / 30) * 10;
          const opacity = interpolate(frame, [p.delay, p.delay + 20, DURATION - 20, DURATION], [0, 0.55, 0.55, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={i}
              style={{
                position: "absolute",
                left: p.x + drift,
                top: p.y - t * 14,
                width: p.size,
                height: p.size,
                borderRadius: "50%",
                background: p.tint,
                opacity,
                boxShadow: `0 0 12px ${p.tint}`,
              }}
            />
          );
        })}
      </div>

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
            <Pill tint={COLOR.amber}>🔥&nbsp; Fireworks AI Serverless — gpt-oss-120b</Pill>
          </div>
          <div style={{ transform: `scale(${amdScale * pulse})` }}>
            <Pill tint="#ED1C24">⚙️&nbsp; AMD Instinct™ GPUs</Pill>
          </div>
        </div>
      </div>
    </Scene>
  );
}
