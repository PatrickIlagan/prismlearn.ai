import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Mascot } from "../Mascot";
import { Wordmark, Pill } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 63; // 4 beats @ 115bpm

export function S10Closing() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  // 63-frame scene: every beat has to land fast, and nothing may still be
  // fading in at the cut — badges are fully opaque by frame 34.
  const mascotScale = spring({ frame, fps, config: { damping: 13 }, durationInFrames: 12 });
  const wordmarkOpacity = interpolate(frame, [6, 16], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const taglineOpacity = interpolate(frame, [14, 24], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgesOpacity = interpolate(frame, [22, 34], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

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
        }}
      >
        <div style={{ transform: `scale(${mascotScale})` }}>
          <Mascot size={150} />
        </div>
        <div style={{ opacity: wordmarkOpacity }}>
          <Wordmark size={58} />
        </div>
        <div style={{ opacity: taglineOpacity, fontSize: 26, color: INK.muted }}>
          Not just a flashcard generator.
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 12, opacity: badgesOpacity }}>
          <Pill tint={COLOR.amber} style={{ fontSize: 17, padding: "9px 18px" }}>
            🔥 Fireworks AI Serverless
          </Pill>
          <Pill tint={COLOR.mint} style={{ fontSize: 17, padding: "9px 18px" }}>
            🗂️ Gemma 3 27B
          </Pill>
          <Pill tint="#ED1C24" style={{ fontSize: 17, padding: "9px 18px" }}>
            ⚙️ Gemma 4 · AMD Instinct™
          </Pill>
        </div>
      </div>
    </Scene>
  );
}
