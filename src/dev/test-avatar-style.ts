/**
 * 单步测试：只跑 avatar-style 生成
 * 用法: npx tsx src/dev/test-avatar-style.ts --input <article.txt>
 */
import fs from "fs";
import path from "path";
import { loadConfig } from "../utils/config.js";
import { TopviewClient } from "../utils/topview.js";
import { generateDynamicAvatar } from "../pipeline/avatar-style-generator.js";

const args = process.argv.slice(2);
const inputIndex = args.indexOf("--input");
const inputPath = inputIndex !== -1 ? args[inputIndex + 1] : "output/test-article.txt";

if (!fs.existsSync(inputPath)) {
  console.error(`文件不存在: ${inputPath}`);
  process.exit(1);
}

const config = loadConfig();
const topview = new TopviewClient(config.topviewScriptsDir);
const articleText = fs.readFileSync(inputPath, "utf-8");

console.log("📖 文章长度:", articleText.length, "字");
console.log("🔗 获取 board ID...");
const boardId = await topview.getBoardId();

console.log("🎨 生成动态 Avatar...");
const avatarPath = await generateDynamicAvatar(
  articleText,
  config.avatarPhotoPath,
  { geminiApiKey: config.geminiApiKey, boardId, publicDir: config.publicDir },
  topview
);

console.log(`\n✅ 完成！图片保存到: ${avatarPath}`);
