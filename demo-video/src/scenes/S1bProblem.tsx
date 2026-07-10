import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { COLOR, INK } from "../theme";

export const DURATION = 156; // 10 beats @ 115bpm

/** The problem statement — two quick pain lines, then the positioning
 *  punchline: "Not just a flashcard generator." */
export function S1bProblem() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const line1Opacity = interpolate(frame, [6, 18], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const line2Opacity = interpolate(frame, [32, 44], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Both pain lines dim once the punchline lands, so the eye goes to it.
  const dim = interpolate(frame, [68, 80], [1, 0.35], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const punchScale = spring({ frame: frame - 72, fps, config: { damping: 13, stiffness: 150 }, durationInFrames: 18 });
  const subOpacity = interpolate(frame, [94, 108], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          gap: 18,
          textAlign: "center",
          padding: "0 160px",
        }}
      >
        <div style={{ fontSize: 40, fontWeight: 700, color: INK.base, opacity: line1Opacity * dim }}>
          Drowning in PDFs, slides, and lecture videos?
        </div>
        <div style={{ fontSize: 30, fontWeight: 500, color: INK.muted, opacity: line2Opacity * dim }}>
          Study apps spit out flashcards… then leave you on your own.
        </div>

        <div style={{ transform: `scale(${punchScale})`, opacity: punchScale, marginTop: 26 }}>
          <div style={{ fontSize: 62, fontWeight: 800, letterSpacing: -1.5, color: INK.strong }}>
            Not just a{" "}
            <span
              style={{
                background: `linear-gradient(90deg, ${COLOR.violet500}, ${COLOR.fuchsia500})`,
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text",
              }}
            >
              flashcard generator
            </span>
            .
          </div>
        </div>
        <div style={{ fontSize: 28, fontWeight: 600, color: INK.base, opacity: subOpacity }}>
          A real AI tutor that actually teaches.
        </div>
      </div>
    </Scene>
  );
}
