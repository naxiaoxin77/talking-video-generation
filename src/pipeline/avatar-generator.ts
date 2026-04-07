// src/pipeline/avatar-generator.ts
// Single TTS → audio → avatar4WithAudio → video pipeline

import path from "path";
import fs from "fs";
import { TopviewClient, downloadFile } from "../utils/topview.js";

export interface AvatarGenerationResult {
  audioPath: string;          // relative to public/ (for Remotion staticFile)
  avatarVideoPath: string;    // relative to public/ (for Remotion staticFile)
  absoluteAudioPath: string;  // absolute path (for ffprobe / Gemini)
  absoluteVideoPath: string;  // absolute path (for ffprobe)
}

export async function generateAvatarVideo(
  text: string,
  topview: TopviewClient,
  config: {
    avatarPhotoPath: string;
    voiceId: string;
    boardId: string;
    publicDir: string;
    ttsSpeed?: number;
    ttsEmotion?: string;
    captionId?: string;
  }
): Promise<AvatarGenerationResult> {
  const ttsDir = path.join(config.publicDir, "tts");
  const avatarsDir = path.join(config.publicDir, "avatars");
  fs.mkdirSync(ttsDir, { recursive: true });
  fs.mkdirSync(avatarsDir, { recursive: true });

  // ── Phase 1: TTS ──────────────────────────────────────────────
  console.log("  [TTS] Submitting text-to-voice task...");
  const ttsTaskId = await topview.submitText2Voice(text, config.voiceId, {
    speed: config.ttsSpeed,
    emotion: config.ttsEmotion || undefined,
    boardId: config.boardId,
  });
  console.log(`  [TTS] TaskId: ${ttsTaskId}`);

  const { audioUrl } = await topview.queryText2Voice(ttsTaskId, 300);
  const absoluteAudioPath = path.join(ttsDir, "main.mp3");
  await downloadFile(audioUrl, absoluteAudioPath);
  console.log(`  [TTS] Audio downloaded: ${absoluteAudioPath}`);

  // ── Phase 2: Avatar (audio-driven lip-sync) ────────────────────
  console.log("  [Avatar] Submitting avatar4 task...");
  const avatarTaskId = await topview.submitAvatar4WithAudio(
    absoluteAudioPath,
    config.avatarPhotoPath,
    config.boardId,
    config.captionId
  );
  console.log(`  [Avatar] TaskId: ${avatarTaskId}`);

  let videoUrl: string;
  try {
    ({ videoUrl } = await topview.queryAvatar4(avatarTaskId, 600));
  } catch {
    console.log("  [Avatar] First poll timed out, retrying with extended timeout...");
    ({ videoUrl } = await topview.queryAvatar4(avatarTaskId, 1200));
  }

  const absoluteVideoPath = path.join(avatarsDir, "main.mp4");
  await downloadFile(videoUrl, absoluteVideoPath);
  console.log(`  [Avatar] Video downloaded: ${absoluteVideoPath}`);

  return {
    audioPath: "tts/main.mp3",
    avatarVideoPath: "avatars/main.mp4",
    absoluteAudioPath,
    absoluteVideoPath,
  };
}
