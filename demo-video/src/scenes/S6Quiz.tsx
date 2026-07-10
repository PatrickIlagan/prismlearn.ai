import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR } from "../theme";

export const DURATION = 165;

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
  const opacity = interpolate(local, [0, 10, 42, 52], [0, 1, 1, 0], {
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
                    background: opt === "Nucleus" ? `${COLOR.mint}33` : "rgba(255,255,255,0.06)",
                    border: opt === "Nucleus" ? `2px solid ${COLOR.mint}` : "1px solid rgba(255,255,255,0.15)",
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
                color: COLOR.fuchsia500,
              }}
            >
              x² − 5x + 6 = 0
            </div>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.6)" }}>
              Answer: <span style={{ color: COLOR.mint, fontWeight: 700 }}>x = 2, x = 3</span>
            </div>
          </>
        )}

        {kind === "code" && (
          <>
            <div style={{ fontSize: 30, fontWeight: 700, marginBottom: 20 }}>What does this print?</div>
            <div
              style={{
                background: "#0f172a",
                borderRadius: 14,
                padding: "20px 26px",
                fontFamily: "monospace",
                fontSize: 24,
                lineHeight: 1.6,
                color: "#e2e8f0",
              }}
            >
              <div><span style={{ color: "#c084fc" }}>total</span> = <span style={{ color: "#fbbf24" }}>0</span></div>
              <div>
                <span style={{ color: "#c084fc" }}>for</span> i <span style={{ color: "#c084fc" }}>in</span> range(1, 6):
              </div>
              <div>&nbsp;&nbsp;total += i</div>
              <div>print(total)</div>
            </div>
            <div style={{ fontSize: 22, color: "rgba(255,255,255,0.6)", marginTop: 14 }}>
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
  const captionOpacity = interpolate(frame, [20, 32], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <QuestionCard kind="mcq" frame={frame} fps={fps} startAt={6} />
      <QuestionCard kind="math" frame={frame} fps={fps} startAt={58} />
      <QuestionCard kind="code" frame={frame} fps={fps} startAt={110} />

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Quizzes & Exams" title="Real Math. Real Code. Not Just Multiple Choice." />
      </div>
    </Scene>
  );
}

