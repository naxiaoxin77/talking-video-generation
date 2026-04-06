import React from "react";
import { AbsoluteFill } from "remotion";
import { designConfig } from "../design.config";

const ds = designConfig.subtitle;

export const SubtitleOverlay: React.FC<{ text: string }> = ({ text }) => (
  <AbsoluteFill
    style={{
      justifyContent: "flex-end",
      alignItems: "center",
      padding: `0 40px ${ds.bottomPadding}px 40px`,
    }}
  >
    <div
      style={{
        backgroundColor: ds.backgroundColor,
        borderRadius: ds.borderRadius,
        padding: ds.padding,
        maxWidth: ds.maxWidth,
      }}
    >
      <div
        style={{
          color: ds.color,
          fontSize: ds.fontSize,
          fontWeight: ds.fontWeight,
          textAlign: "center",
          lineHeight: ds.lineHeight,
          textShadow: ds.textShadow,
        }}
      >
        {text}
      </div>
    </div>
  </AbsoluteFill>
);
