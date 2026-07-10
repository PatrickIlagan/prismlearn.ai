import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 188;

const MODELS = [
  {
    name: "gpt-oss-120b",
    provider: "Fireworks AI Serverless",
    role: "Scaffolded tutoring",
    desc: "Multi-turn reasoning, one micro-step at a time — the model that actually teaches Lumi's lessons.",
    tint: COLOR.violet500,
    emoji: "🎓",
    delay: 30,
  },
  {
    name: "Gemma 3 27B",
    provider: "Fireworks AI Serverless",
    role: "Flashcard generation",
    desc: "A short, templated extraction task — the right-sized model for the job, not the biggest one available.",
    tint: COLOR.mint,
    emoji: "🗂️",
    delay: 58,
  },
];

export function S7bModels() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captionOpacity = interpolate(frame, [10, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const connectorOpacity = interpolate(frame, [90, 106], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <div style={{ position: "absolute", left: 100, top: 90 }}>
        <div style={{ opacity: captionOpacity }}>
          <div
            style={{
              fontSize: 22,
              fontWeight: 700,
              letterSpacing: 3,
              textTransform: "uppercase",
              color: COLOR.fuchsia600,
              marginBottom: 8,
            }}
          >
            Multi-Model Architecture
          </div>
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1, color: INK.strong }}>
            The Right Model For The Right Job
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 280,
          display: "grid",
          gridTemplateColumns: "1fr auto 1fr",
          alignItems: "center",
          gap: 24,
        }}
      >
        {MODELS.map((m, i) => {
          const s = spring({ frame: frame - m.delay, fps, config: { damping: 15 }, durationInFrames: 18 });
          return (
            <div
              key={m.name}
              style={{
                gridColumn: i === 0 ? 1 : 3,
                opacity: s,
                transform: `translateY(${(1 - s) * 26}px)`,
              }}
            >
              <GlassCard style={{ padding: 30 }}>
                <div
                  style={{
                    width: 56,
                    height: 56,
                    borderRadius: 16,
                    background: `${m.tint}22`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 28,
                    marginBottom: 16,
                  }}
                >
                  {m.emoji}
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, color: INK.strong }}>{m.name}</div>
                <div style={{ fontSize: 14, fontWeight: 600, color: m.tint, marginTop: 2 }}>{m.provider}</div>
                <div
                  style={{
                    display: "inline-block",
                    marginTop: 12,
                    padding: "5px 12px",
                    borderRadius: 999,
                    background: "rgba(15,23,42,0.05)",
                    fontSize: 13,
                    fontWeight: 700,
                    color: INK.base,
                  }}
                >
                  {m.role}
                </div>
                <div style={{ fontSize: 15, color: INK.muted, marginTop: 12, lineHeight: 1.5 }}>{m.desc}</div>
              </GlassCard>
            </div>
          );
        })}

        <div style={{ gridColumn: 2, opacity: connectorOpacity, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ fontSize: 22, fontWeight: 800, color: INK.faint }}>⇄</div>
        </div>
      </div>
    </Scene>
  );
}
