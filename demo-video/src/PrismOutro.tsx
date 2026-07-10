import type { ComponentType, ReactElement } from "react";
import { AbsoluteFill } from "remotion";
import { TransitionSeries, linearTiming, springTiming } from "@remotion/transitions";
import { slide } from "@remotion/transitions/slide";
import { wipe } from "@remotion/transitions/wipe";
import { fade } from "@remotion/transitions/fade";

import { O1_Recap, DURATION as D1 } from "./scenes/O1_Recap";
import { S2PoweredBy, DURATION as D2 } from "./scenes/S2PoweredBy";
import { O3_LiveQR, DURATION as D3 } from "./scenes/O3_LiveQR";
import { S10Closing, DURATION as D10 } from "./scenes/S10Closing";

/** Same overlap/transition idiom as PrismDemo.tsx — see that file for the
 *  full rationale (no fade-through-black; both scenes stay painted for the
 *  whole overlap). Kept deliberately silent: this renders without audio so
 *  it can be dropped onto a licensed track in the edit, same workflow as the
 *  main 60s promo. */
const T = 10;

const SPRING = springTiming({ config: { damping: 200 }, durationInFrames: T });
const LINEAR = linearTiming({ durationInFrames: T });

type MakeTransition = (key: string) => ReactElement;

type Beat = {
  Component: ComponentType;
  duration: number;
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

/**
 * Exactly 840 frames = 28.00s @ 30fps.
 *
 * A recap sting meant to follow the live-recorded demo footage: reuses
 * S2PoweredBy and S10Closing verbatim from the main promo (PrismDemo.tsx) so
 * the branding/model-card visuals are identical, bookended by two new scenes
 * pulled from the pitch deck — the "Beyond Flashcards" feature badges and a
 * real, scannable QR pointing at the live deployment.
 */
const SCENES: Beat[] = [
  { Component: O1_Recap, duration: D1, transition: dissolveIn() },
  { Component: S2PoweredBy, duration: D2, transition: reveal("from-left") },
  { Component: O3_LiveQR, duration: D3, transition: push("from-bottom") },
  { Component: S10Closing, duration: D10 },
];

const padded = (s: Beat) => s.duration + (s.transition ? T : 0);

export function totalOutroDuration(): number {
  const scenes = SCENES.reduce((sum, s) => sum + padded(s), 0);
  const overlaps = SCENES.filter((s) => s.transition).length * T;
  return scenes - overlaps;
}

export function PrismOutro() {
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
