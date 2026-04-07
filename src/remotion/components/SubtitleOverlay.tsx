import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig } from "remotion";
import { designConfig } from "../design.config";

const ds = designConfig.subtitle;

/**
 * 将文本按中文标点或换行切分成句子
 */
function splitSentences(text: string): string[] {
  // 按中文句号、问号、感叹号、分号、换行切分，保留非空句子
  return text
    .split(/(?<=[。？！；\n])\s*/)
    .map(s => s.trim())
    .filter(Boolean);
}

type Props = {
  text: string;
  durationInFrames?: number;
};

export const SubtitleOverlay: React.FC<Props> = ({ text, durationInFrames }) => {
  const frame = useCurrentFrame();
  const { fps, durationInFrames: seqDuration } = useVideoConfig();

  const totalFrames = durationInFrames || seqDuration;
  const sentences = splitSentences(text);

  if (sentences.length === 0) return null;

  // 每句平均分配帧数
  const framesPerSentence = totalFrames / sentences.length;
  // 当前应该显示哪一句
  const currentIndex = Math.min(
    Math.floor(frame / framesPerSentence),
    sentences.length - 1
  );

  // 显示当前句 + 前后各1句作为上下文（如果有）
  const windowStart = Math.max(0, currentIndex - 1);
  const windowEnd = Math.min(sentences.length - 1, currentIndex + 1);

  return (
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
            textAlign: "center",
            lineHeight: ds.lineHeight,
            textShadow: ds.textShadow,
          }}
        >
          {sentences.slice(windowStart, windowEnd + 1).map((sentence, i) => {
            const actualIndex = windowStart + i;
            const isCurrent = actualIndex === currentIndex;

            return (
              <span
                key={actualIndex}
                style={{
                  fontSize: ds.fontSize,
                  fontWeight: isCurrent ? 700 : ds.fontWeight,
                  color: isCurrent ? ds.highlightColor : ds.dimColor,
                  transition: "color 0.2s, font-weight 0.2s",
                }}
              >
                {sentence}
              </span>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
