import { interpolate, useCurrentFrame } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR } from "../theme";

export const DURATION = 135;

export function S5Adaptive() {
  const frame = useCurrentFrame();
  const captionOpacity = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Fog-of-war chapter unlocking.
  const blur = interpolate(frame, [20, 55], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lockOpacity = interpolate(frame, [20, 45], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Reading-level slider sliding Academic -> ELI5.
  const sliderT = interpolate(frame, [25, 105], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const levels = ["Academic", "Standard", "ELI5"];
  const levelIdx = Math.min(2, Math.floor(sliderT * 3));

  return (
    <Scene durationInFrames={DURATION}>
      <div
        style={{
          position: "absolute",
          left: 160,
          top: 130,
          right: 160,
          display: "flex",
          gap: 40,
        }}
      >
        <GlassCard style={{ flex: 1, padding: 34 }}>
          <div style={{ fontSize: 24, fontWeight: 800, marginBottom: 14 }}>Chapter 3 — Mitosis</div>
          <div
            style={{
              fontSize: 20,
              lineHeight: 1.6,
              color: "rgba(255,255,255,0.85)",
              filter: `blur(${blur}px)`,
            }}
          >
            Mitosis is the stage of the cell cycle in which duplicated chromosomes are separated into two
            identical nuclei, producing two genetically identical daughter cells.
          </div>
        </GlassCard>

        <div
          style={{
            position: "absolute",
            left: "50%",
            top: "50%",
            transform: "translate(-50%,-50%)",
            opacity: lockOpacity,
            fontSize: 90,
          }}
        >
          🔒
        </div>
      </div>

      <div style={{ position: "absolute", left: 160, right: 160, top: 480 }}>
        <GlassCard style={{ padding: "26px 40px" }}>
          <div style={{ fontSize: 20, color: "rgba(255,255,255,0.6)", marginBottom: 14 }}>Reading level</div>
          <div style={{ position: "relative", height: 10, borderRadius: 999, background: "rgba(255,255,255,0.15)" }}>
            <div
              style={{
                position: "absolute",
                left: `${sliderT * 100}%`,
                top: -10,
                transform: "translateX(-50%)",
                width: 30,
                height: 30,
                borderRadius: "50%",
                background: `linear-gradient(135deg, ${COLOR.violet500}, ${COLOR.fuchsia500})`,
                boxShadow: `0 0 24px ${COLOR.fuchsia500}88`,
              }}
            />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 16, fontSize: 22, fontWeight: 700 }}>
            {levels.map((l, i) => (
              <span key={l} style={{ color: i === levelIdx ? COLOR.fuchsia500 : "rgba(255,255,255,0.4)" }}>
                {l}
              </span>
            ))}
          </div>
        </GlassCard>
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Active Learning Canvas" title="Adapts To How You Read" />
      </div>
    </Scene>
  );
}

