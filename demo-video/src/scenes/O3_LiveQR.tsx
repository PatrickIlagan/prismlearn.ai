import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { GlassCard, Pill } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 280;

export function O3_LiveQR() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const headlineOpacity = interpolate(frame, [0, 14], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const qrScale = spring({ frame: frame - 14, fps, config: { damping: 14 }, durationInFrames: 20 });
  const urlOpacity = interpolate(frame, [40, 56], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  const pulse = 1 + Math.sin(frame / 10) * 0.015;

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
          gap: 26,
        }}
      >
        <div style={{ opacity: headlineOpacity, display: "flex", alignItems: "center", gap: 14 }}>
          <Pill tint={COLOR.mint} style={{ fontSize: 20, padding: "8px 20px" }}>
            🟢 Live now
          </Pill>
        </div>

        <div style={{ transform: `scale(${qrScale * pulse})` }}>
          <GlassCard style={{ padding: 28, borderRadius: 32 }}>
            <Img src={staticFile("qr-code.png")} style={{ width: 260, height: 260, borderRadius: 16 }} />
          </GlassCard>
        </div>

        <div style={{ opacity: urlOpacity, textAlign: "center" }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: INK.strong }}>Scan to try it yourself</div>
          <div style={{ fontSize: 20, fontWeight: 600, color: COLOR.violet600, marginTop: 6 }}>
            prismlearn-ai-steel.vercel.app
          </div>
        </div>
      </div>
    </Scene>
  );
}
