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

/** Extract the first valid JSON object from a string that may contain log lines */
function extractJson(output: string): any {
  // Try parsing full output first
  try { return JSON.parse(output); } catch {}
  // Try to find a JSON object in the output
  const match = output.match(/\{[\s\S]*\}/);
  if (match) {
    try { return JSON.parse(match[0]); } catch {}
  }
  throw new Error(`Could not extract JSON from output: ${output.slice(0, 200)}`);
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
    // Extract UUID from output like "Get default 'My First Board' board id: 94dc..."
    const match = output.match(/([0-9a-f]{32})/i);
    if (!match) throw new Error(`Could not extract board ID from: ${output}`);
    return match[1];
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
    try {
      const result = extractJson(output);
      return result.taskId || output.trim();
    } catch {
      return output.trim();
    }
  }

  async queryAvatar4(taskId: string, timeout = 600): Promise<{ videoUrl: string }> {
    const output = await this.exec("avatar4.py", [
      "query",
      "--task-id", taskId,
      "--timeout", String(timeout),
      "--json",
    ]);
    const result = extractJson(output);
    const videoUrl = result.videoUrl || result.video_url || result.resultUrl || result.finishedVideoUrl;
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
    const result = extractJson(output);
    const videoUrl = result.videoUrl || result.video_url || result.resultUrl || result.finishedVideoUrl;
    if (!videoUrl) throw new Error(`No video URL in avatar4 result: ${output}`);
    return { videoUrl };
  }

  async runAiImage(
    prompt: string,
    aspectRatio = "9:16",
    model = "Nano Banana 2",
    boardId?: string,
    resolution = "1K"
  ): Promise<{ imageUrl: string }> {
    const args = [
      "run",
      "--type", "text2image",
      "--prompt", prompt,
      "--model", model,
      "--aspect-ratio", aspectRatio,
      "--resolution", resolution,
      "--timeout", "600",
      "--json",
    ];
    if (boardId) args.push("--board-id", boardId);
    const output = await this.exec("ai_image.py", args);
    const result = extractJson(output);
    const images = result.images || result.resultImages || [];
    const imageUrl = images[0]?.url || images[0]?.imageUrl || images[0]?.filePath || images[0];
    if (!imageUrl) throw new Error(`No image URL in ai_image result: ${output}`);
    return { imageUrl: typeof imageUrl === "string" ? imageUrl : imageUrl.url };
  }

  async submitText2Voice(
    text: string,
    voiceId: string,
    options?: { speed?: number; emotion?: string; boardId?: string }
  ): Promise<string> {
    const args = [
      "submit",
      "--text", text,
      "--voice-id", voiceId,
      "--json",
    ];
    if (options?.speed) args.push("--speed", String(options.speed));
    if (options?.emotion) args.push("--emotion", options.emotion);
    if (options?.boardId) args.push("--board-id", options.boardId);
    const output = await this.exec("text2voice.py", args);
    try {
      const result = JSON.parse(output);
      return result.taskId || output.trim();
    } catch {
      // Output might be a raw task ID string
      return output.trim();
    }
  }

  async queryText2Voice(taskId: string, timeout = 300): Promise<{ audioUrl: string }> {
    const output = await this.exec("text2voice.py", [
      "query",
      "--task-id", taskId,
      "--timeout", String(timeout),
      "--json",
    ]);
    const result = extractJson(output);
    const audioUrl = result.audioUrl || result.audio_url || result.resultUrl || result.voice?.demoAudioUrl;
    if (!audioUrl) throw new Error(`No audio URL in text2voice result: ${output}`);
    return { audioUrl };
  }

  async submitAvatar4WithAudio(
    audioPath: string,
    imagePath: string,
    boardId: string,
    captionId?: string
  ): Promise<string> {
    const args = [
      "submit",
      "--image", imagePath,
      "--audio", audioPath,
      "--board-id", boardId,
      "--json",
    ];
    if (captionId) args.push("--caption", captionId);
    const output = await this.exec("avatar4.py", args);
    try {
      const result = extractJson(output);
      return result.taskId || output.trim();
    } catch {
      return output.trim();
    }
  }

  async runImageEdit(
    prompt: string,
    inputImages: string[],
    options?: {
      model?: string;
      aspectRatio?: string;
      resolution?: string;
      timeout?: number;
      boardId?: string;
    }
  ): Promise<{ imageUrl: string }> {
    const model = options?.model || "Nano Banana 2";
    const args = [
      "run",
      "--type", "image_edit",
      "--prompt", prompt,
      "--model", model,
      "--aspect-ratio", options?.aspectRatio || "auto",
      "--input-images", ...inputImages,
      "--timeout", String(options?.timeout || 600),
      "--json",
    ];
    if (options?.resolution) args.push("--resolution", options.resolution);
    if (options?.boardId) args.push("--board-id", options.boardId);
    const output = await this.exec("ai_image.py", args);
    const result = extractJson(output);
    const images = result.images || result.resultImages || [];
    const imageUrl = images[0]?.url || images[0]?.imageUrl || images[0]?.filePath || images[0];
    if (!imageUrl) throw new Error(`No image URL in image_edit result: ${output}`);
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
