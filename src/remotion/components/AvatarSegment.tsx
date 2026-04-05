import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";

type Props = {
  videoSrc: string; // relative path under public/, e.g. "avatars/seg-01.mp4"
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
      {subtitleText && (
        <AbsoluteFill
          style={{
            justifyContent: "flex-end",
            alignItems: "center",
            padding: "0 40px 120px 40px",
          }}
        >
          <div
            style={{
              backgroundColor: "rgba(0, 0, 0, 0.6)",
              borderRadius: 12,
              padding: "16px 24px",
              maxWidth: "90%",
            }}
          >
            <div
              style={{
                color: "white",
                fontSize: 36,
                fontWeight: 600,
                textAlign: "center",
                lineHeight: 1.5,
                textShadow: "0 2px 4px rgba(0,0,0,0.5)",
              }}
            >
              {subtitleText}
            </div>
          </div>
        </AbsoluteFill>
      )}
    </AbsoluteFill>
  );
};
