// src/dev/test-script-gen.ts
// 单步测试：只跑口播稿生成

import fs from "fs";
import path from "path";
import { loadConfig } from "../utils/config.js";
import { generateOralScript } from "../pipeline/script-generator.js";

async function main() {
  const args = process.argv.slice(2);
  const inputIndex = args.indexOf("--input");
  if (inputIndex === -1) {
    console.error("Usage: npx tsx src/dev/test-script-gen.ts --input <article.md>");
    process.exit(1);
  }

  const inputPath = args[inputIndex + 1];
  const raw = fs.readFileSync(inputPath, "utf-8");

  // 去掉 YAML frontmatter
  const fmMatch = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
  const articleText = fmMatch ? raw.slice(fmMatch[0].length).trim() : raw.trim();
  console.log(`文章长度: ${articleText.length} 字\n`);

  const config = loadConfig();
  console.log("生成口播稿中...\n");
  const script = await generateOralScript(articleText, config.geminiApiKey);

  console.log("=".repeat(60));
  console.log(`标题:     ${script.title}`);
  console.log(`视频标题: ${script.videoTitle}`);
  console.log(`视频简介: ${script.videoDescription}`);
  console.log("=".repeat(60));
  console.log("\n【口播文稿】\n");
  console.log(script.text);
  console.log("\n" + "=".repeat(60));
  console.log(`字数: ${script.text.length} 字`);

  // 保存到 output/
  fs.mkdirSync("output", { recursive: true });
  const outPath = path.join("output", "test-script.json");
  fs.writeFileSync(outPath, JSON.stringify(script, null, 2), "utf-8");
  console.log(`\n已保存: ${outPath}`);
}

main().catch(err => {
  console.error("失败:", err);
  process.exit(1);
});
