import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Mascot } from "../Mascot";
import { Wordmark, Pill } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 150;

export function S10Closing() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const mascotScale = spring({ frame, fps, config: { damping: 13 }, durationInFrames: 18 });
  const wordmarkOpacity = interpolate(frame, [14, 30], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgesOpacity = interpolate(frame, [34, 50], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [48, 62], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
          gap: 20,
        }}
      >
        <div style={{ transform: `scale(${mascotScale})` }}>
          <Mascot size={150} />
        </div>
        <div style={{ opacity: wordmarkOpacity }}>
          <Wordmark size={58} />
        </div>
        <div style={{ opacity: taglineOpacity, fontSize: 26, color: INK.muted }}>
          Learn anything. Faster.
        </div>
        <div style={{ display: "flex", gap: 16, marginTop: 10, opacity: badgesOpacity }}>
          <Pill tint={COLOR.amber} style={{ fontSize: 20, padding: "10px 20px" }}>
            🔥 Fireworks AI
          </Pill>
          <Pill tint="#ED1C24" style={{ fontSize: 20, padding: "10px 20px" }}>
            ⚙️ AMD
          </Pill>
        </div>
      </div>
    </Scene>
  );
}

