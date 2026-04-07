// src/pipeline/script-generator.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import type { OralScript } from "./types.js";

const SYSTEM_PROMPT = `你是一个专业的短视频口播脚本编剧。将文章转换为一段连贯的口播文稿。

输出要求：
1. 输出严格的 JSON 格式：
   {
     "title": "内部标题（用于文件命名）",
     "videoTitle": "短视频平台标题，简短吸引人，不超过30字",
     "videoDescription": "短视频简介，不超过100字，概括核心观点",
     "text": "完整口播文稿"
   }

2. 口播文稿规则：
   - 提炼文章 3-5 个核心观点，串联成一段完整叙述
   - 口语化，像在和朋友聊天
   - 开头要有吸引力（hook），结尾要有行动号召（CTA）
   - 总时长控制在 60-120 秒（中文约 180-360 字）
   - 风格：轻松 + 新闻评论

3. 停顿与语气标记：
   - 适当加入停顿标记 <#x#>，x 在 0.01~0.5 之间，不超过 2 个
   - 可适度加入语气标签（仅允许：(laughs),(chuckle),(coughs),(clear-throat),(breath),(pant),(inhale),(exhale),(gasps),(sniffs),(sighs),(lip-smacking),(humming),(hissing),(emm)），总数不超过 3 个

只输出 JSON，不要其他内容。`;

export async function generateOralScript(
  articleText: string,
  apiKey: string
): Promise<OralScript> {
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `请将以下文章转换为口播短视频文稿：\n\n${articleText}`
  );

  const text = result.response.text();
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from Gemini response");

  const script: OralScript = JSON.parse(jsonMatch[1]);
  if (!script.text || script.text.trim().length === 0) {
    throw new Error("Generated script has empty text");
  }

  return script;
}
