import fs from "fs";
import path from "path";
import { loadConfig } from "./utils/config.js";
import { TopviewClient } from "./utils/topview.js";
import { getMediaDuration } from "./utils/duration.js";
import { generateOralScript } from "./pipeline/script-generator.js";
import { generateDynamicAvatar } from "./pipeline/avatar-style-generator.js";
import { generateAvatarVideo } from "./pipeline/avatar-generator.js";
import { generateSrt } from "./pipeline/srt-generator.js";
import { generateOverlays } from "./pipeline/overlay-planner.js";
import { renderVideo } from "./remotion/render.js";
import type { CompositionProps } from "./pipeline/types.js";

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  const outputIndex = args.indexOf("--output");
  const useDefaultAvatar = args.includes("--default-avatar");
  const keepArtifacts = args.includes("--keep");

  if (inputIndex === -1) {
    console.error("Usage: npx tsx src/index.ts --input <article.txt> [--output <output.mp4>] [--default-avatar] [--keep]");
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

  // ── Step 0: Topview board ID ───────────────────────────────────
  console.log("\n=== Step 0: Getting Topview board ID ===");
  const boardId = await topview.getBoardId();
  console.log(`Board ID: ${boardId}`);

  // ── Step 1: Generate oral script ──────────────────────────────
  console.log("\n=== Step 1: Generating oral script ===");
  const articleText = fs.readFileSync(inputPath, "utf-8");
  const script = await generateOralScript(articleText, config.geminiApiKey);
  console.log(`Script: "${script.title}"`);
  console.log(`Text length: ${script.text.length} chars`);

  fs.mkdirSync(config.outputDir, { recursive: true });
  fs.writeFileSync(
    path.join(config.outputDir, "script.json"),
    JSON.stringify(script, null, 2),
    "utf-8"
  );

  // ── Step 1.5: Dynamic avatar style (optional) ─────────────────
  const enableDynamic = config.dynamicAvatar && !useDefaultAvatar;
  let avatarPhotoPath = config.avatarPhotoPath;

  if (enableDynamic) {
    console.log("\n=== Step 1.5: Generating dynamic avatar style ===");
    try {
      avatarPhotoPath = await generateDynamicAvatar(
        articleText,
        config.avatarPhotoPath,
        { geminiApiKey: config.geminiApiKey, boardId, publicDir: config.publicDir },
        topview
      );
    } catch (err) {
      console.error("  Dynamic avatar failed, using default:", err);
      avatarPhotoPath = config.avatarPhotoPath;
    }
  } else {
    console.log(`\n=== Skipping dynamic avatar (${useDefaultAvatar ? "--default-avatar flag" : "DYNAMIC_AVATAR=false"}) ===`);
  }

  // ── Step 2: TTS → audio → avatar video ────────────────────────
  console.log("\n=== Step 2: Generating TTS audio + avatar video ===");
  const { absoluteAudioPath, absoluteVideoPath, avatarVideoPath } = await generateAvatarVideo(
    script.text,
    topview,
    {
      avatarPhotoPath,
      defaultAvatarPhotoPath: config.avatarPhotoPath, // fallback to original if styled fails
      voiceId: config.avatarVoiceId,
      boardId,
      publicDir: config.publicDir,
      ttsSpeed: config.ttsSpeed,
      ttsEmotion: config.ttsEmotion,
      captionId: config.captionId || undefined,
    }
  );

  // ── Step 3: Parallel — SRT transcription + video duration ─────
  console.log("\n=== Step 3: SRT transcription + duration probe (parallel) ===");
  const [srtContent, videoDuration] = await Promise.all([
    generateSrt(absoluteAudioPath, config.geminiApiKey),
    getMediaDuration(absoluteVideoPath),
  ]);

  console.log(`  Video duration: ${videoDuration.toFixed(1)}s`);

  const srtPath = path.join(config.outputDir, "subtitles.srt");
  fs.writeFileSync(srtPath, srtContent, "utf-8");
  console.log(`  SRT saved: ${srtPath}`);

  // ── Step 4: Overlay plan from SRT ─────────────────────────────
  console.log("\n=== Step 4: Generating overlay plan ===");
  const overlays = await generateOverlays(srtContent, config.geminiApiKey, videoDuration);

  fs.writeFileSync(
    path.join(config.outputDir, "overlays.json"),
    JSON.stringify(overlays, null, 2),
    "utf-8"
  );
  console.log(`  ${overlays.length} overlays planned`);

  // ── Step 5: Render with Remotion ──────────────────────────────
  console.log("\n=== Step 5: Rendering video ===");
  const compositionProps: CompositionProps = {
    avatarVideoPath,
    totalDuration: videoDuration,
    overlays,
    fps: 30,
    width: 1080,
    height: 1920,
  };

  const finalPath = await renderVideo(compositionProps, outputPath);

  // ── Step 6: Save metadata ─────────────────────────────────────
  const metadataPath = path.join(config.outputDir, "metadata.md");
  fs.writeFileSync(
    metadataPath,
    `# ${script.videoTitle || script.title}\n\n${script.videoDescription || ""}\n`,
    "utf-8"
  );
  console.log(`  Metadata saved: ${metadataPath}`);

  // ── Step 7: Cleanup ───────────────────────────────────────────
  if (keepArtifacts) {
    console.log("\n=== Step 7: Keeping intermediate files (--keep) ===");
    console.log(`  TTS audio:    ${absoluteAudioPath}`);
    console.log(`  Avatar video: ${absoluteVideoPath}`);
    console.log(`  SRT:          ${srtPath}`);
    console.log(`  Overlays:     ${path.join(config.outputDir, "overlays.json")}`);
  } else {
    console.log("\n=== Step 7: Cleaning up temporary files ===");
    const dirsToClean = ["avatars", "tts"].map(d => path.join(config.publicDir, d));
    const styledAvatar = path.join(config.publicDir, "avatar-styled.jpg");
    for (const dir of dirsToClean) {
      if (fs.existsSync(dir)) {
        fs.rmSync(dir, { recursive: true, force: true });
        console.log(`  Removed: ${dir}`);
      }
    }
    if (fs.existsSync(styledAvatar)) {
      fs.rmSync(styledAvatar);
      console.log(`  Removed: ${styledAvatar}`);
    }
  }

  console.log(`\nDone! Video: ${finalPath}`);
  console.log(`SRT:   ${srtPath}`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
