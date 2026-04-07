import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";

type Props = {
  videoSrc: string;
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
      {/* 字幕由 Topview avatar4 --caption 原生烧录，无需 Remotion 渲染 */}
    </AbsoluteFill>
  );
};
