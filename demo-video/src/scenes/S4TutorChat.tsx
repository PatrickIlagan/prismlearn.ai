import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { Mascot } from "../Mascot";
import { COLOR, INK } from "../theme";

export const DURATION = 157; // 10 beats @ 115bpm

const BUBBLES = [
  { from: "lumi", text: "Hey! A **cell** is the smallest unit that can be considered alive.", delay: 6 },
  { from: "student", text: "got it — what does it actually do?", delay: 34 },
  {
    from: "lumi",
    text: "It takes in nutrients, turns them into energy, and can make more cells — like a tiny factory.",
    delay: 60,
  },
];

/** Recreates the real LumiChatUI panel: glass card, header row (mascot + name
 *  + XP badge + TTS icon), the step progress stepper, message bubbles with
 *  the app's exact asymmetric corner radii, and the composer row. */
export function S4TutorChat() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const captionOpacity = interpolate(frame, [96, 112], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const panelScale = spring({ frame, fps, config: { damping: 16 }, durationInFrames: 16 });
  const mascotBob = Math.sin(frame / 10) * 3;
  const stepPct = interpolate(frame, [10, 120], [18, 62], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 96,
          width: 1120,
          transform: `translateX(-50%) scale(${0.96 + panelScale * 0.04})`,
          opacity: panelScale,
        }}
      >
        <GlassCard style={{ padding: 0, overflow: "hidden" }}>
          {/* header row */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "16px 22px",
              borderBottom: "1px solid rgba(255,255,255,0.5)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ transform: `translateY(${mascotBob}px)` }}>
                <Mascot size={46} />
              </div>
              <div>
                <div style={{ fontSize: 20, fontWeight: 700, color: INK.strong, lineHeight: 1.1 }}>Lumi</div>
                <div style={{ fontSize: 15, color: INK.muted }}>Your AI tutor</div>
              </div>
            </div>
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                borderRadius: 999,
                background: `${COLOR.violet500}18`,
                border: `1px solid ${COLOR.violet500}55`,
                padding: "5px 14px",
                fontSize: 15,
                fontWeight: 700,
                color: COLOR.violet600,
              }}
            >
              ⚡ 1,240 XP
            </div>
          </div>

          {/* step progress stepper */}
          <div style={{ padding: "12px 22px 0" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: INK.muted, marginBottom: 6 }}>
              <span>Step 2 of 4 · What is a cell?</span>
              <span>{Math.round(stepPct)}%</span>
            </div>
            <div style={{ height: 5, borderRadius: 999, background: "rgba(15,23,42,0.08)", overflow: "hidden" }}>
              <div
                style={{
                  height: "100%",
                  width: `${stepPct}%`,
                  borderRadius: 999,
                  background: `linear-gradient(90deg, ${COLOR.violet500}, ${COLOR.fuchsia500})`,
                }}
              />
            </div>
          </div>

          {/* message list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 14, padding: "20px 22px", minHeight: 300 }}>
            {BUBBLES.map((b, i) => {
              const s = spring({ frame: frame - b.delay, fps, config: { damping: 16 }, durationInFrames: 16 });
              const isLumi = b.from === "lumi";
              // Render **bold** the way the app's markdown renderer would.
              const parts = b.text.split(/(\*\*[^*]+\*\*)/g);
              return (
                <div
                  key={i}
                  style={{
                    alignSelf: isLumi ? "flex-start" : "flex-end",
                    opacity: s,
                    transform: `translateY(${(1 - s) * 16}px)`,
                    maxWidth: "78%",
                  }}
                >
                  <div
                    style={{
                      padding: "16px 22px",
                      fontSize: 22,
                      lineHeight: 1.45,
                      fontWeight: 500,
                      borderRadius: isLumi ? "6px 26px 26px 26px" : "26px 6px 26px 26px",
                      ...(isLumi
                        ? {
                            background: "rgba(255,255,255,0.62)",
                            border: "1px solid rgba(255,255,255,0.8)",
                            color: INK.strong,
                          }
                        : {
                            background: `linear-gradient(135deg, ${COLOR.violet500}, ${COLOR.violet600})`,
                            color: "white",
                            boxShadow: `0 10px 26px -12px ${COLOR.violet600}aa`,
                          }),
                    }}
                  >
                    {parts.map((p, j) =>
                      p.startsWith("**") ? (
                        <strong key={j} style={{ fontWeight: 800 }}>
                          {p.slice(2, -2)}
                        </strong>
                      ) : (
                        <span key={j}>{p}</span>
                      ),
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* composer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "14px 22px 18px",
              borderTop: "1px solid rgba(255,255,255,0.5)",
            }}
          >
            <div
              style={{
                flex: 1,
                borderRadius: 14,
                border: "1px solid rgba(255,255,255,0.7)",
                background: "rgba(255,255,255,0.45)",
                padding: "13px 18px",
                fontSize: 19,
                color: INK.faint,
              }}
            >
              Answer Lumi or ask a question…
            </div>
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: `linear-gradient(180deg, ${COLOR.violet500}, ${COLOR.violet600})`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 20,
                color: "white",
                boxShadow: `0 10px 24px -10px ${COLOR.violet600}`,
              }}
            >
              ➤
            </div>
          </div>
        </GlassCard>
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="AI Tutor" title="Teaches, Doesn't Just Answer" />
      </div>
    </Scene>
  );
}
