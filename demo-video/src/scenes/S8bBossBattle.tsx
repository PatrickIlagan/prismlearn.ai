import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 188;

/** Matches the real PracticeExamArena.tsx boss-battle UI: a top bar with a
 *  swords + chapter title (amber/orange), score with a lightning icon, a
 *  flame combo badge, and a HORIZONTAL timer bar (not a ring) — the actual
 *  component drains `timePct = timeLeft / SECONDS_PER_Q * 100` as a bar. */
export function S8bBossBattle() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const topBarOpacity = interpolate(frame, [0, 14], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardScale = spring({ frame: frame - 18, fps, config: { damping: 15 }, durationInFrames: 18 });
  const comboScale = spring({ frame: frame - 70, fps, config: { damping: 11 }, durationInFrames: 16 });

  const secondsLeft = interpolate(frame, [18, 150], [25, 4], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const timePct = (secondsLeft / 25) * 100;
  const score = Math.round(interpolate(frame, [18, 150], [0, 2450], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));

  const captionOpacity = interpolate(frame, [128, 144], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <div style={{ position: "absolute", left: 130, right: 130, top: 110 }}>
        {/* top bar — mirrors the real arena's header row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            opacity: topBarOpacity,
            marginBottom: 30,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              fontSize: 16,
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: "uppercase",
              color: "#ea580c",
            }}
          >
            <span style={{ fontSize: 20 }}>⚔️</span> Mitosis
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 22, fontWeight: 700, color: INK.strong }}>
              ⚡ {score.toLocaleString()}
            </div>
            <div style={{ transform: `scale(${comboScale})` }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  background: `${COLOR.amber}22`,
                  borderRadius: 999,
                  padding: "5px 14px",
                  fontSize: 18,
                  fontWeight: 800,
                  color: "#c2410c",
                }}
              >
                🔥 ×3
              </div>
            </div>
          </div>
        </div>

        {/* horizontal timer bar — matches the real component's timePct width */}
        <div style={{ opacity: topBarOpacity, marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 14, color: INK.muted, marginBottom: 6 }}>
            <span>Question 4 of 8</span>
            <span>⏱ {Math.max(0, Math.round(secondsLeft))}s</span>
          </div>
          <div style={{ height: 6, borderRadius: 999, background: "rgba(15,23,42,0.08)", overflow: "hidden" }}>
            <div
              style={{
                height: "100%",
                width: `${timePct}%`,
                borderRadius: 999,
                background:
                  timePct < 24
                    ? COLOR.rose
                    : `linear-gradient(90deg, ${COLOR.violet500}, ${COLOR.fuchsia500}, ${COLOR.sky})`,
              }}
            />
          </div>
        </div>

        <div style={{ transform: `scale(${cardScale})`, transformOrigin: "top", opacity: cardScale }}>
          <GlassCard style={{ marginTop: 24, padding: 36, border: `2px solid ${COLOR.amber}55` }}>
            <div style={{ fontSize: 26, fontWeight: 700, color: INK.strong }}>
              What triggers the transition from metaphase to anaphase?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 10, marginTop: 20 }}>
              {["Spindle checkpoint clears", "Random timing", "Cell membrane signal"].map((opt, i) => (
                <div
                  key={opt}
                  style={{
                    padding: "12px 18px",
                    borderRadius: 14,
                    background: i === 0 ? `${COLOR.mint}22` : "rgba(15,23,42,0.035)",
                    border: i === 0 ? `2px solid ${COLOR.mint}` : "1px solid rgba(15,23,42,0.1)",
                    fontSize: 20,
                    color: INK.base,
                  }}
                >
                  {opt} {i === 0 && "✓"}
                </div>
              ))}
            </div>
          </GlassCard>
        </div>
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Boss Battles" title="Timed Challenges For Full Chapter Mastery" />
      </div>
    </Scene>
  );
}
