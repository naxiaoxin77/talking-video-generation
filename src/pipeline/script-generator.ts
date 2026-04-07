// src/pipeline/script-generator.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { VideoScript, SlideData } from "./types.js";

const VALID_LAYOUTS = ["bullet-list", "big-number", "comparison", "quote", "timeline"];

const SYSTEM_PROMPT = `你是一个专业的短视频脚本编剧。你的任务是将文章转换为口播短视频脚本。

输出要求：
1. 输出严格的 JSON 格式，符合以下 TypeScript 接口：
   interface VideoScript {
     title: string;
     totalDurationEstimate: number;
     videoTitle: string;        // 短视频平台标题，简短吸引人，不超过30字
     videoDescription: string;  // 短视频简介，不超过100字，概括核心观点
     segments: Array<{
       id: string;
       type: "avatar" | "broll";
       text: string;
       durationHint: number;
       voiceStyle?: string;
       slideData?: SlideData;  // broll 段必须有
     }>;
   }

2. 脚本结构规则：
   - 提炼文章 3-5 个核心观点
   - avatar 段和 broll 段交替出现，保持节奏感
   - 以 avatar 段开头（开场白），以 avatar 段结尾（总结/呼吁）
   - 每段口播文字 15-30 秒（中文约 45-90 字）
   - 总时长控制在 60-120 秒
   - 重要：每个 segment 都必须有 text 字段（口播文字），包括 broll 段！broll 段的 text 是画外音旁白

3. 口播文字风格：
   - 口语化，像在和朋友聊天
   - 开头要有吸引力（hook）
   - 结尾要有行动号召（CTA）

4. B-roll 幻灯片数据（slideData）：
   broll 段需要提供 slideData 字段，用于渲染动画幻灯片。支持 5 种布局：

   a) bullet-list（要点列表）— 适合列举多个要点
      { "layout": "bullet-list", "title": "标题", "items": [{"icon": "emoji", "text": "内容"}] }

   b) big-number（大数字）— 适合展示数据/统计
      { "layout": "big-number", "title": "标题", "number": 数字, "unit": "单位", "subtitle": "说明" }

   c) comparison（对比）— 适合 Before/After 或两方对比
      { "layout": "comparison", "title": "标题", "left": {"label": "左标签", "items": ["项1"]}, "right": {"label": "右标签", "items": ["项1"]} }

   d) quote（引用）— 适合金句或重要观点
      { "layout": "quote", "quote": "引用内容", "attribution": "出处(可选)" }

   e) timeline（时间线）— 适合展示流程或演变
      { "layout": "timeline", "title": "标题", "nodes": [{"label": "节点标题", "description": "说明(可选)"}] }

   可选颜色主题：{ "theme": {"accent": "#颜色值"} }
   - bullet-list 的 items 建议 3-5 条，每条控制在 15 字以内
   - big-number 的数字要有冲击力
   - comparison 每边 2-4 条
   - quote 控制在 50 字以内
   - timeline 建议 3-5 个节点
   - 所有文字内容用中文

5. segment id 格式：seg-01, seg-02, ...

6. 布局选择建议：
   - 不同 broll 段尽量使用不同的 layout 类型，增加视觉多样性
   - 根据内容语义选择最合适的布局

只输出 JSON，不要其他内容。`;

export async function generateScript(
  articleText: string,
  apiKey: string
): Promise<VideoScript> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `请将以下文章转换为口播短视频脚本：\n\n${articleText}`
  );

  const text = result.response.text();

  // Extract JSON from response (handle possible markdown code blocks)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from Gemini response");

  const script: VideoScript = JSON.parse(jsonMatch[1]);

  // Validate basic structure
  if (!script.segments || script.segments.length === 0) {
    throw new Error("Script has no segments");
  }
  for (const seg of script.segments) {
    if (!seg.id || !seg.type || !seg.text) {
      throw new Error(`Invalid segment: ${JSON.stringify(seg)}`);
    }
    if (seg.type === "broll") {
      if (!seg.slideData) {
        throw new Error(`B-roll segment ${seg.id} missing slideData`);
      }
      if (!VALID_LAYOUTS.includes(seg.slideData.layout)) {
        throw new Error(`B-roll segment ${seg.id} has invalid layout: ${seg.slideData.layout}`);
      }
    }
  }

  return script;
}
