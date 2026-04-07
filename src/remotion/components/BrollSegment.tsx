import React from "react";
import { AbsoluteFill, Audio, OffthreadVideo, staticFile, useCurrentFrame, interpolate } from "remotion";
import type { SlideData } from "../../pipeline/types";
import { SlideRenderer } from "./slides/SlideRenderer";
import { SubtitleOverlay } from "./SubtitleOverlay";
import { designConfig } from "../design.config";

const pip = designConfig.pip;

type Props = {
  slideData: SlideData;
  audioSrc: string;
  avatarVideoSrc: string;
  durationInFrames: number;
  subtitleText?: string;
};

export const BrollSegment: React.FC<Props> = ({
  slideData,
  audioSrc,
  avatarVideoSrc,
  durationInFrames,
  subtitleText,
}) => {
  const frame = useCurrentFrame();

  // PiP 入场动画：缩放 + 淡入
  const pipScale = interpolate(frame, [0, pip.enterDuration], [0.3, 1], {
    extrapolateRight: "clamp",
  });
  const pipOpacity = interpolate(frame, [0, pip.enterDuration], [0, 1], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      {/* 底层：动画幻灯片 */}
      <SlideRenderer slideData={slideData} durationInFrames={durationInFrames} />

      {/* 画中画：人物上半身圆形小窗 */}
      <div
        style={{
          position: "absolute",
          top: pip.top,
          right: pip.right,
          width: pip.size,
          height: pip.size,
          borderRadius: "50%",
          overflow: "hidden",
          border: `${pip.borderWidth}px solid ${pip.borderColor}`,
          boxShadow: pip.boxShadow,
          opacity: pipOpacity,
          transform: `scale(${pipScale})`,
        }}
      >
        <OffthreadVideo
          src={staticFile(avatarVideoSrc)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            // 向上偏移显示上半身
            objectPosition: "center 15%",
          }}
        />
      </div>

      {/* 音频 */}
      <Audio src={staticFile(audioSrc)} />

      {/* 底部字幕 */}
      {subtitleText && <SubtitleOverlay text={subtitleText} />}
    </AbsoluteFill>
  );
};
