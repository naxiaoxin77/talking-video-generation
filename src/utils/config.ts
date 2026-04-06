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
    geminiApiKey: required("GEMINI_API_KEY"),
    topviewScriptsDir: required("TOPVIEW_SCRIPTS_DIR"),
    avatarPhotoPath: required("AVATAR_PHOTO_PATH"),
    avatarVoiceId: required("AVATAR_VOICE_ID"),
    ttsSpeed: parseFloat(process.env.TTS_SPEED || "1.0"),
    ttsEmotion: process.env.TTS_EMOTION || "",
    dynamicAvatar: process.env.DYNAMIC_AVATAR === "true",
    outputDir: path.resolve("output"),
    publicDir: path.resolve("public"),
  };
}
