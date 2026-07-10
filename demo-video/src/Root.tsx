import type { FC } from "react";
import { Composition } from "remotion";
import { PrismDemo, totalDuration } from "./PrismDemo";

const FPS = 30;

export const RemotionRoot: FC = () => {
  return (
    <Composition
      id="PrismDemo"
      component={PrismDemo}
      durationInFrames={totalDuration()}
      fps={FPS}
      width={1920}
      height={1080}
    />
  );
};
