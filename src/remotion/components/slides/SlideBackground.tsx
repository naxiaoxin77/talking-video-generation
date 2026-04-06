import React from "react";
import { AbsoluteFill } from "remotion";
import type { SlideColorTheme } from "../../../pipeline/types";
import { fontFamily } from "../../fonts";
import { designConfig } from "../../design.config";

const dc = designConfig;

export function resolveTheme(theme?: SlideColorTheme): Required<SlideColorTheme> {
  return {
    background: theme?.background || dc.theme.background,
    accent: theme?.accent || dc.theme.accent,
    text: theme?.text || dc.theme.text,
  };
}

export const SlideBackground: React.FC<{
  theme?: SlideColorTheme;
  children: React.ReactNode;
}> = ({ theme, children }) => {
  const t = resolveTheme(theme);

  return (
    <AbsoluteFill
      style={{
        background: t.background,
        fontFamily,
        color: t.text,
        padding: dc.slide.padding,
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
      }}
    >
      {children}
    </AbsoluteFill>
  );
};

export const SlideTitle: React.FC<{
  children: React.ReactNode;
  opacity: number;
  translateY: number;
  accent?: string;
}> = ({ children, opacity, translateY, accent }) => (
  <div
    style={{
      fontSize: dc.slide.title.fontSize,
      fontWeight: dc.slide.title.fontWeight,
      marginBottom: dc.slide.title.marginBottom,
      opacity,
      transform: `translateY(${translateY}px)`,
      color: accent || dc.theme.accent,
      lineHeight: dc.slide.title.lineHeight,
    }}
  >
    {children}
  </div>
);
