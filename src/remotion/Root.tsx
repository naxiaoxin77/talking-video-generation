import React from "react";
import { Composition, registerRoot } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { TalkingVideo } from "./TalkingVideo.js";
import type { CompositionProps } from "../pipeline/types.js";

// Remotion requires props to satisfy Record<string, unknown>
type RemotionCompositionProps = CompositionProps & Record<string, unknown>;

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

const calculateMetadata: CalculateMetadataFunction<RemotionCompositionProps> = async ({
  props,
}) => {
  const totalSeconds = props.segments.reduce((sum, seg) => {
    return sum + (seg.avatarDuration || seg.durationHint);
  }, 0);

  const transitionOverlap = Math.max(0, props.segments.length - 1) * 0.5;
  const effectiveDuration = totalSeconds - transitionOverlap;

  return {
    durationInFrames: Math.ceil(effectiveDuration * FPS),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
  };
};

const defaultProps: RemotionCompositionProps = {
  segments: [],
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
