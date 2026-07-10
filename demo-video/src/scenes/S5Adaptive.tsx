import { interpolate, useCurrentFrame } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 125; // 8 beats @ 115bpm

const LEVELS = ["Academic", "Standard", "ELI5"];

/** Mirrors the real DocumentViewer: the sticky ComplexityToolbar ("Reading
 *  level" + slider + tinted level label) sitting above a chapter section that
 *  un-blurs as the fog-of-war padlock clears. */
export function S5Adaptive() {
  const frame = useCurrentFrame();
  const captionOpacity = interpolate(frame, [8, 20], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const blur = interpolate(frame, [16, 46], [8, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const lockOpacity = interpolate(frame, [16, 38], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  const sliderT = interpolate(frame, [24, 92], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const levelIdx = Math.min(2, Math.floor(sliderT * 3));
  const isEli5 = levelIdx === 2;

  return (
    <Scene durationInFrames={DURATION}>
      <div style={{ position: "absolute", left: 300, right: 300, top: 120 }}>
        {/* sticky ComplexityToolbar — same row layout as the real component */}
        <GlassCard
          style={{
            display: "flex",
            alignItems: "center",
            gap: 18,
            borderRadius: 16,
            padding: "16px 24px",
          }}
        >
          <span style={{ fontSize: 16, fontWeight: 600, color: INK.muted, whiteSpace: "nowrap" }}>Reading level</span>
          <div style={{ position: "relative", flex: 1, maxWidth: 220, height: 7, borderRadius: 999, background: "rgba(15,23,42,0.12)" }}>
            <div
              style={{
                position: "absolute",
                inset: 0,
                width: `${sliderT * 100}%`,
                borderRadius: 999,
                background: COLOR.violet500,
              }}
            />
            <div
              style={{
                position: "absolute",
                left: `${sliderT * 100}%`,
                top: -7,
                transform: "translateX(-50%)",
                width: 21,
                height: 21,
                borderRadius: "50%",
                background: "white",
                border: `1.5px solid ${COLOR.violet500}aa`,
                boxShadow: "0 2px 6px rgba(15,23,42,0.18)",
              }}
            />
          </div>
          <span
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              fontSize: 16,
              fontWeight: 700,
              color: isEli5 ? COLOR.fuchsia600 : levelIdx === 1 ? COLOR.violet600 : INK.base,
              whiteSpace: "nowrap",
            }}
          >
            {isEli5 ? "👶" : "🎓"} {LEVELS[levelIdx]}
          </span>
        </GlassCard>

        {/* chapter section, blurred behind the padlock until it unlocks */}
        <div style={{ position: "relative", marginTop: 26 }}>
          <div style={{ filter: `blur(${blur}px)` }}>
            <div style={{ fontSize: 30, fontWeight: 700, letterSpacing: -0.5, color: INK.strong }}>
              Chapter 3 — Mitosis
            </div>
            <div style={{ fontSize: 21, lineHeight: 1.65, color: INK.base, marginTop: 14 }}>
              {isEli5
                ? "Mitosis is when one cell splits into two twins. It copies everything inside first, then pulls the copies apart — like sharing a full set of building blocks so both halves get one."
                : "Mitosis is the stage of the cell cycle in which duplicated chromosomes are separated into two identical nuclei, producing two genetically identical daughter cells."}
            </div>
            {isEli5 && (
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 7,
                  marginTop: 14,
                  borderRadius: 10,
                  border: `1px solid ${COLOR.fuchsia500}66`,
                  background: `${COLOR.fuchsia500}12`,
                  padding: "6px 12px",
                  fontSize: 13,
                  fontWeight: 700,
                  letterSpacing: 1,
                  textTransform: "uppercase",
                  color: COLOR.fuchsia600,
                }}
              >
                ✨ ELI5
              </div>
            )}
          </div>

          {/* fog-of-war padlock overlay */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              gap: 10,
              opacity: lockOpacity,
            }}
          >
            <div
              style={{
                display: "inline-flex",
                alignItems: "center",
                gap: 9,
                borderRadius: 999,
                background: "rgba(255,255,255,0.85)",
                border: "1px solid rgba(255,255,255,0.9)",
                boxShadow: "0 12px 30px -12px rgba(76,29,149,0.4)",
                padding: "10px 20px",
                fontSize: 18,
                fontWeight: 600,
                color: INK.base,
              }}
            >
              🔒 Locked
            </div>
            <div style={{ fontSize: 14, color: INK.muted }}>Keep learning with Lumi to unlock this chapter.</div>
          </div>
        </div>
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption eyebrow="Active Learning Canvas" title="Adapts To How You Read" />
      </div>
    </Scene>
  );
}
