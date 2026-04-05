# Talking Video Generation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a CLI pipeline that converts articles into 9:16 talking-head short videos with digital avatar narration and B-roll cutaways.

**Architecture:** Claude API generates a structured script from articles, Topview avatar4 generates talking-head video for every segment (ensuring consistent audio), Topview ai_image generates B-roll images, and Remotion composes everything into a final video with subtitles and transitions.

**Tech Stack:** TypeScript, Remotion 4, Anthropic SDK, Topview AI (Python scripts via child_process), FFmpeg (audio extraction)

**Spec:** `docs/superpowers/specs/2026-04-05-talking-video-generation-design.md`

---

## File Structure

```
talking-video-generation/
├── package.json
├── tsconfig.json
├── remotion.config.ts
├── .env                            # API keys and config
├── .gitignore
├── src/
│   ├── index.ts                    # CLI entry, orchestrates full pipeline
│   ├── pipeline/
│   │   ├── types.ts                # Shared type definitions (VideoScript, Segment, etc.)
│   │   ├── script-generator.ts     # Claude API -> structured script JSON
│   │   ├── avatar-generator.ts     # Topview avatar4 batch submit + poll
│   │   ├── broll-generator.ts      # Topview ai_image generation
│   │   └── resource-preparer.ts    # Download files, extract audio via ffmpeg
│   ├── remotion/
│   │   ├── Root.tsx                # Remotion entry, registers compositions
│   │   ├── TalkingVideo.tsx        # Main composition with calculateMetadata
│   │   ├── components/
│   │   │   ├── AvatarSegment.tsx   # Full-screen avatar video playback
│   │   │   ├── BrollSegment.tsx    # Image + Ken Burns + audio
│   │   │   └── Subtitles.tsx       # Sentence-level subtitle overlay
│   │   └── render.ts              # Remotion bundling + rendering
│   └── utils/
│       ├── topview.ts             # Topview Python script executor
│       └── config.ts              # Environment config loader
├── public/                        # Static assets for Remotion
│   └── .gitkeep
└── output/                        # Rendered videos
    └── .gitkeep
```

---

### Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `remotion.config.ts`
- Create: `.env`
- Create: `.gitignore`
- Create: `public/.gitkeep`
- Create: `output/.gitkeep`

- [ ] **Step 1: Initialize git repo**

```bash
cd E:/cc/talking-video-generation
git init
```

- [ ] **Step 2: Create package.json**

```json
{
  "name": "talking-video-generation",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "scripts": {
    "generate": "tsx src/index.ts",
    "preview": "remotion preview src/remotion/Root.tsx",
    "render": "remotion render src/remotion/Root.tsx TalkingVideo"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39.0",
    "@remotion/cli": "^4.0.0",
    "@remotion/renderer": "^4.0.0",
    "@remotion/bundler": "^4.0.0",
    "@remotion/captions": "^4.0.0",
    "@remotion/transitions": "^4.0.0",
    "remotion": "^4.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "zod": "^3.24.0",
    "dotenv": "^16.4.0"
  },
  "devDependencies": {
    "typescript": "^5.7.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "tsx": "^4.19.0"
  }
}
```

- [ ] **Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "jsx": "react-jsx",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "resolveJsonModule": true,
    "declaration": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

- [ ] **Step 4: Create remotion.config.ts**

```ts
import { Config } from "@remotion/cli/config";

Config.setVideoImageFormat("jpeg");
Config.setOverwriteOutput(true);
```

- [ ] **Step 5: Create .env**

```
ANTHROPIC_API_KEY=
TOPVIEW_SCRIPTS_DIR=C:\\Users\\nat99\\.claude\\plugins\\topview-skill\\scripts
AVATAR_PHOTO_PATH=./assets/avatar.jpg
AVATAR_VOICE_ID=
```

- [ ] **Step 6: Create .gitignore**

```
node_modules/
dist/
.env
public/avatars/
public/broll/
public/audio/
output/*.mp4
```

- [ ] **Step 7: Create directory placeholders**

```bash
mkdir -p public output assets
touch public/.gitkeep output/.gitkeep
```

- [ ] **Step 8: Install dependencies**

Run: `npm install`

- [ ] **Step 9: Commit**

```bash
git add package.json tsconfig.json remotion.config.ts .env .gitignore public/.gitkeep output/.gitkeep
git commit -m "chore: scaffold project with Remotion + Anthropic SDK"
```

---

### Task 2: Type Definitions

**Files:**
- Create: `src/pipeline/types.ts`

- [ ] **Step 1: Create type definitions**

```typescript
// src/pipeline/types.ts

export interface VideoScript {
  title: string;
  totalDurationEstimate: number;
  segments: Segment[];
}

export interface Segment {
  id: string;
  type: "avatar" | "broll";
  text: string;
  durationHint: number;
  voiceStyle?: string;
  brollPrompt?: string;
  brollStyle?: string;
}

export interface EnrichedSegment extends Segment {
  // Generated by avatar-generator (all segments get an avatar video)
  avatarVideoUrl?: string;
  avatarVideoPath?: string;   // relative to public/, e.g. "avatars/seg-01.mp4"
  avatarDuration?: number;
  // Generated by broll-generator (broll segments only)
  brollImageUrl?: string;
  brollImagePath?: string;    // relative to public/, e.g. "broll/seg-02.jpg"
  // Extracted audio path (for broll segments, audio from avatar video)
  audioPath?: string;         // relative to public/, e.g. "audio/seg-02.mp3"
}

export interface CompositionProps {
  segments: EnrichedSegment[];
  fps: number;
  width: number;
  height: number;
}

export interface PipelineConfig {
  anthropicApiKey: string;
  topviewScriptsDir: string;
  avatarPhotoPath: string;
  avatarVoiceId: string;
  outputDir: string;
  publicDir: string;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pipeline/types.ts
git commit -m "feat: add core type definitions"
```

---

### Task 3: Config Loader

**Files:**
- Create: `src/utils/config.ts`

- [ ] **Step 1: Create config loader**

```typescript
// src/utils/config.ts

import { config } from "dotenv";
import path from "path";
import type { PipelineConfig } from "../pipeline/types.js";

config();

export function loadConfig(): PipelineConfig {
  const required = (key: string): string => {
    const value = process.env[key];
    if (!value) throw new Error(`Missing required env var: ${key}`);
    return value;
  };

  return {
    anthropicApiKey: required("ANTHROPIC_API_KEY"),
    topviewScriptsDir: required("TOPVIEW_SCRIPTS_DIR"),
    avatarPhotoPath: required("AVATAR_PHOTO_PATH"),
    avatarVoiceId: required("AVATAR_VOICE_ID"),
    outputDir: path.resolve("output"),
    publicDir: path.resolve("public"),
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/config.ts
git commit -m "feat: add environment config loader"
```

---

### Task 4: Topview Utility Wrapper

**Files:**
- Create: `src/utils/topview.ts`

- [ ] **Step 1: Create Topview wrapper**

This module wraps Topview Python script execution via child_process. Key details from the actual Topview CLI:
- `avatar4.py run --image <path> --text <text> --voice <id> --board-id <id> --json` — submit + poll, returns JSON
- `avatar4.py submit --image <path> --text <text> --voice <id> --board-id <id> --json` — submit only, returns taskId
- `avatar4.py query --task-id <id> --timeout 600 --json` — poll until done
- `ai_image.py run --type text2image --prompt <text> --model "Nano Banana 2" --aspect-ratio 9:16 --json` — generate image
- `board.py list --default -q` — get default board ID
- `voice.py list --language zh-CN --json` — list voices

```typescript
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
    // ai_image returns array of image URLs
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
```

- [ ] **Step 2: Commit**

```bash
git add src/utils/topview.ts
git commit -m "feat: add Topview Python script wrapper"
```

---

### Task 5: Script Generator (Claude API)

**Files:**
- Create: `src/pipeline/script-generator.ts`

- [ ] **Step 1: Create script generator**

```typescript
// src/pipeline/script-generator.ts

import Anthropic from "@anthropic-ai/sdk";
import type { VideoScript } from "./types.js";

const SYSTEM_PROMPT = `你是一个专业的短视频脚本编剧。你的任务是将文章转换为口播短视频脚本。

输出要求：
1. 输出严格的 JSON 格式，符合以下 TypeScript 接口：
   interface VideoScript {
     title: string;
     totalDurationEstimate: number;
     segments: Array<{
       id: string;
       type: "avatar" | "broll";
       text: string;
       durationHint: number;
       voiceStyle?: string;
       brollPrompt?: string;
       brollStyle?: string;
     }>;
   }

2. 脚本结构规则：
   - 提炼文章 3-5 个核心观点
   - avatar 段和 broll 段交替出现，保持节奏感
   - 以 avatar 段开头（开场白），以 avatar 段结尾（总结/呼吁）
   - 每段口播文字 15-30 秒（中文约 45-90 字）
   - 总时长控制在 60-120 秒

3. 口播文字风格：
   - 口语化，像在和朋友聊天
   - 开头要有吸引力（hook）
   - 结尾要有行动号召（CTA）

4. B-roll 画面描述（brollPrompt）：
   - 用英文写，给 AI 图片生成模型用
   - 要具体、有视觉冲击力
   - 描述主体 + 动作 + 光线 + 构图
   - 风格：现代、清晰、专业

5. segment id 格式：seg-01, seg-02, ...

只输出 JSON，不要其他内容。`;

export async function generateScript(
  articleText: string,
  apiKey: string
): Promise<VideoScript> {
  const client = new Anthropic({ apiKey });

  const message = await client.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4096,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: `请将以下文章转换为口播短视频脚本：\n\n${articleText}`,
      },
    ],
  });

  const text = message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("");

  // Extract JSON from response (handle possible markdown code blocks)
  const jsonMatch = text.match(/```json\s*([\s\S]*?)```/) || text.match(/(\{[\s\S]*\})/);
  if (!jsonMatch) throw new Error("Failed to extract JSON from Claude response");

  const script: VideoScript = JSON.parse(jsonMatch[1]);

  // Validate basic structure
  if (!script.segments || script.segments.length === 0) {
    throw new Error("Script has no segments");
  }
  for (const seg of script.segments) {
    if (!seg.id || !seg.type || !seg.text) {
      throw new Error(`Invalid segment: ${JSON.stringify(seg)}`);
    }
    if (seg.type === "broll" && !seg.brollPrompt) {
      throw new Error(`B-roll segment ${seg.id} missing brollPrompt`);
    }
  }

  return script;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pipeline/script-generator.ts
git commit -m "feat: add Claude API script generator"
```

---

### Task 6: Avatar Generator

**Files:**
- Create: `src/pipeline/avatar-generator.ts`

- [ ] **Step 1: Create avatar generator**

All segments (both avatar and broll) get an avatar4 video generated. This ensures consistent audio for the entire video. For broll segments, only the audio track is used. Uses batch submit + parallel polling for efficiency.

```typescript
// src/pipeline/avatar-generator.ts

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
```

- [ ] **Step 2: Commit**

```bash
git add src/pipeline/avatar-generator.ts
git commit -m "feat: add avatar video generator with Topview avatar4"
```

---

### Task 7: B-roll Generator

**Files:**
- Create: `src/pipeline/broll-generator.ts`

- [ ] **Step 1: Create B-roll generator**

```typescript
// src/pipeline/broll-generator.ts

import type { EnrichedSegment } from "./types.js";
import { TopviewClient, downloadFile } from "../utils/topview.js";
import path from "path";

export async function generateBrollImages(
  segments: EnrichedSegment[],
  topview: TopviewClient,
  config: {
    boardId: string;
    publicDir: string;
  }
): Promise<EnrichedSegment[]> {
  const brollDir = path.join(config.publicDir, "broll");
  const brollSegments = segments.filter((s) => s.type === "broll");

  console.log(`Generating ${brollSegments.length} B-roll images...`);

  for (const segment of brollSegments) {
    if (!segment.brollPrompt) continue;

    console.log(`  [${segment.id}] Generating image: "${segment.brollPrompt.slice(0, 50)}..."`);

    try {
      const { imageUrl } = await topview.runAiImage(
        segment.brollPrompt,
        "9:16",
        "Nano Banana 2",
        config.boardId
      );

      const relativePath = `broll/${segment.id}.jpg`;
      const absolutePath = path.join(brollDir, `${segment.id}.jpg`);
      await downloadFile(imageUrl, absolutePath);

      segment.brollImageUrl = imageUrl;
      segment.brollImagePath = relativePath;

      console.log(`  [${segment.id}] Done`);
    } catch (err) {
      console.error(`  [${segment.id}] B-roll generation failed:`, err);
      // Continue without B-roll — will fall back to showing avatar video
    }
  }

  return segments;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/pipeline/broll-generator.ts
git commit -m "feat: add B-roll image generator with Topview ai_image"
```

---

### Task 8: Resource Preparer (Audio Extraction + Duration)

**Files:**
- Create: `src/pipeline/resource-preparer.ts`

- [ ] **Step 1: Create resource preparer**

This module extracts audio from avatar videos (for B-roll segments) and gets video durations via ffprobe. All paths stored on segments are **relative to `public/`** for Remotion `staticFile()` compatibility.

```typescript
// src/pipeline/resource-preparer.ts

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
```

- [ ] **Step 2: Commit**

```bash
git add src/pipeline/resource-preparer.ts
git commit -m "feat: add resource preparer with ffprobe duration + audio extraction"
```

---

### Task 9: Remotion Components — AvatarSegment

**Files:**
- Create: `src/remotion/components/AvatarSegment.tsx`

- [ ] **Step 1: Create AvatarSegment component**

Uses `OffthreadVideo` from `remotion` package and `staticFile()` for local files in `public/` directory.

```tsx
// src/remotion/components/AvatarSegment.tsx

import React from "react";
import { AbsoluteFill, OffthreadVideo, staticFile } from "remotion";

type Props = {
  videoSrc: string; // relative path under public/, e.g. "avatars/seg-01.mp4"
};

export const AvatarSegment: React.FC<Props> = ({ videoSrc }) => {
  return (
    <AbsoluteFill>
      <OffthreadVideo
        src={staticFile(videoSrc)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
        }}
      />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/remotion/components/AvatarSegment.tsx
git commit -m "feat: add AvatarSegment Remotion component"
```

---

### Task 10: Remotion Components — BrollSegment

**Files:**
- Create: `src/remotion/components/BrollSegment.tsx`

- [ ] **Step 1: Create BrollSegment component**

Uses Ken Burns effect: slow zoom + slight pan. Audio plays from extracted audio file. All paths are relative to `public/` and use `staticFile()`.

```tsx
// src/remotion/components/BrollSegment.tsx

import React from "react";
import { AbsoluteFill, useCurrentFrame, useVideoConfig, interpolate, Img, Audio, staticFile } from "remotion";

type Props = {
  imageSrc: string;  // relative path under public/, e.g. "broll/seg-02.jpg"
  audioSrc: string;  // relative path under public/, e.g. "audio/seg-02.mp3"
};

export const BrollSegment: React.FC<Props> = ({ imageSrc, audioSrc }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();

  // Ken Burns: slow zoom from 1.0 to 1.15 + slight upward pan
  const scale = interpolate(frame, [0, durationInFrames], [1.0, 1.15], {
    extrapolateRight: "clamp",
  });
  const translateY = interpolate(frame, [0, durationInFrames], [0, -20], {
    extrapolateRight: "clamp",
  });

  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ overflow: "hidden" }}>
        <Img
          src={staticFile(imageSrc)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            transform: `scale(${scale}) translateY(${translateY}px)`,
            transformOrigin: "center center",
          }}
        />
      </AbsoluteFill>
      <Audio src={staticFile(audioSrc)} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/remotion/components/BrollSegment.tsx
git commit -m "feat: add BrollSegment with Ken Burns animation"
```

---

### Task 11: Remotion Components — Subtitles

**Files:**
- Create: `src/remotion/components/Subtitles.tsx`

- [ ] **Step 1: Create Subtitles component**

Sentence-level subtitles: each segment's text displays for that segment's duration. Positioned at the bottom of the screen with a semi-transparent background. Timing accounts for TransitionSeries overlap (0.5s fade between segments).

```tsx
// src/remotion/components/Subtitles.tsx

import React from "react";
import { AbsoluteFill, Sequence, useVideoConfig } from "remotion";
import type { EnrichedSegment } from "../../pipeline/types.js";

type Props = {
  segments: EnrichedSegment[];
};

const TRANSITION_DURATION_S = 0.5;

export const Subtitles: React.FC<Props> = ({ segments }) => {
  const { fps } = useVideoConfig();
  const transitionFrames = Math.round(TRANSITION_DURATION_S * fps);

  let currentFrame = 0;

  return (
    <AbsoluteFill>
      {segments.map((segment, index) => {
        const duration = segment.avatarDuration || segment.durationHint;
        const durationInFrames = Math.ceil(duration * fps);
        const from = currentFrame;
        // TransitionSeries overlaps segments, so subtract transition duration
        // for all segments after the first
        currentFrame += durationInFrames - (index < segments.length - 1 ? transitionFrames : 0);

        return (
          <Sequence
            key={segment.id}
            from={from}
            durationInFrames={durationInFrames}
          >
            <AbsoluteFill
              style={{
                justifyContent: "flex-end",
                alignItems: "center",
                padding: "0 40px 120px 40px",
              }}
            >
              <div
                style={{
                  backgroundColor: "rgba(0, 0, 0, 0.6)",
                  borderRadius: 12,
                  padding: "16px 24px",
                  maxWidth: "90%",
                }}
              >
                <div
                  style={{
                    color: "white",
                    fontSize: 36,
                    fontWeight: 600,
                    textAlign: "center",
                    lineHeight: 1.5,
                    textShadow: "0 2px 4px rgba(0,0,0,0.5)",
                  }}
                >
                  {segment.text}
                </div>
              </div>
            </AbsoluteFill>
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/remotion/components/Subtitles.tsx
git commit -m "feat: add sentence-level Subtitles component"
```

---

### Task 12: Remotion Main Composition

**Files:**
- Create: `src/remotion/TalkingVideo.tsx`

- [ ] **Step 1: Create TalkingVideo composition**

Uses `TransitionSeries` to sequence all segments with fade transitions. Subtitles overlay on top.

```tsx
// src/remotion/TalkingVideo.tsx

import React from "react";
import { AbsoluteFill, useVideoConfig } from "remotion";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import type { CompositionProps } from "../pipeline/types.js";
import { AvatarSegment } from "./components/AvatarSegment.js";
import { BrollSegment } from "./components/BrollSegment.js";
import { Subtitles } from "./components/Subtitles.js";

export const TalkingVideo: React.FC<CompositionProps> = ({ segments }) => {
  const { fps } = useVideoConfig();
  const transitionDuration = Math.round(0.5 * fps); // 0.5s fade

  return (
    <AbsoluteFill style={{ backgroundColor: "black" }}>
      <TransitionSeries>
        {segments.map((segment, index) => {
          const duration = segment.avatarDuration || segment.durationHint;
          const durationInFrames = Math.ceil(duration * fps);

          return (
            <React.Fragment key={segment.id}>
              <TransitionSeries.Sequence durationInFrames={durationInFrames}>
                {segment.type === "avatar" || !segment.brollImagePath ? (
                  <AvatarSegment videoSrc={segment.avatarVideoPath!} />
                ) : (
                  <BrollSegment
                    imageSrc={segment.brollImagePath}
                    audioSrc={segment.audioPath!}
                  />
                )}
              </TransitionSeries.Sequence>
              {index < segments.length - 1 && (
                <TransitionSeries.Transition
                  presentation={fade()}
                  timing={linearTiming({ durationInFrames: transitionDuration })}
                />
              )}
            </React.Fragment>
          );
        })}
      </TransitionSeries>

      {/* Subtitles overlay on top of everything */}
      <Subtitles segments={segments} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/remotion/TalkingVideo.tsx
git commit -m "feat: add TalkingVideo main composition with transitions"
```

---

### Task 13: Remotion Root + calculateMetadata

**Files:**
- Create: `src/remotion/Root.tsx`

- [ ] **Step 1: Create Root composition**

Uses `calculateMetadata` to dynamically compute total duration from segment durations.

```tsx
// src/remotion/Root.tsx

import React from "react";
import { Composition } from "remotion";
import type { CalculateMetadataFunction } from "remotion";
import { TalkingVideo } from "./TalkingVideo.js";
import type { CompositionProps } from "../pipeline/types.js";

const FPS = 30;
const WIDTH = 1080;
const HEIGHT = 1920;

const calculateMetadata: CalculateMetadataFunction<CompositionProps> = async ({
  props,
}) => {
  const totalSeconds = props.segments.reduce((sum, seg) => {
    return sum + (seg.avatarDuration || seg.durationHint);
  }, 0);

  // Account for transitions (0.5s each, N-1 transitions)
  const transitionOverlap = Math.max(0, props.segments.length - 1) * 0.5;
  const effectiveDuration = totalSeconds - transitionOverlap;

  return {
    durationInFrames: Math.ceil(effectiveDuration * FPS),
    fps: FPS,
    width: WIDTH,
    height: HEIGHT,
  };
};

// Default props for Remotion Studio preview
const defaultProps: CompositionProps = {
  segments: [],
  fps: FPS,
  width: WIDTH,
  height: HEIGHT,
};

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TalkingVideo"
      component={TalkingVideo}
      durationInFrames={1} // placeholder, overridden by calculateMetadata
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
      defaultProps={defaultProps}
      calculateMetadata={calculateMetadata}
    />
  );
};
```

- [ ] **Step 2: Commit**

```bash
git add src/remotion/Root.tsx
git commit -m "feat: add Remotion Root with dynamic duration calculation"
```

---

### Task 14: Remotion Render Logic

**Files:**
- Create: `src/remotion/render.ts`

- [ ] **Step 1: Create render module**

```typescript
// src/remotion/render.ts

import { bundle } from "@remotion/bundler";
import { renderMedia, selectComposition } from "@remotion/renderer";
import path from "path";
import { fileURLToPath } from "url";
import type { CompositionProps } from "../pipeline/types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export async function renderVideo(
  props: CompositionProps,
  outputPath: string
): Promise<string> {
  console.log("Bundling Remotion project...");
  const bundled = await bundle({
    entryPoint: path.resolve(__dirname, "Root.tsx"),
    webpackOverride: (config) => config,
  });

  console.log("Selecting composition...");
  const composition = await selectComposition({
    serveUrl: bundled,
    id: "TalkingVideo",
    inputProps: props,
  });

  console.log(`Rendering video (${composition.durationInFrames} frames @ ${composition.fps}fps)...`);
  await renderMedia({
    composition,
    serveUrl: bundled,
    codec: "h264",
    outputLocation: outputPath,
    inputProps: props,
  });

  console.log(`Video saved to: ${outputPath}`);
  return outputPath;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/remotion/render.ts
git commit -m "feat: add Remotion render module"
```

---

### Task 15: CLI Entry Point (Orchestrator)

**Files:**
- Create: `src/index.ts`

- [ ] **Step 1: Create CLI entry point**

```typescript
// src/index.ts

import fs from "fs";
import path from "path";
import { loadConfig } from "./utils/config.js";
import { TopviewClient } from "./utils/topview.js";
import { generateScript } from "./pipeline/script-generator.js";
import { generateAvatarVideos } from "./pipeline/avatar-generator.js";
import { generateBrollImages } from "./pipeline/broll-generator.js";
import { prepareResources } from "./pipeline/resource-preparer.js";
import { renderVideo } from "./remotion/render.js";
import type { CompositionProps } from "./pipeline/types.js";

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  const outputIndex = args.indexOf("--output");

  if (inputIndex === -1) {
    console.error("Usage: npx tsx src/index.ts --input <article.txt> [--output <output.mp4>]");
    process.exit(1);
  }

  const inputPath = args[inputIndex + 1];
  const outputPath = outputIndex !== -1
    ? args[outputIndex + 1]
    : path.join("output", `video-${Date.now()}.mp4`);

  if (!fs.existsSync(inputPath)) {
    console.error(`Input file not found: ${inputPath}`);
    process.exit(1);
  }

  const config = loadConfig();
  const topview = new TopviewClient(config.topviewScriptsDir);

  // Step 0: Get Topview board ID
  console.log("\n=== Step 0: Getting Topview board ID ===");
  const boardId = await topview.getBoardId();
  console.log(`Board ID: ${boardId}`);

  // Step 1: Generate script from article
  console.log("\n=== Step 1: Generating script from article ===");
  const articleText = fs.readFileSync(inputPath, "utf-8");
  const script = await generateScript(articleText, config.anthropicApiKey);
  console.log(`Script: "${script.title}" — ${script.segments.length} segments`);

  // Save script for debugging
  const scriptPath = path.join(config.outputDir, "script.json");
  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2), "utf-8");
  console.log(`Script saved to: ${scriptPath}`);

  // Step 2a: Generate avatar videos for ALL segments (batch submit + parallel poll)
  console.log("\n=== Step 2a: Generating avatar videos ===");
  const avatarSegments = await generateAvatarVideos(script.segments, topview, {
    avatarPhotoPath: config.avatarPhotoPath,
    voiceId: config.avatarVoiceId,
    boardId,
    publicDir: config.publicDir,
  });

  // Step 2b: Generate B-roll images (runs after avatar generation completes,
  // because it operates on EnrichedSegments returned by avatar-generator)
  console.log("\n=== Step 2b: Generating B-roll images ===");
  let segments = await generateBrollImages(avatarSegments, topview, {
    boardId,
    publicDir: config.publicDir,
  });

  // Step 3: Prepare resources (extract audio, get durations)
  console.log("\n=== Step 3: Preparing resources ===");
  segments = await prepareResources(segments, config.publicDir);

  // Step 4: Render with Remotion
  console.log("\n=== Step 4: Rendering video ===");
  const compositionProps: CompositionProps = {
    segments,
    fps: 30,
    width: 1080,
    height: 1920,
  };

  const finalPath = await renderVideo(compositionProps, outputPath);

  // Step 5: Cleanup temporary resources
  console.log("\n=== Step 5: Cleaning up temporary files ===");
  const dirsToClean = ["avatars", "broll", "audio"].map(d => path.join(config.publicDir, d));
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
      console.log(`  Removed: ${dir}`);
    }
  }

  console.log(`\nDone! Video saved to: ${finalPath}`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
```

- [ ] **Step 2: Commit**

```bash
git add src/index.ts
git commit -m "feat: add CLI orchestrator entry point"
```

---

### Task 16: Integration Test — End to End

- [ ] **Step 1: Create a test article**

Create `test-article.txt` with a short ~100 word article to test the full pipeline.

```
AI正在改变我们的日常生活。从智能助手到自动驾驶，人工智能技术已经渗透到各个领域。

最近，大语言模型的突破让AI能够理解和生成自然语言，这意味着每个人都可以用自然语言与计算机交流。无论是写代码、写文章还是做数据分析，AI都能成为你的得力助手。

但AI也带来了挑战。我们需要学习如何与AI协作，而不是被AI取代。掌握AI工具的人将在未来的竞争中占据优势。

行动起来，从今天开始学习使用AI，让它成为你的超能力。
```

- [ ] **Step 2: Set up .env with real API keys**

Fill in `ANTHROPIC_API_KEY` and `AVATAR_VOICE_ID` in `.env`.

To find a voice ID, run:
```bash
python C:\Users\nat99\.claude\plugins\topview-skill\scripts\voice.py list --language zh-CN
```
Pick a voice and set `AVATAR_VOICE_ID` in `.env`.

- [ ] **Step 3: Place avatar photo**

Put a portrait photo at `./assets/avatar.jpg`.

- [ ] **Step 4: Run the pipeline**

```bash
npx tsx src/index.ts --input test-article.txt --output output/test-video.mp4
```

- [ ] **Step 5: Verify output**

Check:
1. `output/script.json` — structured script with alternating avatar/broll segments
2. `public/avatars/` — downloaded avatar videos
3. `public/broll/` — downloaded B-roll images
4. `public/audio/` — extracted audio files for broll segments
5. `output/test-video.mp4` — final rendered video

- [ ] **Step 6: Preview in Remotion Studio (optional)**

```bash
npx remotion preview src/remotion/Root.tsx
```

- [ ] **Step 7: Final commit**

```bash
git add test-article.txt
git commit -m "test: add sample article for end-to-end testing"
```

---

## Verification Checklist

- [ ] `npx tsx src/index.ts --input test-article.txt` runs without errors
- [ ] Script JSON has alternating avatar/broll segments
- [ ] All avatar videos download successfully
- [ ] B-roll images download for broll segments
- [ ] Audio extracted from avatar videos for broll segments
- [ ] Remotion renders complete 9:16 video
- [ ] Subtitles visible on all segments
- [ ] Transitions smooth between segments
- [ ] Final video plays correctly in media player
