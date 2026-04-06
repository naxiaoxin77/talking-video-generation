import React from "react";
import type { SlideData } from "../../../pipeline/types";
import { BulletListSlide } from "./BulletListSlide";
import { BigNumberSlide } from "./BigNumberSlide";
import { ComparisonSlide } from "./ComparisonSlide";
import { QuoteSlide } from "./QuoteSlide";
import { TimelineSlide } from "./TimelineSlide";

export const SlideRenderer: React.FC<{
  slideData: SlideData;
  durationInFrames: number;
}> = ({ slideData, durationInFrames }) => {
  switch (slideData.layout) {
    case "bullet-list":
      return <BulletListSlide data={slideData} durationInFrames={durationInFrames} />;
    case "big-number":
      return <BigNumberSlide data={slideData} durationInFrames={durationInFrames} />;
    case "comparison":
      return <ComparisonSlide data={slideData} durationInFrames={durationInFrames} />;
    case "quote":
      return <QuoteSlide data={slideData} durationInFrames={durationInFrames} />;
    case "timeline":
      return <TimelineSlide data={slideData} durationInFrames={durationInFrames} />;
    default:
      return null;
  }
};
