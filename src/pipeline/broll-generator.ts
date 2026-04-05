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
    }
  }

  return segments;
}
