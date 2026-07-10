import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { Mascot } from "../Mascot";
import { COLOR, INK } from "../theme";

export const DURATION = 188;

const BUBBLES = [
  { from: "lumi", text: "Hey! A cell is the smallest unit that can be considered alive.", delay: 0 },
  { from: "student", text: "got it — what does it actually do?", delay: 46 },
  {
    from: "lumi",
    text: "It takes in nutrients, turns them into energy, and can make more cells — like a tiny factory.",
    delay: 92,
  },
];

export function S4TutorChat() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captionOpacity = interpolate(frame, [130, 148], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const mascotBob = Math.sin(frame / 10) * 4;

  return (
    <Scene durationInFrames={DURATION}>
      <div style={{ position: "absolute", left: 120, top: 130 }}>
        <div style={{ transform: `translateY(${mascotBob}px)` }}>
          <Mascot size={140} />
        </div>
        <div style={{ fontSize: 24, fontWeight: 700, marginTop: 10, textAlign: "center", color: INK.strong }}>
          Lumi
        </div>
        <div style={{ fontSize: 17, color: INK.muted, textAlign: "center" }}>Your AI Tutor</div>
      </div>

      <div style={{ position: "absolute", left: 440, top: 90, width: 1360, display: "flex", flexDirection: "column", gap: 22 }}>
        {BUBBLES.map((b, i) => {
          const s = spring({ frame: frame - b.delay, fps, config: { damping: 16 }, durationInFrames: 18 });
          const isLumi = b.from === "lumi";
          return (
            <div
              key={i}
              style={{
                alignSelf: isLumi ? "flex-start" : "flex-end",
                opacity: s,
                transform: `translateY(${(1 - s) * 20}px) scale(${0.9 + s * 0.1})`,
                maxWidth: 760,
              }}
            >
              <GlassCard
                style={{
                  padding: "20px 26px",
                  fontSize: 24,
                  lineHeight: 1.4,
                  fontWeight: 500,
                  borderRadius: isLumi ? "6px 26px 26px 26px" : "26px 6px 26px 26px",
                  // Student bubble is a solid violet fill, not frosted glass —
                  // explicitly clear GlassCard's gradient so it doesn't wash
                  // out the color underneath.
                  ...(isLumi
                    ? { color: INK.strong }
                    : {
                        backgroundImage: "none",
                        background: COLOR.violet600,
                        border: "none",
                        boxShadow: `0 10px 28px -10px ${COLOR.violet600}88`,
                        color: "white",
                      }),
                }}
              >
                {b.text}
              </GlassCard>
            </div>
          );
        })}
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="AI Tutor" title="Teaches, Doesn't Just Answer" />
      </div>
    </Scene>
  );
}

