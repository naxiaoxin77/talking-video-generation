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
  avatarVideoUrl?: string;
  avatarVideoPath?: string;   // relative to public/, e.g. "avatars/seg-01.mp4"
  avatarDuration?: number;
  brollImageUrl?: string;
  brollImagePath?: string;    // relative to public/, e.g. "broll/seg-02.jpg"
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
  ttsSpeed: number;
  ttsEmotion: string;
  outputDir: string;
  publicDir: string;
}
