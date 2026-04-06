import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import type { CompositionProps } from "../pipeline/types";
import { AvatarSegment } from "./components/AvatarSegment";
import { BrollSegment } from "./components/BrollSegment";

export const TalkingVideo: React.FC<CompositionProps> = ({ segments }) => {
  const { fps } = useVideoConfig();
  const transitionDuration = Math.round(0.5 * fps);

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {segments.map((segment, index) => {
          const duration = segment.avatarDuration || segment.durationHint;
          const durationInFrames = Math.ceil(duration * fps);

          return (
            <React.Fragment key={segment.id}>
              <TransitionSeries.Sequence durationInFrames={durationInFrames}>
                {segment.type === "avatar" || !segment.slideData ? (
                  <AvatarSegment
                    videoSrc={segment.avatarVideoPath!}
                    subtitleText={segment.text}
                  />
                ) : (
                  <BrollSegment
                    slideData={segment.slideData}
                    audioSrc={segment.audioPath!}
                    durationInFrames={durationInFrames}
                    subtitleText={segment.text}
                  />
                )}
              </TransitionSeries.Sequence>
              {index < segments.length - 1 && (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({ durationInFrames: transitionDuration })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>
    </AbsoluteFill>
  );
};
