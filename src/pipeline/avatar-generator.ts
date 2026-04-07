import type { Segment, EnrichedSegment } from "./types.js";
import { TopviewClient, downloadFile } from "../utils/topview.js";
import path from "path";

export async function generateAvatarVideos(
  segments: Segment[],
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
): Promise<EnrichedSegment[]> {
  const avatarsDir = path.join(config.publicDir, "avatars");
  const ttsDir = path.join(config.publicDir, "tts");

  // ===== Phase 1: Batch submit TTS tasks =====
  console.log(`Submitting ${segments.length} TTS tasks (speed=${config.ttsSpeed}, emotion=${config.ttsEmotion})...`);
  const ttsTaskMap: { segment: Segment; taskId: string }[] = [];
  for (const segment of segments) {
    console.log(`  [${segment.id}] TTS: "${segment.text.slice(0, 30)}..."`);
    const taskId = await topview.submitText2Voice(
      segment.text,
      config.voiceId,
      {
        speed: config.ttsSpeed,
        emotion: config.ttsEmotion || undefined,
        boardId: config.boardId,
      }
    );
    ttsTaskMap.push({ segment, taskId });
    console.log(`  [${segment.id}] TTS TaskId: ${taskId}`);
  }

  // ===== Phase 2: Poll TTS tasks in parallel, download audio =====
  console.log(`Polling ${ttsTaskMap.length} TTS tasks...`);
  const ttsResults = await Promise.all(
    ttsTaskMap.map(async ({ segment, taskId }) => {
      const { audioUrl } = await topview.queryText2Voice(taskId, 300);
      const audioPath = path.join(ttsDir, `${segment.id}.mp3`);
      await downloadFile(audioUrl, audioPath);
      console.log(`  [${segment.id}] TTS done`);
      return { segment, audioPath };
    })
  );

  // ===== Phase 3: Batch submit avatar4 with audio =====
  console.log(`Submitting ${ttsResults.length} avatar4 tasks (audio-driven)...`);
  const avatarTaskMap: { segment: Segment; taskId: string }[] = [];
  for (const { segment, audioPath } of ttsResults) {
    const taskId = await topview.submitAvatar4WithAudio(
      audioPath,
      config.avatarPhotoPath,
      config.boardId,
      config.captionId
    );
    avatarTaskMap.push({ segment, taskId });
    console.log(`  [${segment.id}] Avatar TaskId: ${taskId}`);
  }

  // ===== Phase 4: Poll avatar4 tasks in parallel, download videos =====
  console.log(`Polling ${avatarTaskMap.length} avatar4 tasks...`);
  const results = await Promise.all(
    avatarTaskMap.map(async ({ segment, taskId }) => {
      try {
        const { videoUrl } = await topview.queryAvatar4(taskId, 600);
        const relativePath = `avatars/${segment.id}.mp4`;
        const absolutePath = path.join(avatarsDir, `${segment.id}.mp4`);
        await downloadFile(videoUrl, absolutePath);
        console.log(`  [${segment.id}] Avatar done`);
        return { ...segment, avatarVideoUrl: videoUrl, avatarVideoPath: relativePath } as EnrichedSegment;
      } catch (err) {
        console.error(`  [${segment.id}] Failed, retrying with longer timeout...`);
        const { videoUrl } = await topview.queryAvatar4(taskId, 1200);
        const relativePath = `avatars/${segment.id}.mp4`;
        const absolutePath = path.join(avatarsDir, `${segment.id}.mp4`);
        await downloadFile(videoUrl, absolutePath);
        return { ...segment, avatarVideoUrl: videoUrl, avatarVideoPath: relativePath } as EnrichedSegment;
      }
    })
  );

  return results;
}
