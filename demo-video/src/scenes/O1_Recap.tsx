import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Pill, Wordmark } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 340;

/** Straight from the pitch deck's "Beyond Flashcards: The Learning Engine"
 *  slide — the three things that prove this isn't just a flashcard app. */
const BADGES = [
  { emoji: "🎯", label: "Confidence Check", tint: COLOR.violet500, delay: 60 },
  { emoji: "⚔️", label: "Boss Battles", tint: "#ED1C24", delay: 84 },
  { emoji: "📉", label: "Mastery Decay", tint: COLOR.amber, delay: 108 },
  { emoji: "🧮", label: "Math & Code Quizzes", tint: COLOR.mint, delay: 132 },
];

export function O1_Recap() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const wordmarkScale = spring({ frame, fps, config: { damping: 13 }, durationInFrames: 16 });
  const taglineOpacity = interpolate(frame, [16, 30], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });

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
          gap: 30,
        }}
      >
        <div style={{ transform: `scale(${wordmarkScale})` }}>
          <Wordmark size={64} />
        </div>
        <div style={{ fontSize: 30, fontWeight: 700, color: INK.muted, opacity: taglineOpacity }}>
          Not just a flashcard generator.
        </div>

        <div style={{ display: "flex", gap: 18, marginTop: 16, flexWrap: "wrap", justifyContent: "center", maxWidth: 1200 }}>
          {BADGES.map((b) => {
            const s = spring({ frame: frame - b.delay, fps, config: { damping: 14 }, durationInFrames: 16 });
            return (
              <div key={b.label} style={{ opacity: s, transform: `translateY(${(1 - s) * 20}px) scale(${0.9 + s * 0.1})` }}>
                <Pill tint={b.tint} style={{ fontSize: 22, padding: "12px 24px" }}>
                  {b.emoji} {b.label}
                </Pill>
              </div>
            );
          })}
        </div>
      </div>
    </Scene>
  );
}
