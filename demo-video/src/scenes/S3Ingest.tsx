import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR } from "../theme";

export const DURATION = 150;

const SOURCES = [
  { label: "PDF", emoji: "📄", tint: COLOR.rose, angle: -135 },
  { label: "Slides", emoji: "📊", tint: COLOR.amber, angle: -45 },
  { label: "YouTube", emoji: "▶️", tint: COLOR.sky, angle: 135 },
  { label: "Website", emoji: "🌐", tint: COLOR.mint, angle: 45 },
];

export function S3Ingest() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const centerScale = spring({ frame: frame - 75, fps, config: { damping: 11 }, durationInFrames: 20 });
  const captionOpacity = interpolate(frame, [95, 112], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <div style={{ position: "absolute", inset: 0 }}>
        {SOURCES.map((s, i) => {
          const delay = i * 12;
          const t = interpolate(frame, [delay, delay + 55], [0, 1], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const startR = 460;
          const endR = 0;
          const r = startR + (endR - startR) * t;
          const rad = (s.angle * Math.PI) / 180;
          const x = 960 + r * Math.cos(rad);
          const y = 470 + r * Math.sin(rad);
          // Fade in fast, hold at full opacity while traveling, fade out only
          // right as it reaches (merges into) the center card.
          const opacity = interpolate(frame, [delay, delay + 8, delay + 46, delay + 55], [0, 1, 1, 0], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          return (
            <div
              key={s.label}
              style={{
                position: "absolute",
                left: x - 70,
                top: y - 70,
                opacity,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 8,
              }}
            >
              <div
                style={{
                  width: 140,
                  height: 140,
                  borderRadius: 32,
                  background: `${s.tint}26`,
                  border: `2px solid ${s.tint}99`,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 56,
                }}
              >
                {s.emoji}
              </div>
              <div style={{ fontSize: 22, fontWeight: 700, color: s.tint }}>{s.label}</div>
            </div>
          );
        })}

        <div
          style={{
            position: "absolute",
            left: 960,
            top: 470,
            transform: `translate(-50%, -50%) scale(${centerScale})`,
          }}
        >
          <GlassCard style={{ width: 340, padding: 36, textAlign: "center" }}>
            <div style={{ fontSize: 48, marginBottom: 10 }}>✨</div>
            <div style={{ fontSize: 30, fontWeight: 800 }}>Master Reviewer</div>
            <div style={{ fontSize: 20, color: "rgba(255,255,255,0.6)", marginTop: 6 }}>
              Structured study guide
            </div>
          </GlassCard>
        </div>
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Ingestion" title="Any Source → One Study Guide" />
      </div>
    </Scene>
  );
}

