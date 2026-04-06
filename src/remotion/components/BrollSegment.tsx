import React from "react";
import { AbsoluteFill, Audio, staticFile } from "remotion";
import type { SlideData } from "../../pipeline/types";
import { SlideRenderer } from "./slides/SlideRenderer";
import { SubtitleOverlay } from "./SubtitleOverlay";

type Props = {
  slideData: SlideData;
  audioSrc: string;
  durationInFrames: number;
  subtitleText?: string;
};

export const BrollSegment: React.FC<Props> = ({ slideData, audioSrc, durationInFrames, subtitleText }) => {
  return (
    <AbsoluteFill>
      <SlideRenderer slideData={slideData} durationInFrames={durationInFrames} />
      <Audio src={staticFile(audioSrc)} />
      {subtitleText && <SubtitleOverlay text={subtitleText} />}
    </AbsoluteFill>
  );
};
