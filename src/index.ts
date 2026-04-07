import fs from "fs";
import path from "path";
import { loadConfig } from "./utils/config.js";
import { TopviewClient } from "./utils/topview.js";
import { generateScript } from "./pipeline/script-generator.js";
import { generateDynamicAvatar } from "./pipeline/avatar-style-generator.js";
import { generateAvatarVideos } from "./pipeline/avatar-generator.js";
import { prepareResources } from "./pipeline/resource-preparer.js";
import { renderVideo } from "./remotion/render.js";
import type { CompositionProps } from "./pipeline/types.js";

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  const outputIndex = args.indexOf("--output");
  const useDefaultAvatar = args.includes("--default-avatar");

  if (inputIndex === -1) {
    console.error("Usage: npx tsx src/index.ts --input <article.txt> [--output <output.mp4>] [--default-avatar]");
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
  const script = await generateScript(articleText, config.geminiApiKey);
  console.log(`Script: "${script.title}" — ${script.segments.length} segments`);

  // Save script for debugging
  fs.mkdirSync(config.outputDir, { recursive: true });
  const scriptPath = path.join(config.outputDir, "script.json");
  fs.writeFileSync(scriptPath, JSON.stringify(script, null, 2), "utf-8");
  console.log(`Script saved to: ${scriptPath}`);

  // Step 1.5: Dynamic avatar style (optional)
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
      console.error("  Dynamic avatar generation failed, falling back to default:", err);
      avatarPhotoPath = config.avatarPhotoPath;
    }
  } else {
    console.log(`\n=== Skipping dynamic avatar (${useDefaultAvatar ? "CLI flag" : "DYNAMIC_AVATAR=false"}) ===`);
  }

  // Step 2a: Generate avatar videos for ALL segments
  console.log("\n=== Step 2a: Generating avatar videos ===");
  const avatarSegments = await generateAvatarVideos(script.segments, topview, {
    avatarPhotoPath,
    voiceId: config.avatarVoiceId,
    boardId,
    publicDir: config.publicDir,
    ttsSpeed: config.ttsSpeed,
    ttsEmotion: config.ttsEmotion,
    captionId: config.captionId || undefined,
  });

  // Step 2b: Prepare resources (extract audio, get durations)
  console.log("\n=== Step 2b: Preparing resources ===");
  const segments = await prepareResources(avatarSegments, config.publicDir);

  // Step 3: Render with Remotion
  console.log("\n=== Step 3: Rendering video ===");
  const compositionProps: CompositionProps = {
    segments,
    fps: 30,
    width: 1080,
    height: 1920,
  };

  const finalPath = await renderVideo(compositionProps, outputPath);

  // Step 4: Cleanup temporary resources
  console.log("\n=== Step 4: Cleaning up temporary files ===");
  const dirsToClean = ["avatars", "audio", "tts"].map(d => path.join(config.publicDir, d));
  // Also clean generated avatar
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

  console.log(`\nDone! Video saved to: ${finalPath}`);
}

main().catch((err) => {
  console.error("Pipeline failed:", err);
  process.exit(1);
});
