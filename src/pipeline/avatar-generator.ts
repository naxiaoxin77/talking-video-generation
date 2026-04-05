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
  }
): Promise<EnrichedSegment[]> {
  const avatarsDir = path.join(config.publicDir, "avatars");

  console.log(`Submitting ${segments.length} avatar4 tasks...`);

  // Phase 1: Batch submit all tasks
  const taskMap: { segment: Segment; taskId: string }[] = [];
  for (const segment of segments) {
    console.log(`  [${segment.id}] Submitting: "${segment.text.slice(0, 30)}..."`);
    const taskId = await topview.submitAvatar4(
      segment.text,
      config.avatarPhotoPath,
      config.voiceId,
      config.boardId
    );
    taskMap.push({ segment, taskId });
    console.log(`  [${segment.id}] TaskId: ${taskId}`);
  }

  // Phase 2: Poll all tasks in parallel
  console.log(`Polling ${taskMap.length} tasks in parallel...`);
  const results = await Promise.all(
    taskMap.map(async ({ segment, taskId }) => {
      try {
        const { videoUrl } = await topview.queryAvatar4(taskId, 600);
        const relativePath = `avatars/${segment.id}.mp4`;
        const absolutePath = path.join(avatarsDir, `${segment.id}.mp4`);
        await downloadFile(videoUrl, absolutePath);
        console.log(`  [${segment.id}] Done`);
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
