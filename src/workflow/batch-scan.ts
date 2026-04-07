/**
 * 批量扫描工作流
 * 扫描 Obsidian vault 中今日的文章，自动生成口播视频
 *
 * 用法: npx tsx src/workflow/batch-scan.ts [--date 2026-04-06]
 */

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { loadConfig } from "../utils/config.js";
import { TopviewClient } from "../utils/topview.js";
import { generateScript } from "../pipeline/script-generator.js";
import { generateDynamicAvatar } from "../pipeline/avatar-style-generator.js";
import { generateAvatarVideos } from "../pipeline/avatar-generator.js";
import { prepareResources } from "../pipeline/resource-preparer.js";
import { renderVideo } from "../remotion/render.js";
import type { CompositionProps } from "../pipeline/types.js";

// ====== 常量 ======

const VAULT_BASE = "natebrain/03_Content_Factory/01_Final_Assets";
const SCAN_CATEGORIES = ["深度blog", "短图文"];
const OUTPUT_BASE = "G:\\Other computers\\My MacBook Pro\\brain\\natebrain\\03_Content_Factory\\01_Final_Assets\\短视频";
// 文件名匹配模式：[终稿-图文]-*.md
// 用 encStr 构建正则避免方括号/中文在 shell 中的转义问题
function buildFilePatternCheck(): string {
  // 生成：f.name.indexOf(String.fromCharCode(91,...终稿-图文...)) === 0 && f.name.endsWith(String.fromCharCode(46,109,100))
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

/**
 * 将字符串编码为 charCode 数组表达式，避免 shell 引号问题
 * 生成: [99,111,...].map(function(c){return String.fromCharCode(c)}).join(String())
 */
function encStr(s: string): string {
  const codes = [...s].map(c => c.charCodeAt(0)).join(",");
  return `[${codes}].map(function(c){return String.fromCharCode(c)}).join(String())`;
}

/**
 * 通过 obsidian eval 执行 JS 代码
 * 所有字符串字面量应通过 encStr() 编码，避免 shell 转义问题
 */
function obsidianEval(code: string): string {
  const result = execSync(`obsidian eval code="${code}"`, {
    encoding: "utf-8",
    timeout: 15000,
  });
  // obsidian eval 输出通常带 "\n=> " 前缀，需要清除
  return result.replace(/^\s*=>\s*/, "").replace(/\n=>\s*/g, "\n").trim();
}

function obsidianRead(vaultPath: string): string {
  const code = `app.vault.read(app.vault.getAbstractFileByPath(${encStr(vaultPath)}))`;
  const raw = obsidianEval(code);
  // 结果可能被 => 包裹
  return raw.startsWith("=> ") ? raw.slice(3) : raw;
}

function obsidianPropertySet(vaultPath: string, key: string, value: string): void {
  // 使用 eval 避免 path 中的特殊字符（中文引号等）导致 shell 解析失败
  const code = `var file=app.vault.getAbstractFileByPath(${encStr(vaultPath)}); if(file){app.fileManager.processFrontMatter(file,function(fm){fm[${encStr(key)}]=${encStr(value)}})}`;
  obsidianEval(code);
}

// ====== 扫描函数 ======

function scanForArticles(today: string): ArticleInfo[] {
  const articles: ArticleInfo[] = [];

  for (const category of SCAN_CATEGORIES) {
    const folderPath = `${VAULT_BASE}/${category}/${today}`;
    console.log(`\n📂 扫描: ${folderPath}`);

    // Step 1: 列出日期目录下的子文件夹
    const listCode = `var f=app.vault.getAbstractFileByPath(${encStr(folderPath)}); f&&f.children?f.children.filter(function(c){return !!c.children}).map(function(c){return c.path}).join(String.fromCharCode(10)):String()`;

    let subfolders: string[];
    try {
      const raw = obsidianEval(listCode);
      if (!raw) {
        console.log(`  ⚠️ 目录不存在或为空`);
        continue;
      }
      subfolders = raw.split("\n").filter(Boolean);
    } catch (err: any) {
      console.error(`  ❌ 扫描目录失败: ${err.message}`);
      continue;
    }

    // Step 2: 在每个子文件夹中查找终稿文件并读取 frontmatter
    for (const subPath of subfolders) {
      // 用 TAB 分隔字段避免 JSON 中文引号问题: path\tname\tvideo_status\tDYNAMIC_AVATAR\ttitle
      const TAB = "String.fromCharCode(9)";
      const NL = "String.fromCharCode(10)";
      const scanCode = `var folder=app.vault.getAbstractFileByPath(${encStr(subPath)}); var lines=[]; if(folder&&folder.children){folder.children.forEach(function(f){if(f.name&&${FILE_CHECK_EXPR}&&f.name.indexOf(String.fromCharCode(46,98,97,107))===-1){var cache=app.metadataCache.getFileCache(f);var fm=cache?cache.frontmatter:{}; lines.push([f.path,f.name,fm&&fm.video_status||String(),fm&&fm.DYNAMIC_AVATAR||String(),fm&&fm.title||String()].join(${TAB}))}})} lines.join(${NL})`;

      try {
        const raw = obsidianEval(scanCode);
        if (!raw) continue;

        const lines = raw.split("\n").filter(Boolean);

        for (const line of lines) {
          const [filePath, fileName, videoStatus, dynAvatar, title] = line.split("\t");

          if (String(videoStatus) !== "1") {
            console.log(`  ⏭️  跳过 (video_status=${videoStatus}): ${fileName}`);
            continue;
          }

          // 从父文件夹名提取 slug
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
  // 去掉 YAML frontmatter
  const fmMatch = raw.match(/^---\s*\n[\s\S]*?\n---\s*\n/);
  if (fmMatch) {
    return raw.slice(fmMatch[0].length).trim();
  }
  return raw.trim();
}

// ====== Metadata 生成 ======

function saveMetadata(
  outputDir: string,
  meta: {
    videoTitle: string;
    videoDescription: string;
    sourceArticle: string;
    category: string;
    generatedAt: string;
    videoFile: string;
  }
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
  const dirsToClean = ["avatars", "audio", "tts"].map(d => path.join(publicDir, d));
  const styledAvatar = path.join(publicDir, "avatar-styled.jpg");

  for (const dir of dirsToClean) {
    if (fs.existsSync(dir)) {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }
  if (fs.existsSync(styledAvatar)) {
    fs.rmSync(styledAvatar);
  }
}

// ====== 主流程 ======

async function main() {
  // 解析日期参数
  const args = process.argv.slice(2);
  const dateIndex = args.indexOf("--date");
  const today = dateIndex !== -1
    ? args[dateIndex + 1]
    : new Date().toISOString().slice(0, 10);
  const keepArtifacts = args.includes("--keep");

  console.log(`\n${"=".repeat(60)}`);
  console.log(`🎬 批量视频生成工作流`);
  console.log(`📅 日期: ${today}`);
  console.log(`${"=".repeat(60)}`);

  // 前置检查: Obsidian CLI 可用性
  try {
    execSync("obsidian --version", { encoding: "utf-8", timeout: 5000 });
  } catch {
    console.error("❌ Obsidian CLI 不可用，请确保 Obsidian 已打开且 CLI 已安装");
    process.exit(1);
  }

  // 加载配置
  const config = loadConfig();
  const topview = new TopviewClient(config.topviewScriptsDir);

  // Step 1: 扫描文章
  console.log("\n🔍 开始扫描文章...");
  const articles = scanForArticles(today);

  if (articles.length === 0) {
    console.log("\n📭 没有找到需要生成视频的文章");
    return;
  }

  console.log(`\n📋 找到 ${articles.length} 篇待处理文章`);

  // 获取 board ID（所有文章共用）
  console.log("\n🔗 获取 Topview board ID...");
  const boardId = await topview.getBoardId();

  // Step 2: 逐篇处理
  const results: BatchResult[] = [];

  for (let i = 0; i < articles.length; i++) {
    const article = articles[i];
    console.log(`\n${"─".repeat(60)}`);
    console.log(`📄 [${i + 1}/${articles.length}] ${article.title || article.slug}`);
    console.log(`   分类: ${article.category} | 动态Avatar: ${article.dynamicAvatar}`);
    console.log(`${"─".repeat(60)}`);

    try {
      // 2a: 读取文章内容
      console.log("  📖 读取文章内容...");
      const articleText = readArticleContent(article.vaultPath);
      if (!articleText || articleText.length < 50) {
        throw new Error(`文章内容过短 (${articleText.length} 字)`);
      }
      console.log(`     文章长度: ${articleText.length} 字`);

      // 2b: 生成脚本
      console.log("  🤖 生成视频脚本...");
      const script = await generateScript(articleText, config.geminiApiKey);
      console.log(`     标题: "${script.title}" — ${script.segments.length} 段`);
      console.log(`     视频标题: "${script.videoTitle || script.title}"`);

      // 保存脚本供调试
      const debugScriptPath = path.join(config.outputDir, `script-${article.slug}.json`);
      fs.mkdirSync(config.outputDir, { recursive: true });
      fs.writeFileSync(debugScriptPath, JSON.stringify(script, null, 2), "utf-8");

      // 2c: 动态 Avatar（根据文章 frontmatter 决定）
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

      // 2d: TTS + Avatar 视频
      console.log("  🎙️ 生成 TTS 和数字人视频...");
      const avatarSegments = await generateAvatarVideos(script.segments, topview, {
        avatarPhotoPath,
        voiceId: config.avatarVoiceId,
        boardId,
        publicDir: config.publicDir,
        ttsSpeed: config.ttsSpeed,
        ttsEmotion: config.ttsEmotion,
        captionId: config.captionId || undefined,
      });

      // 2e: 准备资源
      console.log("  🔧 准备视频资源...");
      const segments = await prepareResources(avatarSegments, config.publicDir);

      // 2f: Remotion 渲染
      console.log("  🎬 渲染视频...");
      const outputDir = path.join(OUTPUT_BASE, today, `${today}-${article.slug}`);
      fs.mkdirSync(outputDir, { recursive: true });
      const outputVideoPath = path.join(outputDir, "video.mp4");

      const compositionProps: CompositionProps = {
        segments,
        fps: 30,
        width: 1080,
        height: 1920,
      };
      await renderVideo(compositionProps, outputVideoPath);

      // 2g: 生成 metadata
      console.log("  📝 生成 metadata...");
      const videoTitle = script.videoTitle || script.title;
      const videoDescription = script.videoDescription || `${script.title} - 口播短视频`;
      const metaPath = saveMetadata(outputDir, {
        videoTitle,
        videoDescription,
        sourceArticle: article.vaultPath,
        category: article.category,
        generatedAt: new Date().toISOString(),
        videoFile: "video.mp4",
      });

      // 2h: 更新文章状态
      console.log("  ✏️ 更新 video_status → done...");
      obsidianPropertySet(article.vaultPath, "video_status", "done");

      // 2i: 清理或保留临时文件
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

  // Step 3: 汇总报告
  const succeeded = results.filter(r => r.success);
  const failed = results.filter(r => !r.success);

  console.log(`\n${"=".repeat(60)}`);
  console.log(`📊 批量生成完成`);
  console.log(`   ✅ 成功: ${succeeded.length}`);
  console.log(`   ❌ 失败: ${failed.length}`);
  console.log(`${"=".repeat(60)}`);

  if (succeeded.length > 0) {
    console.log("\n✅ 成功列表:");
    for (const r of succeeded) {
      console.log(`   ${r.article.title || r.article.slug} → ${r.videoPath}`);
    }
  }

  if (failed.length > 0) {
    console.log("\n❌ 失败列表:");
    for (const r of failed) {
      console.log(`   ${r.article.title || r.article.slug}: ${r.error}`);
    }
    process.exit(1);
  }
}

main().catch((err) => {
  console.error("批量工作流异常退出:", err);
  process.exit(1);
});
