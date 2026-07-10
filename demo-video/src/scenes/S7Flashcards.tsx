import { interpolate, useCurrentFrame } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR } from "../theme";

export const DURATION = 75;

export function S7Flashcards() {
  const frame = useCurrentFrame();
  const captionOpacity = interpolate(frame, [55, 66], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  // Flip animation: 0 -> 90deg (front out) -> 180deg (back in), looped-ish once.
  const flip = interpolate(frame, [10, 40], [0, 180], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const showBack = flip > 90;
  const cardRotation = showBack ? flip - 180 : flip;

  const recallButtons = [
    { label: "Forgot", tint: COLOR.rose },
    { label: "Hard", tint: COLOR.amber },
    { label: "Good", tint: COLOR.mint },
    { label: "Easy", tint: COLOR.sky },
  ];
  const buttonsOpacity = interpolate(frame, [42, 54], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          gap: 36,
        }}
      >
        <div style={{ perspective: 1400 }}>
          <div
            style={{
              width: 640,
              height: 320,
              transformStyle: "preserve-3d",
              transform: `rotateY(${cardRotation}deg)`,
            }}
          >
            <GlassCard
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                backfaceVisibility: "hidden",
                textAlign: "center",
              }}
            >
              <div style={{ fontSize: 38, fontWeight: 800 }}>What is the spacing effect?</div>
            </GlassCard>
            <GlassCard
              style={{
                position: "absolute",
                inset: 0,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                padding: 40,
                backfaceVisibility: "hidden",
                transform: "rotateY(180deg)",
                textAlign: "center",
                background: `${COLOR.violet600}33`,
              }}
            >
              <div style={{ fontSize: 28, fontWeight: 600, lineHeight: 1.4 }}>
                Spreading reviews over increasing intervals beats cramming — review right before you&apos;d forget.
              </div>
            </GlassCard>
          </div>
        </div>

        <div style={{ display: "flex", gap: 16, opacity: buttonsOpacity }}>
          {recallButtons.map((b) => (
            <div
              key={b.label}
              style={{
                padding: "14px 26px",
                borderRadius: 16,
                background: `${b.tint}26`,
                border: `2px solid ${b.tint}`,
                fontSize: 22,
                fontWeight: 700,
                color: b.tint,
              }}
            >
              {b.label}
            </div>
          ))}
        </div>
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Flashcards" title="Spaced Repetition That Actually Sticks" />
      </div>
    </Scene>
  );
}

