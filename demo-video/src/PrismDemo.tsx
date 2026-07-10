import type { ComponentType } from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { S1LogoIntro, DURATION as D1 } from "./scenes/S1LogoIntro";
import { S1bProblem, DURATION as D1b } from "./scenes/S1bProblem";
import { S2PoweredBy, DURATION as D2 } from "./scenes/S2PoweredBy";
import { S3Ingest, DURATION as D3 } from "./scenes/S3Ingest";
import { S4TutorChat, DURATION as D4 } from "./scenes/S4TutorChat";
import { S5Adaptive, DURATION as D5 } from "./scenes/S5Adaptive";
import { S6Quiz, DURATION as D6 } from "./scenes/S6Quiz";
import { S7Flashcards, DURATION as D7 } from "./scenes/S7Flashcards";
import { S8Gamification, DURATION as D8 } from "./scenes/S8Gamification";
import { S8bBossBattle, DURATION as D8b } from "./scenes/S8bBossBattle";
import { S9Dashboard, DURATION as D9 } from "./scenes/S9Dashboard";
import { S9bPricing, DURATION as D9b } from "./scenes/S9bPricing";
import { S9cRoadmap, DURATION as D9c } from "./scenes/S9cRoadmap";
import { S10Closing, DURATION as D10 } from "./scenes/S10Closing";

/**
 * Exactly 1800 frames = 60.00s @ 30fps.
 *
 * Rhythm: 60s at 115bpm is exactly 115 beats (28.75 bars) — so the grid here
 * is the BEAT, not the bar; a whole-bar grid can't tile 60s evenly. Each
 * scene's duration is a whole number of beats (1 beat = 1800/115 ≈ 15.652
 * frames), with the frame counts derived from rounded *cumulative* beat
 * offsets rather than rounding each duration independently. That's why a few
 * scenes read 156 vs 157 for the same 10 beats: the rounding error is
 * absorbed at each boundary instead of accumulating, so every cut lands on a
 * beat AND the total is exactly 1800 with no drift.
 *
 * Beats: 6,10,10,8,10,8,10,8,6,8,8,9,10,4 = 115.
 */
const SCENES: { Component: ComponentType; duration: number }[] = [
  { Component: S1LogoIntro, duration: D1 },
  { Component: S1bProblem, duration: D1b },
  { Component: S2PoweredBy, duration: D2 },
  { Component: S3Ingest, duration: D3 },
  { Component: S4TutorChat, duration: D4 },
  { Component: S5Adaptive, duration: D5 },
  { Component: S6Quiz, duration: D6 },
  { Component: S7Flashcards, duration: D7 },
  { Component: S8Gamification, duration: D8 },
  { Component: S8bBossBattle, duration: D8b },
  { Component: S9Dashboard, duration: D9 },
  { Component: S9bPricing, duration: D9b },
  { Component: S9cRoadmap, duration: D9c },
  { Component: S10Closing, duration: D10 },
];

export function totalDuration(): number {
  return SCENES.reduce((sum, s) => sum + s.duration, 0);
}

export function PrismDemo() {
  let cursor = 0;
  return (
    <AbsoluteFill style={{ backgroundColor: "#fafaff" }}>
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
