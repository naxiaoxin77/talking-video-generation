import React from "react";
import { AbsoluteFill, Series, useVideoConfig } from "remotion";
import type { CompositionProps } from "../pipeline/types";
import { AvatarSegment } from "./components/AvatarSegment";
import { BrollSegment } from "./components/BrollSegment";

export const TalkingVideo: React.FC<CompositionProps> = ({ segments }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <Series>
        {segments.map((segment) => {
          const duration = segment.avatarDuration || segment.durationHint;
          const durationInFrames = Math.ceil(duration * fps);

          return (
            <Series.Sequence key={segment.id} durationInFrames={durationInFrames}>
              {segment.type === "avatar" || !segment.slideData ? (
                <AvatarSegment
                  videoSrc={segment.avatarVideoPath!}
                />
              ) : (
                <BrollSegment
                  slideData={segment.slideData}
                  audioSrc={segment.audioPath!}
                  avatarVideoSrc={segment.avatarVideoPath!}
                  durationInFrames={durationInFrames}
                  subtitleText={segment.text}
                />
              )}
            </Series.Sequence>
          );
        })}
      </Series>
    </AbsoluteFill>
  );
};
