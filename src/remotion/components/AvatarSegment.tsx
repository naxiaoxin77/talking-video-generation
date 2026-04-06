import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";
import { SubtitleOverlay } from "./SubtitleOverlay";

type Props = {
  videoSrc: string;
  subtitleText?: string;
};

export const AvatarSegment: React.FC<Props> = ({ videoSrc, subtitleText }) => {
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(videoSrc)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
      {subtitleText && <SubtitleOverlay text={subtitleText} />}
    </AbsoluteFill>
  );
};
