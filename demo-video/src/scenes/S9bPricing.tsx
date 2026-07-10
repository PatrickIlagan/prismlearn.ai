import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 141; // 9 beats @ 115bpm

const TIERS = [
  {
    name: "Free",
    price: "$0",
    cadence: "forever",
    blurb: "Get started",
    features: ["3 workspaces", "Core AI tutor", "Standard quizzes & flashcards"],
    delay: 22,
    highlight: false,
  },
  {
    name: "Pro",
    price: "$10",
    cadence: "/ month",
    blurb: "For serious learners",
    features: [
      "Unlimited workspaces",
      "Math & code question types",
      "Boss battles & full gamification",
      "Priority AI responses",
    ],
    delay: 40,
    highlight: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    cadence: "",
    blurb: "For schools & teams",
    features: [
      "Dedicated Gemma 4 on AMD Instinct™",
      "SSO & admin dashboard",
      "Bulk seats & dedicated support",
    ],
    delay: 58,
    highlight: false,
  },
];

export function S9bPricing() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captionOpacity = interpolate(frame, [8, 22], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeScale = spring({ frame: frame - 52, fps, config: { damping: 11 }, durationInFrames: 14 });

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
            Pricing
          </div>
          <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1, color: INK.strong }}>
            Simple, Fair Pricing
          </div>
        </div>
      </div>

      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 260,
          display: "grid",
          gridTemplateColumns: "repeat(3, 1fr)",
          gap: 32,
          alignItems: "start",
        }}
      >
        {TIERS.map((t) => {
          const s = spring({ frame: frame - t.delay, fps, config: { damping: 15 }, durationInFrames: 18 });
          return (
            <div
              key={t.name}
              style={{
                opacity: s,
                transform: `translateY(${(1 - s) * 26}px) scale(${t.highlight ? 1.04 : 1})`,
              }}
            >
              <GlassCard
                style={{
                  position: "relative",
                  padding: 32,
                  ...(t.highlight
                    ? {
                        backgroundImage: "none",
                        background:
                          "linear-gradient(160deg, rgba(139,92,246,0.14), rgba(217,70,239,0.08))",
                        border: `2px solid ${COLOR.violet500}`,
                        boxShadow: `0 20px 50px -18px ${COLOR.violet500}55`,
                      }
                    : {}),
                }}
              >
                {t.highlight && (
                  <div
                    style={{
                      position: "absolute",
                      top: -18,
                      left: "50%",
                      transform: `translateX(-50%) scale(${badgeScale})`,
                      background: `linear-gradient(90deg, ${COLOR.violet500}, ${COLOR.fuchsia500})`,
                      color: "white",
                      fontSize: 15,
                      fontWeight: 700,
                      padding: "6px 18px",
                      borderRadius: 999,
                      whiteSpace: "nowrap",
                      boxShadow: `0 6px 18px -4px ${COLOR.violet600}88`,
                    }}
                  >
                    MOST POPULAR
                  </div>
                )}
                <div style={{ fontSize: 24, fontWeight: 800 }}>{t.name}</div>
                <div style={{ fontSize: 15, color: INK.muted, marginTop: 2 }}>{t.blurb}</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: 6, marginTop: 18 }}>
                  <div style={{ fontSize: 44, fontWeight: 800, color: t.highlight ? COLOR.violet600 : INK.strong }}>
                    {t.price}
                  </div>
                  {t.cadence && <div style={{ fontSize: 16, color: INK.muted }}>{t.cadence}</div>}
                </div>
                <div style={{ marginTop: 20, display: "flex", flexDirection: "column", gap: 10 }}>
                  {t.features.map((f) => (
                    <div key={f} style={{ display: "flex", gap: 8, fontSize: 17, color: INK.base }}>
                      <span style={{ color: COLOR.mint, fontWeight: 700 }}>✓</span> {f}
                    </div>
                  ))}
                </div>
              </GlassCard>
            </div>
          );
        })}
      </div>
    </Scene>
  );
}
