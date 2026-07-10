import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard, Pill } from "../components";
import { COLOR } from "../theme";

export const DURATION = 150;

export function S8Gamification() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captionOpacity = interpolate(frame, [110, 124], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const xpT = interpolate(frame, [6, 50], [0.2, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const burst = spring({ frame: frame - 50, fps, config: { damping: 9 }, durationInFrames: 16 });
  const burstOpacity = interpolate(frame, [50, 58, 78], [0, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const streakScale = spring({ frame: frame - 72, fps, config: { damping: 12 }, durationInFrames: 16 });
  const bossScale = spring({ frame: frame - 90, fps, config: { damping: 12 }, durationInFrames: 16 });

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
        <div style={{ position: "relative" }}>
          <GlassCard style={{ width: 720, padding: 34 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 14 }}>
              <div style={{ fontSize: 24, fontWeight: 800 }}>Level 6 · Cell Biology</div>
              <div style={{ fontSize: 22, color: COLOR.mint, fontWeight: 700 }}>+180 XP</div>
            </div>
            <div style={{ height: 22, borderRadius: 999, background: "rgba(255,255,255,0.12)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${xpT * 100}%`,
                  background: `linear-gradient(90deg, ${COLOR.violet500}, ${COLOR.fuchsia500})`,
                  boxShadow: `0 0 20px ${COLOR.fuchsia500}88`,
                }}
              />
            </div>
          </GlassCard>
          <div
            style={{
              position: "absolute",
              left: "50%",
              top: -30,
              transform: `translateX(-50%) scale(${burst})`,
              opacity: burstOpacity,
              fontSize: 44,
              fontWeight: 900,
              color: COLOR.amber,
              textShadow: `0 0 30px ${COLOR.amber}`,
              whiteSpace: "nowrap",
            }}
          >
            ⭐ LEVEL UP!
          </div>
        </div>

        <div style={{ display: "flex", gap: 24 }}>
          <div style={{ transform: `scale(${streakScale})` }}>
            <Pill tint={COLOR.amber}>🔥 12-day streak</Pill>
          </div>
          <div style={{ transform: `scale(${bossScale})` }}>
            <Pill tint={COLOR.rose}>⚔️ Boss Battle Ready</Pill>
          </div>
        </div>
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Gamification" title="Level Up As You Learn" />
      </div>
    </Scene>
  );
}

