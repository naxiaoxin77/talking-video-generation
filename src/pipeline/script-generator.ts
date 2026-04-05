// src/pipeline/script-generator.ts

import Anthropic from "@anthropic-ai/sdk";
import type { VideoScript } from "./types.js";

const SYSTEM_PROMPT = `你是一个专业的短视频脚本编剧。你的任务是将文章转换为口播短视频脚本。

输出要求：
1. 输出严格的 JSON 格式，符合以下 TypeScript 接口：
   interface VideoScript {
     title: string;
     totalDurationEstimate: number;
     segments: Array<{
       id: string;
       type: "avatar" | "broll";
       text: string;
       durationHint: number;
       voiceStyle?: string;
       brollPrompt?: string;
       brollStyle?: string;
     }>;
   }

2. 脚本结构规则：
   - 提炼文章 3-5 个核心观点
   - avatar 段和 broll 段交替出现，保持节奏感
   - 以 avatar 段开头（开场白），以 avatar 段结尾（总结/呼吁）
   - 每段口播文字 15-30 秒（中文约 45-90 字）
   - 总时长控制在 60-120 秒

3. 口播文字风格：
   - 口语化，像在和朋友聊天
   - 开头要有吸引力（hook）
   - 结尾要有行动号召（CTA）

4. B-roll 画面描述（brollPrompt）：
   - 用英文写，给 AI 图片生成模型用
   - 要具体、有视觉冲击力
   - 描述主体 + 动作 + 光线 + 构图
   - 风格：现代、清晰、专业

5. segment id 格式：seg-01, seg-02, ...

只输出 JSON，不要其他内容。`;

export async function generateScript(
  articleText: string,
  apiKey: string
): Promise<VideoScript> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `请将以下文章转换为口播短视频脚本：\n\n${articleText}`,
      },
    ],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Extract JSON from response (handle possible markdown code blocks)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from Claude response");

  const script: VideoScript = JSON.parse(jsonMatch[1]);

  // Validate basic structure
  if (!script.segments || script.segments.length === 0) {
    throw new Error("Script has no segments");
  }
  for (const seg of script.segments) {
    if (!seg.id || !seg.type || !seg.text) {
      throw new Error(`Invalid segment: ${JSON.stringify(seg)}`);
    }
    if (seg.type === "broll" && !seg.brollPrompt) {
      throw new Error(`B-roll segment ${seg.id} missing brollPrompt`);
    }
  }

  return script;
}
