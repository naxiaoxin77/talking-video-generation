import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";
import type { EnrichedSegment } from "./types.js";

const execFileAsync = promisify(execFile);

async function getVideoDuration(videoPath: string): Promise<number> {
  const { stdout } = await execFileAsync("ffprobe", [
    "-v", "quiet",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    videoPath,
  ]);
  return parseFloat(stdout.trim());
}

async function extractAudio(videoPath: string, audioPath: string): Promise<void> {
  const dir = path.dirname(audioPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  await execFileAsync("ffmpeg", [
    "-i", videoPath,
    "-vn",
    "-acodec", "libmp3lame",
    "-q:a", "2",
    "-y",
    audioPath,
  ]);
}

export async function prepareResources(
  segments: EnrichedSegment[],
  publicDir: string
): Promise<EnrichedSegment[]> {
  const audioDir = path.join(publicDir, "audio");

  console.log("Preparing resources (duration + audio extraction)...");

  for (const segment of segments) {
    if (!segment.avatarVideoPath) continue;

    // avatarVideoPath is relative to public/, resolve to absolute for ffprobe/ffmpeg
    const absoluteVideoPath = path.join(publicDir, segment.avatarVideoPath);

    // Get avatar video duration
    const duration = await getVideoDuration(absoluteVideoPath);
    segment.avatarDuration = duration;
    console.log(`  [${segment.id}] Duration: ${duration.toFixed(1)}s`);

    // For broll segments, extract audio from avatar video
    if (segment.type === "broll") {
      const relativeAudioPath = `audio/${segment.id}.mp3`;
      const absoluteAudioPath = path.join(audioDir, `${segment.id}.mp3`);
      await extractAudio(absoluteVideoPath, absoluteAudioPath);
      segment.audioPath = relativeAudioPath;
      console.log(`  [${segment.id}] Audio extracted`);
    }
  }

  return segments;
}
