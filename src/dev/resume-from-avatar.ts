// src/dev/resume-from-avatar.ts
// 从已有的 avatar4 task ID 继续，跳过 TTS 重新提交

import fs from "fs";
import path from "path";
import { loadConfig } from "../utils/config.js";
import { TopviewClient, downloadFile } from "../utils/topview.js";
import { getMediaDuration } from "../utils/duration.js";
import { generateSrt } from "../pipeline/srt-generator.js";
import { generateOverlays } from "../pipeline/overlay-planner.js";
import { renderVideo } from "../remotion/render.js";

async function main() {
  const args = process.argv.slice(2);
  const taskIdIndex = args.indexOf("--task-id");
  const outputIndex = args.indexOf("--output");

  if (taskIdIndex === -1) {
    console.error("Usage: npx tsx src/dev/resume-from-avatar.ts --task-id <taskId> [--output <output.mp4>]");
    process.exit(1);
  }

  const taskId = args[taskIdIndex + 1];
  const outputPath = outputIndex !== -1 ? args[outputIndex + 1] : path.join("output", `video-${Date.now()}.mp4`);

  const config = loadConfig();
  const topview = new TopviewClient(config.topviewScriptsDir);

  const absoluteAudioPath = path.join(config.publicDir, "tts", "main.mp3");
  const absoluteVideoPath = path.join(config.publicDir, "avatars", "main.mp4");

  if (!fs.existsSync(absoluteAudioPath)) {
    console.error(`Audio not found: ${absoluteAudioPath}`);
    process.exit(1);
  }

  // Step 1: 等待 avatar task 完成
  console.log(`\n=== Waiting for avatar task: ${taskId} ===`);
  fs.mkdirSync(path.join(config.publicDir, "avatars"), { recursive: true });

  let videoUrl: string;
  try {
    ({ videoUrl } = await topview.queryAvatar4(taskId, 1800));
  } catch {
    console.log("Still running, extending timeout to 3600s...");
    ({ videoUrl } = await topview.queryAvatar4(taskId, 3600));
  }

  await downloadFile(videoUrl, absoluteVideoPath);
  console.log(`Avatar video downloaded: ${absoluteVideoPath}`);

  // Step 2: 并行 — SRT + 时长
  console.log("\n=== SRT transcription + duration probe (parallel) ===");
  const [srtContent, videoDuration] = await Promise.all([
    generateSrt(absoluteAudioPath, config.geminiApiKey),
    getMediaDuration(absoluteVideoPath),
  ]);
  console.log(`Video duration: ${videoDuration.toFixed(1)}s`);

  fs.mkdirSync(config.outputDir, { recursive: true });
  const srtPath = path.join(config.outputDir, "subtitles.srt");
  fs.writeFileSync(srtPath, srtContent, "utf-8");
  console.log(`SRT saved: ${srtPath}`);

  // Step 3: 叠加计划
  console.log("\n=== Generating overlay plan ===");
  const overlays = await generateOverlays(srtContent, config.geminiApiKey, videoDuration);
  console.log(`${overlays.length} overlays planned`);
  fs.writeFileSync(path.join(config.outputDir, "overlays.json"), JSON.stringify(overlays, null, 2), "utf-8");

  // Step 4: Remotion 渲染
  console.log("\n=== Rendering video ===");
  const finalPath = await renderVideo({
    avatarVideoPath: "avatars/main.mp4",
    totalDuration: videoDuration,
    overlays,
    fps: 30,
    width: 1080,
    height: 1920,
  }, outputPath);

  console.log(`\nDone! Video: ${finalPath}`);
  console.log(`SRT:   ${srtPath}`);
}

main().catch(err => {
  console.error("Failed:", err);
  process.exit(1);
});
