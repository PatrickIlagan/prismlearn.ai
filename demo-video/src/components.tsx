import type { CSSProperties, ReactNode } from "react";
import { COLOR, GLASS } from "./theme";

export function GlassCard({
  children,
  style,
}: {
  children: ReactNode;
  style?: CSSProperties;
}) {
  return <div style={{ ...GLASS, ...style }}>{children}</div>;
}

export function Pill({
  children,
  tint = COLOR.violet500,
  style,
}: {
  children: ReactNode;
  tint?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 10,
        padding: "14px 28px",
        borderRadius: 999,
        background: `${tint}22`,
        border: `1.5px solid ${tint}88`,
        color: "white",
        fontSize: 26,
        fontWeight: 700,
        boxShadow: `0 0 40px ${tint}55`,
        ...style,
      }}
    >
      {children}
    </div>
  );
}

/** Big bottom-anchored caption used on almost every scene — the fast-cut
 *  "what am I looking at" label. */
export function Caption({
  eyebrow,
  title,
  y = 900,
}: {
  eyebrow?: string;
  title: string;
  y?: number;
}) {
  return (
    <div style={{ position: "absolute", left: 100, right: 100, top: y, textAlign: "left" }}>
      {eyebrow && (
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            letterSpacing: 3,
            textTransform: "uppercase",
            color: COLOR.fuchsia500,
            marginBottom: 8,
          }}
        >
          {eyebrow}
        </div>
      )}
      <div style={{ fontSize: 52, fontWeight: 800, letterSpacing: -1, lineHeight: 1.1 }}>
        {title}
      </div>
    </div>
  );
}

export function Wordmark({ size = 56 }: { size?: number }) {
  return (
    <div style={{ fontSize: size, fontWeight: 800, letterSpacing: -1.5 }}>
      Prism
      <span
        style={{
          background: `linear-gradient(90deg, ${COLOR.violet500}, ${COLOR.fuchsia500})`,
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}
      >
        Learning
      </span>
      .AI
    </div>
  );
}
