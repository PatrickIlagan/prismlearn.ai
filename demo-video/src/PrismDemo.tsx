import type { ComponentType } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { S1LogoIntro, DURATION as D1 } from "./scenes/S1LogoIntro";
import { S2PoweredBy, DURATION as D2 } from "./scenes/S2PoweredBy";
import { S3Ingest, DURATION as D3 } from "./scenes/S3Ingest";
import { S4TutorChat, DURATION as D4 } from "./scenes/S4TutorChat";
import { S5Adaptive, DURATION as D5 } from "./scenes/S5Adaptive";
import { S6Quiz, DURATION as D6 } from "./scenes/S6Quiz";
import { S7Flashcards, DURATION as D7 } from "./scenes/S7Flashcards";
import { S8Gamification, DURATION as D8 } from "./scenes/S8Gamification";
import { S9Dashboard, DURATION as D9 } from "./scenes/S9Dashboard";
import { S10Closing, DURATION as D10 } from "./scenes/S10Closing";

/** 25s @ 30fps = 750 frames, ~10 fast-paced scenes back to back. This list is
 * the single source of truth for both the running `from` offset and the
 * total composition length (see Root.tsx) — change a scene's pacing in one
 * place, not two. */
const SCENES: { Component: ComponentType; duration: number }[] = [
  { Component: S1LogoIntro, duration: D1 },
  { Component: S2PoweredBy, duration: D2 },
  { Component: S3Ingest, duration: D3 },
  { Component: S4TutorChat, duration: D4 },
  { Component: S5Adaptive, duration: D5 },
  { Component: S6Quiz, duration: D6 },
  { Component: S7Flashcards, duration: D7 },
  { Component: S8Gamification, duration: D8 },
  { Component: S9Dashboard, duration: D9 },
  { Component: S10Closing, duration: D10 },
];

export function totalDuration(): number {
  return SCENES.reduce((sum, s) => sum + s.duration, 0);
}

export function PrismDemo() {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#0f0a1f" }}>
      {SCENES.map(({ Component, duration }, i) => {
        const from = cursor;
        cursor += duration;
        return (
          <Sequence key={i} from={from} durationInFrames={duration}>
            <Component />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
}
