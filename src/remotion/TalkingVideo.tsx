import React from "react";
import { AbsoluteFill, OffthreadVideo, Sequence, staticFile, useVideoConfig } from "remotion";
import type { CompositionProps } from "../pipeline/types";
import { BrollOverlay } from "./components/BrollOverlay";

export const TalkingVideo: React.FC<CompositionProps> = ({ avatarVideoPath, overlays }) => {
  const { fps } = useVideoConfig();

  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {/* ── Full-screen avatar video (Topview, includes lip-sync + native captions) ── */}
      <OffthreadVideo
        src={staticFile(avatarVideoPath)}
        style={{ width: "100%", height: "100%", objectFit: "cover" }}
      />

      {/* ── Timed B-roll overlay cards ── */}
      {overlays.map((overlay, i) => {
        const fromFrame = Math.floor(overlay.start * fps);
        const durFrames = Math.max(1, Math.ceil((overlay.end - overlay.start) * fps));
        return (
          <Sequence key={i} from={fromFrame} durationInFrames={durFrames}>
            <BrollOverlay
              slideData={overlay.slideData}
              durationInFrames={durFrames}
            />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
