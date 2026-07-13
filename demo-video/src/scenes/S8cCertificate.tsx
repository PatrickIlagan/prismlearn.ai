import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption } from "../components";
import { COLOR, GLASS, INK } from "../theme";

export const DURATION = 94; // 6 beats @ 115bpm

/** The payoff: finish a course and earn a shareable mastery certificate — a
 *  social-card PNG that flexes the AMD/Fireworks stack on every share. Mirrors
 *  lib/certificate.ts's real layout. */
export function S8cCertificate() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardIn = spring({ frame, fps, config: { damping: 16 }, durationInFrames: 20 });
  const tilt = interpolate(frame, [0, 30], [8, 0], { extrapolateRight: "clamp" });
  const sealPop = spring({ frame: frame - 22, fps, config: { damping: 9 }, durationInFrames: 16 });
  const captionOpacity = interpolate(frame, [50, 66], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 300,
          transform: `translate(-50%, ${(1 - cardIn) * 50}px) rotate(${tilt}deg) scale(${0.9 + cardIn * 0.1})`,
          opacity: cardIn,
          width: 980,
        }}
      >
        <div style={{ ...GLASS, borderRadius: 28, padding: "44px 52px", position: "relative", overflow: "hidden" }}>
          {/* aurora orbs behind the card content */}
          <div style={{ position: "absolute", top: -60, left: -40, width: 260, height: 260, borderRadius: "50%", background: "radial-gradient(circle, rgba(167,139,250,0.4), transparent 70%)" }} />
          <div style={{ position: "absolute", bottom: -80, right: -30, width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle, rgba(103,232,249,0.35), transparent 70%)" }} />

          {/* brand row */}
          <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
            <div
              style={{
                width: 0,
                height: 0,
                borderLeft: "16px solid transparent",
                borderRight: "16px solid transparent",
                borderBottom: `30px solid ${COLOR.violet600}`,
              }}
            />
            <span style={{ fontSize: 26, fontWeight: 800, color: INK.strong }}>PrismLearning.AI</span>
          </div>
          <div style={{ position: "relative", fontSize: 18, fontWeight: 700, letterSpacing: 3, color: COLOR.violet700, marginBottom: 20 }}>
            CERTIFICATE OF MASTERY
          </div>

          <div style={{ position: "relative", fontSize: 52, fontWeight: 800, fontFamily: "Georgia, serif", color: INK.strong }}>
            Alex Rivera
          </div>
          <div style={{ position: "relative", fontSize: 22, color: INK.muted, marginTop: 8 }}>
            has demonstrated mastery of
          </div>
          <div style={{ position: "relative", fontSize: 32, fontWeight: 700, color: INK.strong, marginTop: 4 }}>
            “Cell Biology 101”
          </div>

          {/* stat pills */}
          <div style={{ position: "relative", display: "flex", gap: 14, marginTop: 26 }}>
            {["94% mastery", "12/12 concepts", "Prism · Lv 10"].map((p) => (
              <div
                key={p}
                style={{
                  borderRadius: 999,
                  padding: "10px 20px",
                  background: `${COLOR.violet500}1f`,
                  color: COLOR.violet700,
                  fontSize: 20,
                  fontWeight: 700,
                }}
              >
                {p}
              </div>
            ))}
          </div>

          <div style={{ position: "relative", fontSize: 16, color: INK.faint, marginTop: 26 }}>
            Powered by gpt-oss-120b · Fireworks AI · AMD Instinct™ GPUs
          </div>

          {/* gold seal */}
          <div
            style={{
              position: "absolute",
              top: 40,
              right: 48,
              width: 96,
              height: 96,
              borderRadius: "50%",
              background: "linear-gradient(135deg, #fde68a, #f59e0b)",
              boxShadow: "0 10px 30px -6px rgba(245,158,11,0.5)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 44,
              transform: `scale(${sealPop})`,
            }}
          >
            🏆
          </div>
        </div>
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Shareable proof" title="Finish A Course, Earn A Mastery Certificate" />
      </div>
    </Scene>
  );
}
