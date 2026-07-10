import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 188;

/** Recreates the real Settings → "AI Model Provider" section almost exactly
 *  (frontend/src/app/dashboard/settings/page.tsx) — same two option cards,
 *  same Enterprise badge, same amber callout copy — rather than a stylized
 *  approximation, since this scene's whole point is "look, it's a real
 *  switch in the real product." */
export function S9cEnterprise() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const cardOpacity = interpolate(frame, [10, 26], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const cardY = interpolate(frame, [10, 26], [20, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const badgeScale = spring({ frame: frame - 20, fps, config: { damping: 12 }, durationInFrames: 16 });
  const selectScale = spring({ frame: frame - 62, fps, config: { damping: 14 }, durationInFrames: 14 });
  const calloutOpacity = interpolate(frame, [80, 98], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const calloutY = interpolate(frame, [80, 98], [10, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const captionOpacity = interpolate(frame, [130, 146], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const selected = selectScale > 0.5;

  return (
    <Scene durationInFrames={DURATION}>
      <div
        style={{
          position: "absolute",
          left: "50%",
          top: 130,
          width: 900,
          opacity: cardOpacity,
          transform: `translateX(-50%) translateY(${cardY}px)`,
        }}
      >
        <GlassCard style={{ padding: 32 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ fontSize: 20, fontWeight: 700, color: INK.strong }}>AI Model Provider</div>
            <div
              style={{
                transform: `scale(${badgeScale})`,
                borderRadius: 999,
                background: `linear-gradient(90deg, ${COLOR.amber}, #f97316)`,
                color: "white",
                fontSize: 11,
                fontWeight: 800,
                letterSpacing: 1,
                textTransform: "uppercase",
                padding: "3px 10px",
              }}
            >
              Enterprise
            </div>
          </div>
          <div style={{ fontSize: 15, color: INK.muted, marginTop: 10, lineHeight: 1.55 }}>
            Every plan runs tutoring on Fireworks AI&apos;s gpt-oss-120b by default. Enterprise
            customers can point their organization at a dedicated Gemma 4 deployment instead —
            full data residency, no shared multi-tenant infrastructure.
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginTop: 20 }}>
            <div
              style={{
                borderRadius: 14,
                padding: 16,
                border: "1px solid rgba(15,23,42,0.1)",
                background: "rgba(255,255,255,0.5)",
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: INK.strong }}>Fireworks AI (default)</div>
              <div style={{ fontSize: 13, color: INK.muted, marginTop: 3 }}>
                gpt-oss-120b · shared serverless
              </div>
            </div>
            <div
              style={{
                position: "relative",
                borderRadius: 14,
                padding: 16,
                border: `1.5px solid ${selected ? COLOR.violet500 : "rgba(15,23,42,0.1)"}88`,
                background: selected ? `${COLOR.violet500}14` : "rgba(255,255,255,0.5)",
                boxShadow: selected ? `0 0 0 3px ${COLOR.violet500}22` : "none",
                transform: `scale(${selected ? 1 + (selectScale - 1) * 0.15 : 1})`,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: INK.strong }}>Gemma 4 (Enterprise)</div>
              <div style={{ fontSize: 13, color: INK.muted, marginTop: 3 }}>
                Dedicated deployment · AMD Instinct™ GPUs
              </div>
            </div>
          </div>

          <div
            style={{
              opacity: calloutOpacity,
              transform: `translateY(${calloutY}px)`,
              marginTop: 16,
              borderRadius: 12,
              border: `1px solid ${COLOR.amber}55`,
              background: `${COLOR.amber}15`,
              padding: 14,
              fontSize: 13,
              color: "#92400e",
              lineHeight: 1.6,
            }}
          >
            This previews the switch an Enterprise admin flips — routing is a single{" "}
            <span style={{ fontFamily: "monospace", background: "rgba(146,64,14,0.1)", padding: "1px 5px", borderRadius: 4 }}>
              AI_PROVIDER=amd_cloud
            </span>{" "}
            environment variable, already wired in the backend.
          </div>
        </GlassCard>
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Enterprise-Ready" title="Flip To Gemma 4 On AMD — Same Architecture" />
      </div>
    </Scene>
  );
}
