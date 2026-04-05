import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate, Img, Audio, staticFile } from "remotion";

type Props = {
  imageSrc: string;  // relative path under public/, e.g. "broll/seg-02.jpg"
  audioSrc: string;  // relative path under public/, e.g. "audio/seg-02.mp3"
  durationInFrames: number;
  subtitleText?: string;
};

export const BrollSegment: React.FC<Props> = ({ imageSrc, audioSrc, durationInFrames, subtitleText }) => {
  const frame = useCurrentFrame();

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
