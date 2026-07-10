import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 125; // 8 beats @ 115bpm

/** Mirrors the real WorkspaceCard: gradient source-type icon tile top-left,
 *  progress ring top-right, title + "PDF · N concepts · N% mastered" meta,
 *  and an outline "Resume Learning" button pinned to the bottom. */
const WORKSPACES = [
  { title: "Cell Biology", emoji: "📄", kind: "PDF", tint: COLOR.rose, concepts: 6, pct: 72 },
  { title: "Algebra I", emoji: "📄", kind: "PDF", tint: COLOR.violet500, concepts: 6, pct: 45 },
  { title: "Our Solar System", emoji: "📊", kind: "Slides", tint: COLOR.amber, concepts: 7, pct: 90 },
  { title: "Python Basics", emoji: "📄", kind: "PDF", tint: COLOR.mint, concepts: 5, pct: 30 },
  { title: "Macroeconomics", emoji: "🌐", kind: "Article", tint: COLOR.sky, concepts: 6, pct: 60 },
  { title: "Psychology 101", emoji: "▶️", kind: "Video", tint: COLOR.fuchsia500, concepts: 5, pct: 55 },
];

export function S9Dashboard() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captionOpacity = interpolate(frame, [72, 88], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <div
        style={{
          position: "absolute",
          left: 150,
          right: 150,
          top: 120,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 24,
        }}
      >
        {WORKSPACES.map((w, i) => {
          const delay = 4 + i * 5;
          const s = spring({ frame: frame - delay, fps, config: { damping: 16 }, durationInFrames: 14 });
          const ringPct = interpolate(frame, [delay + 6, delay + 32], [0, w.pct], {
            extrapolateLeft: "clamp",
            extrapolateRight: "clamp",
          });
          const C = 2 * Math.PI * 18;
          return (
            <div key={w.title} style={{ opacity: s, transform: `translateY(${(1 - s) * 22}px)` }}>
              <GlassCard style={{ padding: 24, borderRadius: 22 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div
                    style={{
                      width: 52,
                      height: 52,
                      borderRadius: 15,
                      background: `linear-gradient(135deg, ${w.tint}33, ${w.tint}18)`,
                      border: "1px solid rgba(255,255,255,0.6)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: 24,
                    }}
                  >
                    {w.emoji}
                  </div>
                  <svg width="48" height="48" viewBox="0 0 44 44">
                    <circle cx="22" cy="22" r="18" fill="none" stroke="rgba(15,23,42,0.1)" strokeWidth="5" />
                    <circle
                      cx="22"
                      cy="22"
                      r="18"
                      fill="none"
                      stroke={w.tint}
                      strokeWidth="5"
                      strokeLinecap="round"
                      strokeDasharray={C}
                      strokeDashoffset={C * (1 - ringPct / 100)}
                      transform="rotate(-90 22 22)"
                    />
                  </svg>
                </div>

                <div style={{ fontSize: 23, fontWeight: 800, marginTop: 14, color: INK.strong }}>{w.title}</div>
                <div style={{ fontSize: 15, color: INK.muted, marginTop: 3 }}>
                  {w.kind} · {w.concepts} concepts · {Math.round(ringPct)}% mastered
                </div>

                <div
                  style={{
                    marginTop: 16,
                    borderRadius: 12,
                    border: "1px solid rgba(255,255,255,0.7)",
                    background: "rgba(255,255,255,0.55)",
                    padding: "9px 0",
                    textAlign: "center",
                    fontSize: 16,
                    fontWeight: 600,
                    color: INK.base,
                  }}
                >
                  ▶ Resume Learning
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
