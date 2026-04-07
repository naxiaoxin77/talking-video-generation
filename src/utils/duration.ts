// src/utils/duration.ts
// Thin ffprobe wrapper for getting video/audio duration

import { execFile } from "child_process";
import { promisify } from "util";
import path from "path";
import fs from "fs";

const execFileAsync = promisify(execFile);

function findFfprobe(): string {
  if (process.platform === "win32") {
    const wingetPath = path.join(
      process.env.LOCALAPPDATA || "",
      "Microsoft", "WinGet", "Packages",
      "Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe",
      "ffmpeg-8.1-full_build", "bin",
      "ffprobe.exe"
    );
    if (fs.existsSync(wingetPath)) return wingetPath;
  }
  return "ffprobe";
}

const FFPROBE = findFfprobe();

export async function getMediaDuration(filePath: string): Promise<number> {
  const { stdout } = await execFileAsync(FFPROBE, [
    "-v", "quiet",
    "-show_entries", "format=duration",
    "-of", "csv=p=0",
    filePath,
  ]);
  const duration = parseFloat(stdout.trim());
  if (isNaN(duration)) throw new Error(`Could not parse duration from: ${filePath}`);
  return duration;
}
