// src/pipeline/overlay-planner.ts
// Gemini: SRT subtitles → timed overlay slide plan

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OverlayItem, SlideData } from "./types.js";

const VALID_LAYOUTS = ["bullet-list", "big-number", "comparison", "quote", "timeline"];

const SYSTEM_PROMPT = `你是短视频内容策划师。根据口播稿的 SRT 字幕，找出需要图文强化的时间段，生成半透明幻灯片叠加计划。

选择标准（选 2-4 个关键时机，不要每句都加）：
1. 需要强调的核心数据、统计数字 → big-number
2. 需要列举的多个要点 → bullet-list
3. 明显的对比关系（A vs B）→ comparison
4. 重要的流程步骤、时间线 → timeline
5. 精彩金句或核心结论 → quote

规则：
- 每个叠加时段持续 8-14 秒
- 叠加时段之间至少间隔 3 秒
- start/end 时间必须在音频范围内
- slideData 文字内容用中文，简洁有力
- bullet-list 的 icon 只能用 "·" 或 ""，禁止 emoji

输出严格 JSON：
{
  "overlays": [
    {
      "start": 8.2,
      "end": 18.5,
      "slideData": { "layout": "big-number", "title": "标题", "number": 60, "unit": "年", "subtitle": "说明文字" }
    }
  ]
}

支持的 layout 完整格式：
- { "layout": "bullet-list", "title": "...", "items": [{"icon": "·", "text": "..."}] }
- { "layout": "big-number", "title": "...", "number": 数字, "unit": "单位", "subtitle": "说明" }
- { "layout": "comparison", "title": "...", "left": {"label": "...", "items": ["..."]}, "right": {"label": "...", "items": ["..."]} }
- { "layout": "quote", "quote": "...", "attribution": "出处(可选)" }
- { "layout": "timeline", "title": "...", "nodes": [{"label": "...", "description": "可选"}] }

只输出 JSON，不要其他内容。`;

export async function generateOverlays(
  srtContent: string,
  apiKey: string
): Promise<OverlayItem[]> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `以下是口播稿的 SRT 字幕，请生成图文叠加计划：\n\n${srtContent}`
  );

  const text = result.response.text();
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from overlay plan response");

  const plan = JSON.parse(jsonMatch[1]);
  if (!Array.isArray(plan.overlays)) throw new Error("Overlay plan missing 'overlays' array");

  // Validate overlays
  const validated: OverlayItem[] = [];
  for (const item of plan.overlays) {
    if (typeof item.start !== "number" || typeof item.end !== "number") continue;
    if (!item.slideData || !VALID_LAYOUTS.includes(item.slideData.layout)) continue;
    if (item.end <= item.start) continue;
    validated.push({
      start: item.start,
      end: item.end,
      slideData: item.slideData as SlideData,
    });
  }

  console.log(`  Overlay plan: ${validated.length} overlays`);
  return validated;
}
