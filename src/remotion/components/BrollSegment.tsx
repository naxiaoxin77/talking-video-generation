import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, Audio, staticFile } from "remotion";

type Props = {
  imageSrc: string;  // relative path under public/, e.g. "broll/seg-02.jpg"
  audioSrc: string;  // relative path under public/, e.g. "audio/seg-02.mp3"
};

export const BrollSegment: React.FC<Props> = ({ imageSrc, audioSrc }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.15], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, durationInFrames], [0, -20], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(imageSrc)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translateY(${translateY}px)`,
            transformOrigin: "center center",
          }}
        />
      </AbsoluteFill>
      <Audio src={staticFile(audioSrc)} />
    </AbsoluteFill>
  );
};
