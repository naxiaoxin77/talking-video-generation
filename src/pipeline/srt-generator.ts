// src/pipeline/srt-generator.ts
// Gemini multimodal: audio → SRT subtitles with precise timestamps

import { GoogleGenerativeAI } from "@google/generative-ai";
import fs from "fs";

const SYSTEM_PROMPT = `你是专业字幕制作员。将音频转录为标准 SRT 格式字幕。

规则：
1. 每条字幕不超过 20 个汉字（或等效英文单词）
2. 按自然语音停顿分割，不要在词语中间断开
3. 时间格式严格为：HH:MM:SS,mmm --> HH:MM:SS,mmm
4. 字幕编号从 1 开始连续递增
5. 只输出 SRT 内容，不要任何解释或其他内容

示例格式：
1
00:00:00,000 --> 00:00:03,200
这是第一条字幕内容

2
00:00:03,500 --> 00:00:06,800
这是第二条字幕内容`;

export async function generateSrt(audioPath: string, apiKey: string): Promise<string> {
  console.log(`  Reading audio file: ${audioPath}`);
  const audioBytes = fs.readFileSync(audioPath);
  const base64Audio = audioBytes.toString("base64");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: SYSTEM_PROMPT,
  });

  console.log("  Sending audio to Gemini for transcription...");
  const result = await model.generateContent([
    {
      inlineData: {
        mimeType: "audio/mpeg",
        data: base64Audio,
      },
    },
    "请将这段音频转录为 SRT 格式字幕。",
  ]);

  const srt = result.response.text().trim();
  console.log(`  SRT generated (${srt.split("\n\n").length} cues)`);
  return srt;
}

/** Parse SRT string into structured cues */
export interface SrtCue {
  index: number;
  startTime: number;  // seconds
  endTime: number;    // seconds
  text: string;
}

export function parseSrt(srtContent: string): SrtCue[] {
  const blocks = srtContent.trim().split(/\n\n+/);
  const cues: SrtCue[] = [];

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    if (lines.length < 3) continue;

    const index = parseInt(lines[0], 10);
    const timeLine = lines[1];
    const text = lines.slice(2).join(" ").trim();

    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2}),(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2}),(\d{3})/
    );
    if (!timeMatch) continue;

    const toSeconds = (h: string, m: string, s: string, ms: string) =>
      parseInt(h) * 3600 + parseInt(m) * 60 + parseInt(s) + parseInt(ms) / 1000;

    cues.push({
      index,
      startTime: toSeconds(timeMatch[1], timeMatch[2], timeMatch[3], timeMatch[4]),
      endTime: toSeconds(timeMatch[5], timeMatch[6], timeMatch[7], timeMatch[8]),
      text,
    });
  }

  return cues;
}
