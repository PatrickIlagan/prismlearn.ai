import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Scene } from "../Scene";
import { Caption, GlassCard } from "../components";
import { COLOR, INK } from "../theme";

export const DURATION = 156; // 10 beats @ 115bpm

/**
 * The thesis shot: Lumi is NOT a chatbot next to the document — it drives the
 * document. A `[MODE: TUTOR]` JSON command pill fires, and in response the UI
 * physically reacts: a fogged/locked chapter UNLOCKS (blur → clear + padlock
 * pops off) and a concept GLOWS mint as Lumi scrolls focus to it. This is the
 * "agentic UI pipeline" — the model returns UI actions, not just prose.
 */
const CHAPTERS = [
  { title: "1. The Cell", state: "done" },
  { title: "2. The Nucleus", state: "active" },
  { title: "3. Mitochondria", state: "unlocking" }, // fog lifts mid-scene
  { title: "4. Cell Division", state: "locked" },
] as const;

export function S4bAgentic() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const panelIn = spring({ frame, fps, config: { damping: 18 }, durationInFrames: 18 });

  // Beat 1 (~f34): the JSON command pill flies in.
  const cmdIn = spring({ frame: frame - 34, fps, config: { damping: 14 }, durationInFrames: 16 });
  // Beat 2 (~f58): chapter 3's fog lifts in direct response.
  const unlock = interpolate(frame, [58, 82], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  // Beat 3 (~f88): the concept glows mint as Lumi scrolls focus there.
  const glow = interpolate(frame, [88, 108], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  const glowPulse = 0.5 + 0.5 * Math.sin((frame - 88) / 5);

  const captionOpacity = interpolate(frame, [96, 112], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });

  return (
    <Scene durationInFrames={DURATION}>
      <div
        style={{
          position: "absolute",
          left: 130,
          right: 130,
          top: 96,
          transform: `translateY(${(1 - panelIn) * 40}px)`,
          opacity: panelIn,
          display: "grid",
          gridTemplateColumns: "300px 1fr",
          gap: 28,
        }}
      >
        {/* Chapter rail — fog of war */}
        <GlassCard style={{ padding: 24 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 800,
              letterSpacing: 2,
              textTransform: "uppercase",
              color: INK.faint,
              marginBottom: 16,
            }}
          >
            Chapters
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {CHAPTERS.map((ch) => {
              const isUnlocking = ch.state === "unlocking";
              const locked = ch.state === "locked" || (isUnlocking && unlock < 0.5);
              const active = ch.state === "active" || (isUnlocking && unlock >= 0.5);
              return (
                <div
                  key={ch.title}
                  style={{
                    position: "relative",
                    display: "flex",
                    alignItems: "center",
                    gap: 10,
                    borderRadius: 14,
                    padding: "14px 16px",
                    fontSize: 21,
                    fontWeight: 600,
                    background: active ? `${COLOR.violet500}1f` : "transparent",
                    color: ch.state === "done" ? COLOR.mint : active ? COLOR.violet700 : INK.faint,
                    filter: isUnlocking ? `blur(${(1 - unlock) * 6}px)` : "none",
                  }}
                >
                  <span style={{ fontSize: 18 }}>
                    {ch.state === "done" ? "✓" : active ? "▸" : "🔒"}
                  </span>
                  {ch.title}
                  {/* padlock pops off as the fog lifts */}
                  {isUnlocking && unlock > 0.5 && unlock < 0.92 && (
                    <span
                      style={{
                        position: "absolute",
                        right: 14,
                        fontSize: 18,
                        transform: `translateY(${(unlock - 0.5) * -60}px) scale(${1 - (unlock - 0.5)})`,
                        opacity: 1 - (unlock - 0.5) * 2,
                      }}
                    >
                      🔓
                    </span>
                  )}
                </div>
              );
            })}
          </div>
        </GlassCard>

        {/* Document canvas — a concept glows mint when Lumi scrolls to it */}
        <GlassCard style={{ padding: 34, position: "relative" }}>
          <div style={{ height: 12, width: "46%", borderRadius: 999, background: `${COLOR.violet500}44`, marginBottom: 22 }} />
          <div style={{ height: 9, width: "100%", borderRadius: 999, background: "rgba(15,23,42,0.08)", marginBottom: 12 }} />
          <div style={{ height: 9, width: "92%", borderRadius: 999, background: "rgba(15,23,42,0.08)", marginBottom: 26 }} />

          {/* the highlighted concept */}
          <div
            style={{
              borderRadius: 16,
              padding: "18px 20px",
              background: `rgba(16,185,129,${0.14 * glow})`,
              boxShadow: glow > 0 ? `0 0 ${28 * glowPulse}px rgba(16,185,129,${0.5 * glow})` : "none",
              border: `1.5px solid rgba(16,185,129,${0.55 * glow})`,
              transition: "none",
            }}
          >
            <div style={{ height: 10, width: "70%", borderRadius: 999, background: `rgba(5,150,105,${0.35 + 0.3 * glow})`, marginBottom: 12 }} />
            <div style={{ height: 8, width: "88%", borderRadius: 999, background: `rgba(5,150,105,${0.22 + 0.2 * glow})` }} />
          </div>

          <div style={{ height: 9, width: "80%", borderRadius: 999, background: "rgba(15,23,42,0.07)", marginTop: 26, filter: "blur(1px)" }} />
        </GlassCard>
      </div>

      {/* Lumi's live command — the JSON the model returns, driving all of the above */}
      <div
        style={{
          position: "absolute",
          left: 130,
          top: 640,
          transform: `translateX(${(1 - cmdIn) * -60}px) scale(${cmdIn})`,
          opacity: cmdIn,
        }}
      >
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 12,
            borderRadius: 16,
            padding: "16px 22px",
            background: "rgba(15,23,42,0.9)",
            color: "#e9d5ff",
            fontFamily: "'SF Mono', ui-monospace, monospace",
            fontSize: 20,
            boxShadow: "0 16px 40px -12px rgba(124,58,237,0.5)",
          }}
        >
          <span style={{ fontSize: 24 }}>◆</span>
          <span>
            <span style={{ color: "#c4b5fd" }}>ui_action</span>:{" "}
            <span style={{ color: "#6ee7b7" }}>
              {unlock < 0.5 ? '"unlock_chapter"' : glow < 0.5 ? '"scroll_and_highlight"' : '"advance_step"'}
            </span>
          </span>
        </div>
      </div>

      <div style={{ opacity: captionOpacity }}>
        <Caption
          eyebrow="Agentic UI · not a chatbot"
          title="Lumi Doesn't Just Talk — It Drives The Document"
        />
      </div>
    </Scene>
  );
}
