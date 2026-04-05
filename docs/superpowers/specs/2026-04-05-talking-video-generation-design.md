# Talking Video Generation - Design Spec

## Overview

A Node.js/TypeScript pipeline that converts articles into short talking-head videos (9:16 vertical) with digital avatar narration and B-roll cutaways.

**Input:** Article text
**Output:** 60-120 second vertical video (MP4, 9:16)

## Architecture

### Pipeline Flow

```
Article Text
     |
     v
[Step 1] Script Generation (Claude API)
     |  Output: VideoScript JSON (alternating avatar/broll segments)
     v
[Step 2] Parallel Resource Generation
     |-- ALL segments -> Topview avatar4 (photo + text + voice -> talking video)
     |      (every segment gets an avatar video for consistent audio)
     |-- B-roll segments -> Topview ai_image (prompt -> 9:16 image)
     |
     |  Strategy: Use avatar4 `submit` to batch-submit all tasks,
     |  then poll all taskIds in parallel until completion.
     v
[Step 3] Remotion Composition
     |  Avatar segments: play avatar4 video directly (video + audio)
     |  B-roll segments: show AI image with Ken Burns + avatar4 audio track
     |  Overlay: subtitles on all segments, transitions between segments
     v
[Step 4] Remotion Render
     |  Output: 1080x1920 (9:16) MP4, 30fps
     v
Final Video
```

### Technology Stack

| Component | Tool | Notes |
|-----------|------|-------|
| Script generation | Claude API (Anthropic SDK) | Article -> structured script JSON |
| Avatar / TTS | Topview avatar4 | Built-in TTS, generates talking-head video |
| B-roll images | Topview ai_image | Text-to-image generation |
| B-roll animation | Remotion | Ken Burns effect (zoom + pan) |
| Subtitles | Remotion (@remotion/captions) | TikTok-style word highlighting |
| Transitions | Remotion (@remotion/transitions) | Fade/slide between segments |
| Final render | Remotion | Renders complete 9:16 video |
| Topview API calls | Python scripts via child_process | Topview Skill scripts at C:\Users\nat99\.claude\plugins\topview-skill\scripts\ |

## Data Structures

### VideoScript (Core Data)

```typescript
interface VideoScript {
  title: string;
  totalDurationEstimate: number;
  segments: Segment[];
}

interface Segment {
  id: string;
  type: "avatar" | "broll";
  text: string;                // Narration text (also used for subtitles)
  durationHint: number;        // Estimated seconds
  voiceStyle?: string;         // Voice tone hint (avatar segments)
  brollPrompt?: string;        // Image description in English (broll segments)
  brollStyle?: string;         // Visual style hint (broll segments)
}
```

### EnrichedSegment (After Resource Generation)

```typescript
interface EnrichedSegment extends Segment {
  avatarVideoUrl?: string;     // Topview-generated talking video URL
  avatarVideoPath?: string;    // Downloaded local path
  avatarDuration?: number;     // Actual video duration in seconds
  brollImagePath?: string;     // Generated image local path
  brollDuration?: number;      // Calculated display duration
}
```

### CompositionProps (Remotion Input)

```typescript
interface CompositionProps {
  segments: EnrichedSegment[];
  fps: number;                 // 30
  width: number;               // 1080
  height: number;              // 1920
}
```

## Module Details

### 1. Script Generator (`src/pipeline/script-generator.ts`)

**Responsibilities:**
- Call Claude API with article text
- Return structured VideoScript JSON

**Claude Prompt Strategy:**
- Analyze article for 3-5 key points
- Generate alternating avatar/broll segments for rhythm
- Each segment: 15-30 seconds of narration
- B-roll prompts: specific, visually impactful descriptions in English
- Total duration: 60-120 seconds
- Output must be valid JSON matching VideoScript interface

### 2. Avatar Generator (`src/pipeline/avatar-generator.ts`)

**Responsibilities:**
- For ALL segments (both avatar and broll), call Topview avatar4 to generate talking video
- This ensures every segment has consistent audio narration
- Download generated videos to local path
- Extract actual video duration via ffprobe

**Implementation:**
1. Batch submit: call `python avatar4.py submit --text <script> --image <avatar_photo> --voice <voice_id> --board-id <id>` for each segment
2. Collect all taskIds
3. Poll all tasks in parallel: `python avatar4.py query --task-id <id> --timeout 600`
4. Download completed videos to `public/avatars/` directory
5. Extract duration via ffprobe

**Required Parameters:**
- `--image`: Avatar photo path (user provides once, reused for all segments)
- `--voice`: Voice ID (required! Use `voice.py list --language zh-CN` to discover available voices during setup)
- `--text`: Segment narration text
- `--board-id`: Topview board ID

**Configuration:**
- Avatar photo path (user provides once)
- Voice ID (must be configured before first run; stored in config)
- Python executable path (platform-dependent: `python` on Windows, `python3` on Unix)

### 3. B-roll Generator (`src/pipeline/broll-generator.ts`)

**Responsibilities:**
- For each "broll" segment, call Topview ai_image to generate B-roll image
- Download generated image to local path
- Duration is determined by the corresponding avatar4 video (not estimated)

**Implementation:**
- Execute `python ai_image.py run --type text2image --prompt <broll_prompt> --aspect-ratio 9:16 --model "Nano Banana 2"` via child_process
- Default model: "Nano Banana 2" (best all-round quality, supports 9:16)
- Download image to `public/broll/` directory
- B-roll display duration = corresponding avatar4 video duration (audio drives timing)

### 4. Remotion Composition (`src/remotion/TalkingVideo.tsx`)

**Structure:**
```
<Composition>
  <Series>
    {segments.map(segment =>
      segment.type === "avatar"
        ? <AvatarSegment video={segment.avatarVideoPath} />
        : <BrollSegment image={segment.brollImagePath} duration={segment.brollDuration} />
    )}
  </Series>
  <Subtitles segments={segments} />  // Overlay on all segments
</Composition>
```

**Components:**

- **AvatarSegment:** `<OffthreadVideo>` playing the avatar4 output video (both video and audio tracks), full-screen 9:16
- **BrollSegment:** `<Img>` with Ken Burns animation using `spring()` (slow zoom + pan) + `<Audio>` from the corresponding avatar4 video's audio track. The avatar4 video is generated for every segment, but for B-roll segments only the audio is used while the visual is the AI-generated image.
- **Subtitles:** Bottom-positioned text overlay using sentence-level display from the script JSON. Each segment's `text` field is displayed for the segment's duration. Simple centered text with background shadow for readability.
- **Transitions:** `@remotion/transitions` fade effect between segments (0.5s)

**Dynamic Duration:**
- Use `calculateMetadata` to compute total frames from actual segment durations
- All segment durations are determined by their avatar4 video duration (the audio is the source of truth for timing)

### 5. Topview Utility (`src/utils/topview.ts`)

**Responsibilities:**
- Wrapper around Topview Python script execution
- Handle child_process spawning, output parsing, error handling
- File download utility

**Key Functions:**
```typescript
// Detect python executable (python on Windows, python3 on Unix)
function getPythonCommand(): string

// Submit avatar4 task (non-blocking), returns taskId
async function submitAvatar4(text: string, imagePath: string, voiceId: string, boardId: string): Promise<string>

// Poll avatar4 task until completion, returns video URL
async function queryAvatar4(taskId: string, timeout?: number): Promise<{videoUrl: string}>

// Generate image via ai_image
async function runAiImage(prompt: string, aspectRatio: string, model?: string): Promise<{imageUrl: string}>

// Get default board ID
async function getBoardId(): Promise<string>

// Download file from URL to local path
async function downloadFile(url: string, outputPath: string): Promise<string>

// List available voices
async function listVoices(language?: string): Promise<Voice[]>
```

## Project Structure

```
talking-video-generation/
├── package.json
├── tsconfig.json
├── remotion.config.ts
├── src/
│   ├── index.ts                    # CLI entry, orchestrates pipeline
│   ├── pipeline/
│   │   ├── script-generator.ts     # Claude API -> structured script
│   │   ├── avatar-generator.ts     # Topview avatar4 caller
│   │   ├── broll-generator.ts      # Topview ai_image caller
│   │   └── types.ts                # Shared type definitions
│   ├── remotion/
│   │   ├── Root.tsx                # Remotion entry
│   │   ├── TalkingVideo.tsx        # Main composition
│   │   ├── components/
│   │   │   ├── AvatarSegment.tsx   # Talking video segment
│   │   │   ├── BrollSegment.tsx    # B-roll + Ken Burns
│   │   │   └── Subtitles.tsx       # Subtitle component
│   │   └── render.ts              # Remotion render logic
│   └── utils/
│       ├── topview.ts             # Topview API wrapper
│       └── config.ts              # Configuration management
├── public/                        # Temporary resource files
└── output/                        # Output videos
```

## Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.39",
    "@remotion/cli": "^4",
    "@remotion/renderer": "^4",
    "@remotion/bundler": "^4",
    "@remotion/captions": "^4",
    "@remotion/transitions": "^4",
    "remotion": "^4",
    "react": "^19",
    "react-dom": "^19",
    "zod": "^3"
  },
  "devDependencies": {
    "typescript": "^5",
    "@types/node": "^22",
    "@types/react": "^19",
    "tsx": "^4"
  }
}
```

## Configuration

Environment variables (`.env`):
```
ANTHROPIC_API_KEY=sk-...        # Claude API key
TOPVIEW_SCRIPTS_DIR=C:\Users\nat99\.claude\plugins\topview-skill\scripts
TOPVIEW_API_KEY=sk-...          # Topview API key (auto-saved in ~/.topview/credentials.json after login)
AVATAR_PHOTO_PATH=./assets/avatar.jpg   # Default avatar photo
AVATAR_VOICE_ID=                # Topview voice ID (use `voice.py list` to find)
```

**First-time setup:**
1. Run `python scripts/auth.py login` to authenticate with Topview (already done)
2. Run `python scripts/voice.py list --language zh-CN` to find a suitable voice ID
3. Set `AVATAR_VOICE_ID` in `.env`
4. Place avatar photo at `AVATAR_PHOTO_PATH`

## CLI Usage

```bash
# Generate video from article
npx tsx src/index.ts --input article.txt --output output/video.mp4

# With custom avatar photo
npx tsx src/index.ts --input article.txt --avatar ./my-photo.jpg --output output/video.mp4
```

## Error Handling

- **Topview timeout:** avatar4 generation can take 2-5 minutes per segment. Use `submit` + `query` pattern with 600s timeout. If query times out, retry with 1200s.
- **Topview task failure:** If task status is "fail", retry once with same parameters. If still fails, log error and abort pipeline.
- **Resource generation failure:** Retry once, then skip segment and log warning.
- **Remotion render failure:** Check for missing resources, provide clear error message.
- **Audio extraction:** For B-roll segments, audio needs to be extracted from avatar4 video. Use ffmpeg to extract audio track to separate file for Remotion `<Audio>` component.

## Resource Cleanup

After successful render (or on pipeline failure):
- Remove downloaded avatar videos from `public/avatars/`
- Remove downloaded B-roll images from `public/broll/`
- Remove extracted audio files from `public/audio/`
- Keep output video in `output/`

## Verification Plan

1. **Unit test script generation:** Verify Claude API returns valid VideoScript JSON
2. **Integration test Topview:** Generate one avatar4 segment, verify video downloads
3. **Remotion preview:** `npx remotion preview` with sample data to visually inspect composition
4. **End-to-end:** Run full pipeline with a short article (~200 words), verify output video
