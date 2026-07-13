import type { ComponentType, ReactElement } from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";
import { clockWipe } from "@remotion/transitions/clock-wipe";

import { S1LogoIntro, DURATION as D1 } from "./scenes/S1LogoIntro";
import { S1bProblem, DURATION as D1b } from "./scenes/S1bProblem";
import { S2PoweredBy, DURATION as D2 } from "./scenes/S2PoweredBy";
import { S3Ingest, DURATION as D3 } from "./scenes/S3Ingest";
import { S4TutorChat, DURATION as D4 } from "./scenes/S4TutorChat";
import { S4bAgentic, DURATION as D4b } from "./scenes/S4bAgentic";
import { S5Adaptive, DURATION as D5 } from "./scenes/S5Adaptive";
import { S6Quiz, DURATION as D6 } from "./scenes/S6Quiz";
import { S7Flashcards, DURATION as D7 } from "./scenes/S7Flashcards";
import { S8Gamification, DURATION as D8 } from "./scenes/S8Gamification";
import { S8bBossBattle, DURATION as D8b } from "./scenes/S8bBossBattle";
import { S8cCertificate, DURATION as D8c } from "./scenes/S8cCertificate";
import { S9Dashboard, DURATION as D9 } from "./scenes/S9Dashboard";
import { S9bPricing, DURATION as D9b } from "./scenes/S9bPricing";
import { S9cRoadmap, DURATION as D9c } from "./scenes/S9cRoadmap";
import { S10Closing, DURATION as D10 } from "./scenes/S10Closing";

const WIDTH = 1920;
const HEIGHT = 1080;

/** Overlap, in frames, of every scene-to-scene transition (~0.33s). */
const T = 10;

/**
 * Smooth, motion-based transitions — never a fade through black.
 *
 * Every presentation below keeps BOTH scenes painted for the whole overlap:
 * `slide` pushes one off as the other arrives, `wipe`/`clockWipe` reveal the
 * incoming scene over the outgoing one, and `fade` is configured with the
 * default `shouldFadeOutExitingScene: false`, so the new scene fades in *on
 * top of* the old one rather than both dipping toward the background. (That
 * dip is exactly what made the earlier hand-rolled opacity crossfade read as
 * a black/flash glitch: non-overlapping Sequences meant the two scenes were
 * never on screen at the same time.)
 *
 * `flip` is deliberately unused — mid-rotation it can expose the page behind
 * the cards, which is the same artifact in a different costume.
 */
const SPRING = springTiming({ config: { damping: 200 }, durationInFrames: T });
const LINEAR = linearTiming({ durationInFrames: T });

/** Each transition is stored as a keyed element factory rather than a
 *  `{presentation, timing}` pair: `TransitionPresentation<P>` is generic in
 *  its props and uses `P` in both input and output positions, so a heterogenous
 *  list of them has no clean common supertype. Building the element at the
 *  definition site keeps each one exactly typed. */
type MakeTransition = (key: string) => ReactElement;

type Beat = {
  Component: ComponentType;
  duration: number;
  /** Transition played *after* this scene. Omitted on the final scene. */
  transition?: MakeTransition;
};

const push =
  (direction: "from-left" | "from-right" | "from-top" | "from-bottom"): MakeTransition =>
  (key) =>
    <TransitionSeries.Transition key={key} presentation={slide({ direction })} timing={SPRING} />;

const reveal =
  (direction: "from-left" | "from-right" | "from-bottom"): MakeTransition =>
  (key) =>
    <TransitionSeries.Transition key={key} presentation={wipe({ direction })} timing={LINEAR} />;

const dissolveIn = (): MakeTransition => (key) =>
  <TransitionSeries.Transition key={key} presentation={fade()} timing={LINEAR} />;

const clock = (): MakeTransition => (key) =>
  (
    <TransitionSeries.Transition
      key={key}
      presentation={clockWipe({ width: WIDTH, height: HEIGHT })}
      timing={LINEAR}
    />
  );

/**
 * Exactly 1800 frames = 60.00s @ 30fps.
 *
 * Rhythm: 60s at 115bpm is exactly 115 beats (28.75 bars) — so the grid here
 * is the BEAT, not the bar; a whole-bar grid can't tile 60s evenly. Each
 * scene's DURATION is a whole number of beats (1 beat = 1800/115 ≈ 15.652
 * frames), derived from rounded *cumulative* beat offsets rather than
 * rounding each duration independently, so rounding error is absorbed at each
 * boundary instead of accumulating.
 *
 * Transitions preserve that grid for free: each non-final scene is padded by
 * exactly `T` frames and each of the 13 transitions consumes exactly `T`
 * frames of overlap, so every scene still *starts* on its original beat and
 * the total is still exactly 1800. The transition straddles the beat rather
 * than delaying it.
 *
 * Beats: 6,8,8,8,8,10,7,8,8,6,8,6,7,7,6,4 = 115.
 *
 * S4bAgentic (the "Lumi drives the document, not a chatbot" fog-of-war shot)
 * and S8cCertificate (the shareable-mastery payoff) were added by shaving a
 * couple of beats off the longer talking-head scenes — every trimmed scene
 * still finishes its own entrance animation and just holds its final frame a
 * hair less, so nothing visible was lost.
 */
const SCENES: Beat[] = [
  { Component: S1LogoIntro, duration: D1, transition: dissolveIn() },
  { Component: S1bProblem, duration: D1b, transition: push("from-bottom") },
  { Component: S2PoweredBy, duration: D2, transition: reveal("from-left") },
  { Component: S3Ingest, duration: D3, transition: push("from-right") },
  { Component: S4TutorChat, duration: D4, transition: reveal("from-bottom") },
  { Component: S4bAgentic, duration: D4b, transition: push("from-left") },
  { Component: S5Adaptive, duration: D5, transition: reveal("from-left") },
  { Component: S6Quiz, duration: D6, transition: dissolveIn() },
  { Component: S7Flashcards, duration: D7, transition: push("from-bottom") },
  { Component: S8Gamification, duration: D8, transition: reveal("from-right") },
  { Component: S8bBossBattle, duration: D8b, transition: push("from-left") },
  { Component: S8cCertificate, duration: D8c, transition: clock() },
  { Component: S9Dashboard, duration: D9, transition: reveal("from-bottom") },
  { Component: S9bPricing, duration: D9b, transition: push("from-right") },
  { Component: S9cRoadmap, duration: D9c, transition: dissolveIn() },
  { Component: S10Closing, duration: D10 },
];

/** Padded length of a scene: every scene but the last donates `T` frames to
 *  the transition that follows it. */
const padded = (s: Beat) => s.duration + (s.transition ? T : 0);

export function totalDuration(): number {
  const scenes = SCENES.reduce((sum, s) => sum + padded(s), 0);
  const overlaps = SCENES.filter((s) => s.transition).length * T;
  return scenes - overlaps;
}

export function PrismDemo() {
  return (
    <AbsoluteFill style={{ backgroundColor: "#fafaff" }}>
      <TransitionSeries>
        {SCENES.flatMap((scene, i) => {
          const { Component, transition } = scene;
          const nodes: ReactElement[] = [
            <TransitionSeries.Sequence key={`s${i}`} durationInFrames={padded(scene)}>
              <Component />
            </TransitionSeries.Sequence>,
          ];
          if (transition) nodes.push(transition(`t${i}`));
          return nodes;
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
}
