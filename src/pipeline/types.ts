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

/** Step 1 output: plain oral script */
export interface OralScript {
  title: string;
  text: string;             // full oral text, no segment splitting
  videoTitle?: string;      // short-video platform title (≤30 chars)
  videoDescription?: string; // platform description (≤100 chars)
}

/** One B-roll overlay with precise timestamps */
export interface OverlayItem {
  start: number;      // seconds
  end: number;        // seconds
  slideData: SlideData;
}

/** Props passed to the Remotion composition */
export interface CompositionProps {
  avatarVideoPath: string;  // relative to public/
  totalDuration: number;    // seconds (from ffprobe)
  overlays: OverlayItem[];
  fps: number;
  width: number;
  height: number;
}

/** Pipeline runtime configuration */
export interface PipelineConfig {
  geminiApiKey: string;
  topviewScriptsDir: string;
  avatarPhotoPath: string;
  avatarVoiceId: string;
  ttsSpeed: number;
  ttsEmotion: string;
  dynamicAvatar: boolean;
  captionId: string;
  outputDir: string;
  publicDir: string;
}
