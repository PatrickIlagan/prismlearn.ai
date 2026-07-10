import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 188;

const WORKSPACES = [
  { title: "Cell Biology", emoji: "🧬", tint: COLOR.rose, pct: 72 },
  { title: "Algebra I", emoji: "📐", tint: COLOR.violet500, pct: 45 },
  { title: "World War II", emoji: "🌍", tint: COLOR.sky, pct: 90 },
  { title: "Python Basics", emoji: "💻", tint: COLOR.mint, pct: 30 },
  { title: "Macroeconomics", emoji: "📈", tint: COLOR.amber, pct: 60 },
  { title: "Psychology 101", emoji: "🧠", tint: COLOR.fuchsia500, pct: 55 },
];

export function S9Dashboard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captionOpacity = interpolate(frame, [115, 130], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <div
        style={{
          position: "absolute",
          left: 150,
          right: 150,
          top: 130,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 26,
        }}
      >
        {WORKSPACES.map((w, i) => {
          const delay = 8 + i * 14;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16 }, durationInFrames: 16 });
          return (
            <div
              key={w.title}
              style={{
                opacity: s,
                transform: `translateY(${(1 - s) * 24}px)`,
              }}
            >
              <GlassCard style={{ padding: 26 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 16,
                      background: `${w.tint}33`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 26,
                    }}
                  >
                    {w.emoji}
                  </div>
                  <svg width="44" height="44" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(15,23,42,0.1)" strokeWidth="5" />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke={w.tint}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={2 * Math.PI * 18}
                      strokeDashoffset={2 * Math.PI * 18 * (1 - w.pct / 100)}
                      transform="rotate(-90 22 22)"
                    />
                  </svg>
                </div>
                <div style={{ fontSize: 24, fontWeight: 800, marginTop: 16 }}>{w.title}</div>
                <div style={{ fontSize: 16, color: INK.muted, marginTop: 4 }}>
                  {w.pct}% mastered
                </div>
              </GlassCard>
            </div>
          );
        })}
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Dashboard" title="Every Subject. One Place." />
      </div>
    </Scene>
  );
}

