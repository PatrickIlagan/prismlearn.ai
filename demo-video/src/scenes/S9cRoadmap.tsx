import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 94; // 6 beats @ 115bpm

const ITEMS = [
  {
    emoji: "🏢",
    title: "Enterprise & B2B",
    desc: "Dedicated Gemma 4 on AMD Instinct™ GPUs, SSO, admin analytics.",
    tint: "#ED1C24",
  },
  {
    emoji: "🎮",
    title: "Live Gamified Learning",
    desc: "Real-time multiplayer boss battles and class-wide study leagues.",
    tint: COLOR.fuchsia500,
  },
  {
    emoji: "🎙️",
    title: "Voice-Native Tutoring",
    desc: "Talk through a concept with Lumi, hands-free, on any device.",
    tint: COLOR.sky,
  },
  {
    emoji: "📱",
    title: "Mobile & Offline",
    desc: "Review decks on the train — sync mastery when you're back online.",
    tint: COLOR.mint,
  },
];

export function S9cRoadmap() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headerOpacity = interpolate(frame, [4, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lineWidth = interpolate(frame, [16, 92], [0, 100], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <div style={{ position: "absolute", left: 100, right: 100, top: 96, opacity: headerOpacity }}>
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
          What&apos;s Next
        </div>
        <div style={{ fontSize: 46, fontWeight: 800, letterSpacing: -1, color: INK.strong }}>Roadmap</div>
      </div>

      {/* connecting track that draws left-to-right behind the cards */}
      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 340,
          height: 3,
          borderRadius: 999,
          background: "rgba(15,23,42,0.07)",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${lineWidth}%`,
            borderRadius: 999,
            background: `linear-gradient(90deg, ${COLOR.violet500}, ${COLOR.fuchsia500}, ${COLOR.sky})`,
          }}
        />
      </div>

      <div
        style={{
          position: "absolute",
          left: 100,
          right: 100,
          top: 300,
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
          gap: 24,
        }}
      >
        {ITEMS.map((it, i) => {
          const delay = 20 + i * 14;
          const s = spring({ frame: frame - delay, fps, config: { damping: 15 }, durationInFrames: 16 });
          return (
            <div key={it.title} style={{ opacity: s, transform: `translateY(${(1 - s) * 24}px)` }}>
              {/* node dot sitting on the track */}
              <div
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: "50%",
                  background: it.tint,
                  border: "3px solid #fafaff",
                  boxShadow: `0 0 0 3px ${it.tint}33`,
                  margin: "0 auto 26px",
                }}
              />
              <GlassCard style={{ padding: 24, textAlign: "center", height: 236 }}>
                <div
                  style={{
                    width: 54,
                    height: 54,
                    borderRadius: 16,
                    background: `${it.tint}1c`,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: 26,
                    margin: "0 auto 14px",
                  }}
                >
                  {it.emoji}
                </div>
                <div style={{ fontSize: 21, fontWeight: 800, color: INK.strong }}>{it.title}</div>
                <div style={{ fontSize: 15, color: INK.muted, marginTop: 8, lineHeight: 1.5 }}>{it.desc}</div>
              </GlassCard>
            </div>
          );
        })}
      </div>
    </Scene>
  );
}
