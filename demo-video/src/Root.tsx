import type { FC } from "react";
import { Composition } from "remotion";
import { PrismDemo, totalDuration } from "./PrismDemo";
import { PrismOutro, totalOutroDuration } from "./PrismOutro";

const FPS = 30;

export const RemotionRoot: FC = () => {
  return (
    <>
      <Composition
        id="PrismDemo"
        component={PrismDemo}
        durationInFrames={totalDuration()}
        fps={FPS}
        width={1920}
        height={1080}
      />
      <Composition
        id="PrismOutro"
        component={PrismOutro}
        durationInFrames={totalOutroDuration()}
        fps={FPS}
        width={1920}
        height={1080}
      />
    </>
  );
};
