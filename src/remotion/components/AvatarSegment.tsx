import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";

type Props = {
  videoSrc: string; // relative path under public/, e.g. "avatars/seg-01.mp4"
};

export const AvatarSegment: React.FC<Props> = ({ videoSrc }) => {
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
    </AbsoluteFill>
  );
};
