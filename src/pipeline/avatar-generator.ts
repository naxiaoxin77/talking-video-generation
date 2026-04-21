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
    /** Fallback photo if avatarPhotoPath fails (e.g. AI-generated image rejected by Topview) */
    defaultAvatarPhotoPath?: string;
    voiceId: string;
    boardId: string;
    publicDir: string;
    ttsSpeed?: number;
    ttsEmotion?: string;
    captionId?: string;
    /** Unique ID for this run to isolate temp files (prevents concurrent-run collisions) */
    runId?: string;
  }
): Promise<AvatarGenerationResult> {
  // Use a unique subdir per run to avoid collisions between concurrent processes
  const runId = config.runId || "default";
  const ttsDir = path.join(config.publicDir, "tts", runId);
  const avatarsDir = path.join(config.publicDir, "avatars", runId);
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
  const tryAvatar = async (photoPath: string): Promise<string> => {
    console.log(`  [Avatar] Submitting avatar4 task (photo: ${path.basename(photoPath)})...`);
    const taskId = await topview.submitAvatar4WithAudio(
      absoluteAudioPath, photoPath, config.boardId, config.captionId
    );
    console.log(`  [Avatar] TaskId: ${taskId}`);
    try {
      const { videoUrl } = await topview.queryAvatar4(taskId, 1800);
      return videoUrl;
    } catch {
      console.log("  [Avatar] First poll timed out, retrying with extended timeout...");
      const { videoUrl } = await topview.queryAvatar4(taskId, 3600);
      return videoUrl;
    }
  };

  let videoUrl: string;
  try {
    videoUrl = await tryAvatar(config.avatarPhotoPath);
  } catch (err: any) {
    const fallback = config.defaultAvatarPhotoPath;
    if (fallback && fallback !== config.avatarPhotoPath) {
      console.warn(`  [Avatar] Failed (${err.message}), falling back to default avatar...`);
      videoUrl = await tryAvatar(fallback);
    } else {
      throw err;
    }
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
