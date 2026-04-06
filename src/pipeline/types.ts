// ====== Slide Data Types ======

export interface SlideColorTheme {
  background?: string;
  accent?: string;
  text?: string;
}

export interface BulletListSlide {
  layout: "bullet-list";
  title: string;
  items: Array<{ icon?: string; text: string }>;
  theme?: SlideColorTheme;
}

export interface BigNumberSlide {
  layout: "big-number";
  title: string;
  number: number;
  unit?: string;
  subtitle: string;
  theme?: SlideColorTheme;
}

export interface ComparisonSlide {
  layout: "comparison";
  title: string;
  left: { label: string; items: string[] };
  right: { label: string; items: string[] };
  theme?: SlideColorTheme;
}

export interface QuoteSlide {
  layout: "quote";
  title?: string;
  quote: string;
  attribution?: string;
  theme?: SlideColorTheme;
}

export interface TimelineSlide {
  layout: "timeline";
  title: string;
  nodes: Array<{ label: string; description?: string }>;
  theme?: SlideColorTheme;
}

export type SlideData =
  | BulletListSlide
  | BigNumberSlide
  | ComparisonSlide
  | QuoteSlide
  | TimelineSlide;

// ====== Pipeline Types ======

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
  slideData?: SlideData;
  // Legacy fields (kept for backward compat)
  brollPrompt?: string;
  brollStyle?: string;
}

export interface EnrichedSegment extends Segment {
  avatarVideoUrl?: string;
  avatarVideoPath?: string;
  avatarDuration?: number;
  brollImageUrl?: string;
  brollImagePath?: string;
  audioPath?: string;
}

export interface CompositionProps {
  segments: EnrichedSegment[];
  fps: number;
  width: number;
  height: number;
}

export interface PipelineConfig {
  geminiApiKey: string;
  topviewScriptsDir: string;
  avatarPhotoPath: string;
  avatarVoiceId: string;
  ttsSpeed: number;
  ttsEmotion: string;
  dynamicAvatar: boolean;
  outputDir: string;
  publicDir: string;
}
