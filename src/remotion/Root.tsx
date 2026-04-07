import React from "react";
import { Composition, registerRoot } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { TalkingVideo } from "./TalkingVideo";
import type { CompositionProps } from "../pipeline/types";

type RemotionCompositionProps = CompositionProps & Record<string, unknown>;

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

const calculateMetadata: CalculateMetadataFunction<RemotionCompositionProps> = async ({
  props,
}) => {
  return {
    durationInFrames: Math.ceil((props.totalDuration || 10) * FPS),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
  };
};

const defaultProps: RemotionCompositionProps = {
  avatarVideoPath: "avatars/main.mp4",
  totalDuration: 60,
  overlays: [],
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TalkingVideo"
      component={TalkingVideo as React.ComponentType<RemotionCompositionProps>}
      durationInFrames={1}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={defaultProps}
      calculateMetadata={calculateMetadata}
    />
  );
};

registerRoot(RemotionRoot);
