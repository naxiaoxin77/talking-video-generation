---
name: talking-video-generating
description: 将文章转换为竖屏口播短视频。包含文章转脚本、TTS 语音合成、数字人视频、动画幻灯片 B-roll、Remotion 合成渲染全流程。触发词：「生成口播视频」「文章转视频」「talking video」「article to video」
---

# Talking Video Generation

将文章/文本内容转换为 9:16 竖屏口播短视频，支持数字人讲述 + 动画幻灯片 B-roll 交替呈现。

---

## 触发条件

| 关键词 | 动作 |
|--------|------|
| 「生成口播视频」「文章转视频」 | 执行完整 pipeline，从文章生成视频 |
| 「用默认形象生成视频」 | 跳过动态 Avatar，使用默认照片 |
| 「预览脚本」 | 只执行 Step 1（生成脚本），不生成视频 |

---

## 执行模式

| 选项 | 说明 |
|------|------|
| ✅ 自动执行 | 触发后自动执行全流程，完成后报告结果 |

> **提示**：工作流 Skill 采用「自动执行」模式，触发后直接执行，无需逐步确认。
> 前置条件检查（环境变量、依赖）在 Step 0 自动验证，失败时报错。

---

## 执行规范（必须遵守）

**每个步骤开始前，必须先阅读对应的 workflow 文档**：

1. **先读后做**：执行 Step N 前，先 Read `workflow/stepN-*.md`
2. **逐步验证**：每步完成后检查输出是否符合预期
3. **不跳步骤**：必须按 0→1→2→3→4→5 顺序执行
4. **失败容错**：Step 1.5（动态 Avatar）失败时自动降级为默认 Avatar

---

## 工作流（6 步）

| Step | 执行者 | 文档 | 输入 | 输出 |
|------|--------|------|------|------|
| 0 | 脚本 | `workflow/step01-init.md` | `.env` 环境变量 | Board ID、配置验证 |
| 1 | 脚本+LLM | `workflow/step02-script.md` | 文章文本 | `output/script.json` |
| 1.5 | 脚本+LLM | `workflow/step03-avatar-style.md` | 文章 + 原始照片 | `public/avatar-styled.jpg` |
| 2 | 脚本 | `workflow/step04-media.md` | 脚本 + Avatar 照片 | TTS 音频 + Avatar 视频 |
| 3 | 脚本 | `workflow/step05-render.md` | 所有素材 | `output/*.mp4` |
| 4 | 脚本 | `workflow/step06-cleanup.md` | 临时文件 | 清理完成 |

---

## 数据流

### 第一阶段：内容策划

```
用户文章 (article.txt)
    ↓ Step 1: Gemini LLM 生成脚本
output/script.json (含 segments + slideData)
    ↓ Step 1.5: Gemini + Topview 生成动态形象（可选）
public/avatar-styled.jpg
```

### 第二阶段：素材生成

```
script.json + avatar photo
    ↓ Step 2a: Topview text2voice (TTS)
public/tts/seg-*.mp3
    ↓ Step 2b: Topview avatar4 (口播视频)
public/avatars/seg-*.mp4
    ↓ Step 2c: ffmpeg 提取 B-roll 音频
public/audio/seg-*.mp3
```

### 第三阶段：合成输出

```
avatars/ + audio/ + script.json (slideData)
    ↓ Step 3: Remotion 渲染
output/video.mp4 (1080x1920 @ 30fps)
    ↓ Step 4: 清理临时文件
```

---

## 参数配置

| 参数 | 环境变量 | 默认值 | 说明 |
|------|----------|--------|------|
| Gemini API Key | `GEMINI_API_KEY` | - | Google Gemini API 密钥（必须） |
| Avatar 照片 | `AVATAR_PHOTO_PATH` | `./assets/avatar.jpg` | 默认 Avatar 照片路径 |
| Voice ID | `AVATAR_VOICE_ID` | - | Topview 克隆语音 ID |
| TTS 语速 | `TTS_SPEED` | `1.0` | 语音速度（0.5-2.0） |
| TTS 情感 | `TTS_EMOTION` | `` | 语音情感（happy/sad/angry 等） |
| 动态形象 | `DYNAMIC_AVATAR` | `false` | 是否根据内容生成动态 Avatar |

> 详见 `config/default.json` 和 `.env` 文件

---

## CLI 用法

```bash
# 完整 pipeline
npx tsx src/index.ts --input article.txt --output output/video.mp4

# 使用默认 Avatar（跳过动态形象）
npx tsx src/index.ts --input article.txt --default-avatar

# npm script
npm run generate -- --input article.txt
```

---

## 可定制文件

| 文件 | 用途 |
|------|------|
| `src/remotion/design.config.ts` | 视觉设计参数（配色、字号、动效） |
| `src/pipeline/avatar-style.prompt.ts` | 动态 Avatar 生成 prompt 和模型配置 |
| `src/pipeline/script-generator.ts` | LLM 脚本生成 prompt（SYSTEM_PROMPT 常量） |

---

## 参考资料

| 文件 | 路径 | 用途 |
|------|------|------|
| 设计配置说明 | `reference/design-config.md` | 所有可视化参数详解 |
| Avatar Prompt | `reference/prompts/prompt-avatar-style.md` | 动态形象生成 prompt |
| 脚本 Prompt | `reference/prompts/prompt-script-gen.md` | LLM 脚本生成 prompt |
| 环境搭建 | `reference/setup.md` | 依赖安装和环境配置 |

---

## 凭证

### Gemini API Key

编辑 `.env`，设置 `GEMINI_API_KEY`。

> 获取：https://aistudio.google.com/apikey

### Topview API Key

Topview Skill 的凭证独立管理，参考：
> `C:\Users\nat99\.claude\plugins\topview-skill\scripts\shared\`
