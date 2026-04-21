// src/pipeline/avatar-style-generator.ts

import { GoogleGenerativeAI } from "@google/generative-ai";
import path from "path";
import { TopviewClient, downloadFile } from "../utils/topview.js";
import { AVATAR_STYLE_SYSTEM_PROMPT, AVATAR_IMAGE_CONFIG } from "./avatar-style.prompt.js";

/**
 * 根据文章内容生成动态 Avatar 形象。
 * 1. LLM 生成形象描述 prompt
 * 2. Topview image_edit 基于原始照片生成新形象
 * 3. 返回新形象图片路径
 */
export async function generateDynamicAvatar(
  articleText: string,
  originalAvatarPath: string,
  config: {
    geminiApiKey: string;
    boardId: string;
    publicDir: string;
    /** Unique ID to avoid concurrent-run filename collisions */
    runId?: string;
  },
  topview: TopviewClient
): Promise<string> {
  // Step 1: LLM generates avatar style prompt
  console.log("  Generating avatar style prompt...");
  const genAI = new GoogleGenerativeAI(config.geminiApiKey);
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
    systemInstruction: AVATAR_STYLE_SYSTEM_PROMPT,
  });

  const result = await model.generateContent(
    `根据以下文章内容，设计主播的亲历者/旁观者形象：\n\n${articleText}`
  );

  const avatarPrompt = result.response.text().trim();
  console.log(`  Avatar prompt: "${avatarPrompt.slice(0, 80)}..."`);

  // Step 2: Topview image_edit to generate new avatar
  console.log(`  Generating new avatar image (model: ${AVATAR_IMAGE_CONFIG.model})...`);
  const { imageUrl } = await topview.runImageEdit(
    avatarPrompt,
    [path.resolve(originalAvatarPath)],
    {
      model: AVATAR_IMAGE_CONFIG.model,
      aspectRatio: AVATAR_IMAGE_CONFIG.aspectRatio,
      resolution: AVATAR_IMAGE_CONFIG.resolution,
      timeout: AVATAR_IMAGE_CONFIG.timeout,
      boardId: config.boardId,
    }
  );

  // Step 3: Download to public dir
  const filename = config.runId ? `avatar-styled-${config.runId}.jpg` : "avatar-styled.jpg";
  const outputPath = path.join(config.publicDir, filename);
  await downloadFile(imageUrl, outputPath);
  console.log(`  New avatar saved to: ${outputPath}`);

  return outputPath;
}
