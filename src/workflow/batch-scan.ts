/**
 * 批量扫描工作流
 * 扫描 Obsidian vault 中今日的文章，自动生成口播视频
 *
 * 用法: npx tsx src/workflow/batch-scan.ts [--date 2026-04-06] [--keep]
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { loadConfig } from "../utils/config.js";
import { TopviewClient } from "../utils/topview.js";
import { getMediaDuration } from "../utils/duration.js";
import { generateOralScript } from "../pipeline/script-generator.js";
import { generateDynamicAvatar } from "../pipeline/avatar-style-generator.js";
import { generateAvatarVideo } from "../pipeline/avatar-generator.js";
import { generateSrt } from "../pipeline/srt-generator.js";
import { generateOverlays } from "../pipeline/overlay-planner.js";
import { renderVideo } from "../remotion/render.js";
import type { CompositionProps } from "../pipeline/types.js";

// ====== 常量 ======

const VAULT_BASE = "natebrain/03_Content_Factory/01_Final_Assets";
const SCAN_CATEGORIES = ["深度blog", "短图文"];
const OUTPUT_BASE = "G:\\Other computers\\My MacBook Pro\\brain\\natebrain\\03_Content_Factory\\01_Final_Assets\\短视频";

// 文件名匹配模式：[终稿-图文]-*.md
function buildFilePatternCheck(): string {
  const prefix = "[终稿-图文]-";
  const prefixCodes = [...prefix].map(c => c.charCodeAt(0)).join(",");
  return `f.name.indexOf([${prefixCodes}].map(function(c){return String.fromCharCode(c)}).join(String()))===0&&f.name.endsWith(String.fromCharCode(46,109,100))`;
}
const FILE_CHECK_EXPR = buildFilePatternCheck();

// ====== 类型 ======

interface ArticleInfo {
  vaultPath: string;
  category: string;
  slug: string;
  dynamicAvatar: boolean;
  title: string;
}

interface BatchResult {
  article: ArticleInfo;
  success: boolean;
  videoPath?: string;
  error?: string;
}

// ====== Obsidian CLI 工具函数 ======

function encStr(s: string): string {
  const codes = [...s].map(c => c.charCodeAt(0)).join(",");
  return `[${codes}].map(function(c){return String.fromCharCode(c)}).join(String())`;
}

function obsidianEval(code: string): string {
  const result = execSync(`obsidian eval code="${code}"`, {
    encoding: "utf-8",
    timeout: 15000,
  });
  return result.replace(/^\s*=>\s*/, "").replace(/\n=>\s*/g, "\n").trim();
}

function obsidianRead(vaultPath: string): string {
  const code = `app.vault.read(app.vault.getAbstractFileByPath(${encStr(vaultPath)}))`;
  const raw = obsidianEval(code);
  return raw.startsWith("=> ") ? raw.slice(3) : raw;
}

function obsidianPropertySet(vaultPath: string, key: string, value: string): void {
  const code = `var file=app.vault.getAbstractFileByPath(${encStr(vaultPath)}); if(file){app.fileManager.processFrontMatter(file,function(fm){fm[${encStr(key)}]=${encStr(value)}})}`;
  obsidianEval(code);
}

// ====== 扫描函数 ======

function scanForArticles(today: string): ArticleInfo[] {
  const articles: ArticleInfo[] = [];

  for (const category of SCAN_CATEGORIES) {
    const folderPath = `${VAULT_BASE}/${category}/${today}`;
    console.log(`\n📂 扫描: ${folderPath}`);

    const listCode = `var f=app.vault.getAbstractFileByPath(${encStr(folderPath)}); f&&f.children?f.children.filter(function(c){return !!c.children}).map(function(c){return c.path}).join(String.fromCharCode(10)):String()`;

    let subfolders: string[];
    try {
      const raw = obsidianEval(listCode);
      if (!raw) { console.log(`  ⚠️ 目录不存在或为空`); continue; }
      subfolders = raw.split("\n").filter(Boolean);
    } catch (err: any) {
      console.error(`  ❌ 扫描目录失败: ${err.message}`);
      continue;
    }

    for (const subPath of subfolders) {
      const TAB = "String.fromCharCode(9)";
      const NL = "String.fromCharCode(10)";
      const scanCode = `var folder=app.vault.getAbstractFileByPath(${encStr(subPath)}); var lines=[]; if(folder&&folder.children){folder.children.forEach(function(f){if(f.name&&${FILE_CHECK_EXPR}&&f.name.indexOf(String.fromCharCode(46,98,97,107))===-1){var cache=app.metadataCache.getFileCache(f);var fm=cache?cache.frontmatter:{}; lines.push([f.path,f.name,fm&&fm.video_status||String(),fm&&fm.DYNAMIC_AVATAR||String(),fm&&fm.title||String()].join(${TAB}))}})} lines.join(${NL})`;

      try {
        const raw = obsidianEval(scanCode);
        if (!raw) continue;
        for (const line of raw.split("\n").filter(Boolean)) {
          const [filePath, fileName, videoStatus, dynAvatar, title] = line.split("\t");
          if (String(videoStatus) !== "1") {
            console.log(`  ⏭️  跳过 (video_status=${videoStatus}): ${fileName}`);
            continue;
          }
          const parts = subPath.split("/");
          const parentFolder = parts[parts.length - 1] || "unknown";
          const slug = parentFolder.replace(/^\d{4}-\d{2}-\d{2}-/, "");
          articles.push({
            vaultPath: filePath,
            category,
            slug,
            dynamicAvatar: String(dynAvatar).toLowerCase() === "true",
            title: title || fileName,
          });
          console.log(`  ✅ 待处理: ${title || fileName}`);
        }
      } catch (err: any) {
        console.error(`  ❌ 扫描子文件夹失败 ${subPath}: ${err.message}`);
      }
    }
  }

  return articles;
}

// ====== 文章内容读取 ======

function readArticleContent(vaultPath: string): string {
  const raw = obsidianRead(vaultPath);
  const fmMatch = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
  return fmMatch ? raw.slice(fmMatch[0].length).trim() : raw.trim();
}

// ====== Metadata 生成 ======

function saveMetadata(
  outputDir: string,
  meta: { videoTitle: string; videoDescription: string; sourceArticle: string; category: string; generatedAt: string; videoFile: string }
): string {
  const content = `---
title: "${meta.videoTitle}"
description: "${meta.videoDescription}"
source: "${meta.sourceArticle}"
category: ${meta.category}
generated_at: ${meta.generatedAt}
---

# ${meta.videoTitle}

${meta.videoDescription}

- **来源文章**: ${meta.sourceArticle}
- **内容分类**: ${meta.category}
- **视频文件**: ${meta.videoFile}
- **生成时间**: ${meta.generatedAt}
`;
  const metaPath = path.join(outputDir, "metadata.md");
  fs.writeFileSync(metaPath, content, "utf-8");
  return metaPath;
}

// ====== 清理临时文件 ======

function cleanupTempFiles(publicDir: string): void {
  const dirsToClean = ["avatars", "tts"].map(d => path.join(publicDir, d));
  const styledAvatar = path.join(publicDir, "avatar-styled.jpg");
  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) fs.rmSync(dir, { recursive: true, force: true });
  }
  if (fs.existsSync(styledAvatar)) fs.rmSync(styledAvatar);
}

// ====== 主流程 ======

async function main() {
  const args = process.argv.slice(2);
  const dateIndex = args.indexOf("--date");
  const today = dateIndex !== -1 ? args[dateIndex + 1] : new Date().toISOString().slice(0, 10);
  const keepArtifacts = args.includes("--keep");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎬 批量视频生成工作流`);
  console.log(`📅 日期: ${today}`);
  console.log(`${"=".repeat(60)}`);

  try {
    execSync("obsidian --version", { encoding: "utf-8", timeout: 5000 });
  } catch {
    console.error("❌ Obsidian CLI 不可用，请确保 Obsidian 已打开且 CLI 已安装");
    process.exit(1);
  }

  const config = loadConfig();
  const topview = new TopviewClient(config.topviewScriptsDir);

  console.log("\n🔍 开始扫描文章...");
  const articles = scanForArticles(today);

  if (articles.length === 0) {
    console.log("\n📭 没有找到需要生成视频的文章");
    return;
  }

  console.log(`\n📋 找到 ${articles.length} 篇待处理文章`);
  console.log("\n🔗 获取 Topview board ID...");
  const boardId = await topview.getBoardId();

  const results: BatchResult[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📄 [${i + 1}/${articles.length}] ${article.title || article.slug}`);
    console.log(`   分类: ${article.category} | 动态Avatar: ${article.dynamicAvatar}`);
    console.log(`${"─".repeat(60)}`);

    try {
      // 2a: 读取文章
      console.log("  📖 读取文章内容...");
      const articleText = readArticleContent(article.vaultPath);
      if (!articleText || articleText.length < 50) throw new Error(`文章内容过短 (${articleText.length} 字)`);
      console.log(`     文章长度: ${articleText.length} 字`);

      // 2b: 生成口播稿
      console.log("  🤖 生成口播稿...");
      const script = await generateOralScript(articleText, config.geminiApiKey);
      console.log(`     标题: "${script.title}"`);
      console.log(`     视频标题: "${script.videoTitle || script.title}"`);
      fs.mkdirSync(config.outputDir, { recursive: true });
      fs.writeFileSync(
        path.join(config.outputDir, `script-${article.slug}.json`),
        JSON.stringify(script, null, 2),
        "utf-8"
      );

      // 2c: 动态 Avatar（可选）
      let avatarPhotoPath = config.avatarPhotoPath;
      if (article.dynamicAvatar) {
        console.log("  🎨 生成动态 Avatar...");
        try {
          avatarPhotoPath = await generateDynamicAvatar(
            articleText,
            config.avatarPhotoPath,
            { geminiApiKey: config.geminiApiKey, boardId, publicDir: config.publicDir },
            topview
          );
        } catch (err) {
          console.error("     ⚠️ 动态 Avatar 失败，使用默认:", err);
          avatarPhotoPath = config.avatarPhotoPath;
        }
      }

      // 2d: TTS → audio → avatar video
      console.log("  🎙️ 生成 TTS 音频 + 数字人视频...");
      const { absoluteAudioPath, absoluteVideoPath, avatarVideoPath } = await generateAvatarVideo(
        script.text,
        topview,
        {
          avatarPhotoPath,
          defaultAvatarPhotoPath: config.avatarPhotoPath, // fallback if styled image fails
          voiceId: config.avatarVoiceId,
          boardId,
          publicDir: config.publicDir,
          ttsSpeed: config.ttsSpeed,
          ttsEmotion: config.ttsEmotion,
          captionId: config.captionId || undefined,
        }
      );

      // 2e: 并行 — SRT 转录 + 视频时长
      console.log("  📝 SRT 转录 + 时长探测 (并行)...");
      const [srtContent, videoDuration] = await Promise.all([
        generateSrt(absoluteAudioPath, config.geminiApiKey),
        getMediaDuration(absoluteVideoPath),
      ]);
      console.log(`     视频时长: ${videoDuration.toFixed(1)}s`);

      const outputDir = path.join(OUTPUT_BASE, today, `${today}-${article.slug}`);
      fs.mkdirSync(outputDir, { recursive: true });
      const srtPath = path.join(outputDir, "subtitles.srt");
      fs.writeFileSync(srtPath, srtContent, "utf-8");
      console.log(`     SRT 已保存: ${srtPath}`);

      // 2f: 生成叠加计划
      console.log("  🖼️ 生成 B-roll 叠加计划...");
      const overlays = await generateOverlays(srtContent, config.geminiApiKey);
      console.log(`     ${overlays.length} 个叠加点`);

      // 2g: Remotion 渲染
      console.log("  🎬 渲染视频...");
      const outputVideoPath = path.join(outputDir, "video.mp4");
      const compositionProps: CompositionProps = {
        avatarVideoPath,
        totalDuration: videoDuration,
        overlays,
        fps: 30,
        width: 1080,
        height: 1920,
      };
      await renderVideo(compositionProps, outputVideoPath);

      // 2h: 生成 metadata
      console.log("  📋 生成 metadata...");
      saveMetadata(outputDir, {
        videoTitle: script.videoTitle || script.title,
        videoDescription: script.videoDescription || `${script.title} - 口播短视频`,
        sourceArticle: article.vaultPath,
        category: article.category,
        generatedAt: new Date().toISOString(),
        videoFile: "video.mp4",
      });

      // 2i: 更新文章状态
      console.log("  ✏️ 更新 video_status → done...");
      obsidianPropertySet(article.vaultPath, "video_status", "done");

      // 2j: 清理
      if (!keepArtifacts) {
        cleanupTempFiles(config.publicDir);
      } else {
        console.log("  📦 保留中间文件 (--keep)");
      }

      console.log(`  ✅ 完成！视频: ${outputVideoPath}`);
      results.push({ article, success: true, videoPath: outputVideoPath });

    } catch (err: any) {
      console.error(`  ❌ 失败: ${err.message}`);
      if (!keepArtifacts) cleanupTempFiles(config.publicDir);
      results.push({ article, success: false, error: err.message });
    }
  }

  // 汇总报告
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 批量生成完成  ✅ 成功: ${succeeded.length}  ❌ 失败: ${failed.length}`);
  console.log(`${"=".repeat(60)}`);

  for (const r of succeeded) console.log(`  ✅ ${r.article.title || r.article.slug} → ${r.videoPath}`);
  for (const r of failed) console.log(`  ❌ ${r.article.title || r.article.slug}: ${r.error}`);

  if (failed.length > 0) process.exit(1);
}

main().catch((err) => {
  console.error("批量工作流异常退出:", err);
  process.exit(1);
});
