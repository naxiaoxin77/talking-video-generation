// src/utils/topview.ts

import { execFile } from "child_process";
import { promisify } from "util";
import fs from "fs";
import path from "path";
import https from "https";
import http from "http";

const execFileAsync = promisify(execFile);

function getPythonCommand(): string {
  return process.platform === "win32" ? "python" : "python3";
}

export class TopviewClient {
  constructor(private scriptsDir: string) {}

  private scriptPath(name: string): string {
    return path.join(this.scriptsDir, name);
  }

  private async exec(script: string, args: string[]): Promise<string> {
    const { stdout } = await execFileAsync(
      getPythonCommand(),
      [this.scriptPath(script), ...args],
      { timeout: 700_000, maxBuffer: 10 * 1024 * 1024 }
    );
    return stdout.trim();
  }

  async getBoardId(): Promise<string> {
    const output = await this.exec("board.py", ["list", "--default", "-q"]);
    return output.trim();
  }

  async submitAvatar4(
    text: string,
    imagePath: string,
    voiceId: string,
    boardId: string
  ): Promise<string> {
    const output = await this.exec("avatar4.py", [
      "submit",
      "--image", imagePath,
      "--text", text,
      "--voice", voiceId,
      "--board-id", boardId,
      "--json",
    ]);
    const result = JSON.parse(output);
    return result.taskId || output.trim();
  }

  async queryAvatar4(taskId: string, timeout = 600): Promise<{ videoUrl: string }> {
    const output = await this.exec("avatar4.py", [
      "query",
      "--task-id", taskId,
      "--timeout", String(timeout),
      "--json",
    ]);
    const result = JSON.parse(output);
    const videoUrl = result.videoUrl || result.video_url || result.resultUrl;
    if (!videoUrl) throw new Error(`No video URL in avatar4 result: ${output}`);
    return { videoUrl };
  }

  async runAvatar4(
    text: string,
    imagePath: string,
    voiceId: string,
    boardId: string
  ): Promise<{ videoUrl: string }> {
    const output = await this.exec("avatar4.py", [
      "run",
      "--image", imagePath,
      "--text", text,
      "--voice", voiceId,
      "--board-id", boardId,
      "--timeout", "600",
      "--json",
    ]);
    const result = JSON.parse(output);
    const videoUrl = result.videoUrl || result.video_url || result.resultUrl;
    if (!videoUrl) throw new Error(`No video URL in avatar4 result: ${output}`);
    return { videoUrl };
  }

  async runAiImage(
    prompt: string,
    aspectRatio = "9:16",
    model = "Nano Banana 2",
    boardId?: string
  ): Promise<{ imageUrl: string }> {
    const args = [
      "run",
      "--type", "text2image",
      "--prompt", prompt,
      "--model", model,
      "--aspect-ratio", aspectRatio,
      "--json",
    ];
    if (boardId) args.push("--board-id", boardId);
    const output = await this.exec("ai_image.py", args);
    const result = JSON.parse(output);
    const images = result.images || result.resultImages || [];
    const imageUrl = images[0]?.url || images[0]?.imageUrl || images[0];
    if (!imageUrl) throw new Error(`No image URL in ai_image result: ${output}`);
    return { imageUrl: typeof imageUrl === "string" ? imageUrl : imageUrl.url };
  }

  async listVoices(language?: string): Promise<string> {
    const args = ["list"];
    if (language) args.push("--language", language);
    args.push("--json");
    return this.exec("voice.py", args);
  }
}

export async function downloadFile(url: string, outputPath: string): Promise<string> {
  const dir = path.dirname(outputPath);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location!, outputPath).then(resolve).catch(reject);
        return;
      }
      if (response.statusCode !== 200) {
        reject(new Error(`Download failed: ${response.statusCode}`));
        return;
      }
      const file = fs.createWriteStream(outputPath);
      response.pipe(file);
      file.on("finish", () => { file.close(); resolve(outputPath); });
      file.on("error", reject);
    }).on("error", reject);
  });
}
