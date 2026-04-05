import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { EnrichedSegment } from "../../pipeline/types.js";

type Props = {
  segments: EnrichedSegment[];
};

const TRANSITION_DURATION_S = 0.5;

export const Subtitles: React.FC<Props> = ({ segments }) => {
  const { fps } = useVideoConfig();
  const transitionFrames = Math.round(TRANSITION_DURATION_S * fps);

  let currentFrame = 0;

  return (
    <AbsoluteFill>
      {segments.map((segment, index) => {
        const duration = segment.avatarDuration || segment.durationHint;
        const durationInFrames = Math.ceil(duration * fps);
        const from = currentFrame;
        currentFrame += durationInFrames - (index < segments.length - 1 ? transitionFrames : 0);

        return (
          <Sequence
            key={segment.id}
            from={from}
            durationInFrames={durationInFrames}
          >
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
                  {segment.text}
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
