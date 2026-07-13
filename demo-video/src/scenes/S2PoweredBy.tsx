import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 125; // 8 beats @ 115bpm

const MODELS = [
  {
    emoji: "🎓",
    name: "gpt-oss-120b",
    role: "AI Tutoring",
    infra: "Fireworks AI Serverless",
    tint: COLOR.violet500,
    delay: 22,
  },
  {
    emoji: "🗂️",
    name: "Gemma 3 27B",
    role: "Flashcard Generation",
    infra: "Fireworks AI Serverless",
    tint: COLOR.mint,
    delay: 42,
  },
  {
    emoji: "🏢",
    name: "Gemma 4",
    role: "Enterprise Deployments",
    infra: "AMD Instinct™ GPUs",
    tint: "#ED1C24",
    delay: 62,
  },
];

export function S2PoweredBy() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const footerOpacity = interpolate(frame, [92, 108], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          gap: 40,
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

        <div style={{ display: "flex", gap: 26 }}>
          {MODELS.map((m) => {
            const s = spring({ frame: frame - m.delay, fps, config: { damping: 14 }, durationInFrames: 18 });
            return (
              <div key={m.name} style={{ opacity: s, transform: `translateY(${(1 - s) * 24}px)` }}>
                <GlassCard style={{ width: 380, padding: 28, textAlign: "center" }}>
                  <div
                    style={{
                      width: 62,
                      height: 62,
                      borderRadius: 18,
                      background: `${m.tint}1f`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 30,
                      margin: "0 auto 14px",
                    }}
                  >
                    {m.emoji}
                  </div>
                  <div style={{ fontSize: 27, fontWeight: 800, color: INK.strong }}>{m.name}</div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: m.tint, marginTop: 6 }}>{m.role}</div>
                  <div style={{ fontSize: 15, color: INK.muted, marginTop: 4 }}>{m.infra}</div>
                </GlassCard>
              </div>
            );
          })}
        </div>

        <div style={{ fontSize: 22, fontWeight: 600, color: INK.base, opacity: footerOpacity }}>
          The right model for the right job — three models, one architecture.
        </div>
      </div>
    </Scene>
  );
}
