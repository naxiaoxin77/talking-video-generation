import React from "react";
import { AbsoluteFill, useCurrentFrame, interpolate } from "remotion";
import type { SlideData } from "../../pipeline/types";
import { SlideRenderer } from "./slides/SlideRenderer";

/**
 * Semi-transparent overlay card that appears on top of the avatar video.
 * Rendered inside a <Sequence> so useCurrentFrame() starts at 0 for each overlay.
 */
export const BrollOverlay: React.FC<{
  slideData: SlideData;
  durationInFrames: number;
}> = ({ slideData, durationInFrames }) => {
  const frame = useCurrentFrame();
  const fadeFrames = 10;

  // Fade in + slide up on enter, fade out on exit
  const opacity = interpolate(
    frame,
    [0, fadeFrames, durationInFrames - fadeFrames, durationInFrames],
    [0, 1, 1, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );
  const translateY = interpolate(
    frame,
    [0, fadeFrames],
    [28, 0],
    { extrapolateLeft: "clamp", extrapolateRight: "clamp" }
  );

  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {/*
        Card positioned in the middle band of the screen:
        - top 30% avoids the face / upper body area
        - bottom 18% avoids Topview native captions
        The inner `position: relative` div creates a new CSS stacking context
        so that `AbsoluteFill` (position:absolute; inset:0) inside SlideRenderer
        fills this card rather than the whole frame.
      */}
      <div
        style={{
          position: "absolute",
          left: "4%",
          right: "4%",
          top: "8%",
          bottom: "28%",
          opacity,
          transform: `translateY(${translateY}px)`,
          background: "rgba(10, 10, 22, 0.75)",
          backdropFilter: "blur(24px)",
          WebkitBackdropFilter: "blur(24px)",
          borderRadius: 36,
          overflow: "hidden",
          boxShadow: "0 8px 48px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.09)",
        }}
      >
        <div style={{ position: "relative", width: "100%", height: "100%" }}>
          <SlideRenderer
            slideData={slideData}
            durationInFrames={durationInFrames}
            overlayMode
          />
        </div>
      </div>
    </AbsoluteFill>
  );
};
