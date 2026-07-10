import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 188;

function QuestionCard({
  kind,
  frame,
  fps,
  startAt,
}: {
  kind: "mcq" | "math" | "code";
  frame: number;
  fps: number;
  startAt: number;
}) {
  const local = frame - startAt;
  const s = spring({ frame: local, fps, config: { damping: 15 }, durationInFrames: 16 });
  // Fade in fast, hold fully readable for a good while, fade out only right
  // before the next card takes over.
  const opacity = interpolate(local, [0, 10, 50, 60], [0, 1, 1, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  if (opacity <= 0.001) return null;

  return (
    <div
      style={{
        position: "absolute",
        inset: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        opacity,
        transform: `scale(${0.92 + s * 0.08})`,
      }}
    >
      <GlassCard style={{ width: 980, padding: 44 }}>
        <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, textTransform: "uppercase", color: COLOR.amber, marginBottom: 18 }}>
          {kind === "mcq" ? "Multiple Choice" : kind === "math" ? "Math — Real Problem" : "Code — Predict The Output"}
        </div>

        {kind === "mcq" && (
          <>
            <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 24 }}>
              Which organelle stores the cell&apos;s DNA?
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {["Mitochondria", "Nucleus", "Ribosome"].map((opt) => (
                <div
                  key={opt}
                  style={{
                    padding: "14px 20px",
                    borderRadius: 14,
                    background: opt === "Nucleus" ? `${COLOR.mint}22` : "rgba(15,23,42,0.035)",
                    border: opt === "Nucleus" ? `2px solid ${COLOR.mint}` : "1px solid rgba(15,23,42,0.1)",
                    fontSize: 24,
                  }}
                >
                  {opt} {opt === "Nucleus" && "✓"}
                </div>
              ))}
            </div>
          </>
        )}

        {kind === "math" && (
          <>
            <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 24 }}>Solve for x:</div>
            <div
              style={{
                fontSize: 52,
                fontWeight: 800,
                fontStyle: "italic",
                textAlign: "center",
                padding: "20px 0",
                color: COLOR.fuchsia600,
              }}
            >
              x² − 5x + 6 = 0
            </div>
            <div style={{ fontSize: 22, color: INK.muted }}>
              Answer: <span style={{ color: COLOR.mint, fontWeight: 700 }}>x = 2, x = 3</span>
            </div>
          </>
        )}

        {kind === "code" && (
          <>
            <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 20 }}>What does this print?</div>
            <div
              style={{
                background: "#f1f5f9",
                border: "1px solid #e2e8f0",
                borderRadius: 14,
                padding: "20px 26px",
                fontFamily: "monospace",
                fontSize: 24,
                lineHeight: 1.6,
                color: "#1e293b",
              }}
            >
              <div><span style={{ color: "#7c3aed" }}>total</span> = <span style={{ color: "#b45309" }}>0</span></div>
              <div>
                <span style={{ color: "#7c3aed" }}>for</span> i <span style={{ color: "#7c3aed" }}>in</span> range(1, 6):
              </div>
              <div>&nbsp;&nbsp;total += i</div>
              <div>print(total)</div>
            </div>
            <div style={{ fontSize: 22, color: INK.muted, marginTop: 14 }}>
              Answer: <span style={{ color: COLOR.mint, fontWeight: 700 }}>15</span>
            </div>
          </>
        )}
      </GlassCard>
    </div>
  );
}

export function S6Quiz() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captionOpacity = interpolate(frame, [24, 40], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <QuestionCard kind="mcq" frame={frame} fps={fps} startAt={8} />
      <QuestionCard kind="math" frame={frame} fps={fps} startAt={68} />
      <QuestionCard kind="code" frame={frame} fps={fps} startAt={128} />

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Quizzes & Exams" title="Real Math. Real Code. Not Just Multiple Choice." />
      </div>
    </Scene>
  );
}
