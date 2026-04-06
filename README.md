# Talking Video Generation

将文章/文本内容自动转换为 **9:16 竖屏口播短视频**。数字人讲述 + 动画幻灯片 B-roll 交替呈现，全流程自动化。

https://github.com/user-attachments/assets/placeholder

## 效果示例

- 数字人 Avatar 口播段落，底部字幕
- B-roll 动画幻灯片（要点列表、大数字、对比、引用、时间线）
- 0.5 秒 fade 转场
- 可选：根据文章内容动态生成 Avatar 形象（换装 + 换场景）

## Pipeline 流程

```
文章文本
  ↓ Gemini LLM
口播脚本 (script.json)
  ↓ Topview text2voice
TTS 音频
  ↓ Topview avatar4
数字人口播视频
  ↓ ffmpeg
提取 B-roll 音频
  ↓ Remotion
最终视频 (1080×1920 MP4)
```

## 技术栈

| 组件 | 技术 |
|------|------|
| 脚本生成 | Google Gemini 2.5 Flash |
| TTS 语音 | Topview text2voice |
| 数字人视频 | Topview avatar4 |
| 动态形象生图 | Topview ai_image (Nano Banana 2) |
| 视频合成 | Remotion 4 + React 19 |
| 音视频处理 | ffmpeg / ffprobe |
| 运行时 | Node.js + TypeScript (ESM) |

## 快速开始

### 1. 系统要求

- **Node.js** 20+
- **Python** 3.13+（运行 Topview Skill 脚本）
- **ffmpeg / ffprobe**（音视频处理）

### 2. 安装

```bash
git clone https://github.com/your-repo/talking-video-generation.git
cd talking-video-generation
npm install
```

### 3. 安装 Topview Skill

```bash
# 克隆到 Claude Code plugins 目录（或其他位置）
git clone https://github.com/topviewai/skill.git ~/.claude/plugins/topview-skill
cd ~/.claude/plugins/topview-skill/scripts
pip install -r requirements.txt
```

按 Topview Skill 文档配置 API Key。

### 4. 安装 ffmpeg

```bash
# Windows
winget install Gyan.FFmpeg

# macOS
brew install ffmpeg

# Linux (Ubuntu/Debian)
sudo apt install ffmpeg
```

### 5. 配置环境变量

```bash
cp .env.example .env
```

编辑 `.env`：

```env
# 必需
GEMINI_API_KEY=your-gemini-api-key
TOPVIEW_SCRIPTS_DIR=/path/to/topview-skill/scripts
AVATAR_PHOTO_PATH=./assets/avatar.jpg
AVATAR_VOICE_ID=your-topview-voice-id

# 可选
TTS_SPEED=1.10
TTS_EMOTION=happy
DYNAMIC_AVATAR=false
```

**获取各项凭证**：

| 凭证 | 获取方式 |
|------|----------|
| Gemini API Key | https://aistudio.google.com/apikey |
| Topview API Key | 注册 Topview 后在设置中获取 |
| Voice ID | `python topview-skill/scripts/voice.py list --custom` |

### 6. 准备 Avatar 照片

将你的正面半身照放到 `assets/avatar.jpg`。

### 7. 运行

```bash
# 基本用法
npx tsx src/index.ts --input article.txt --output output/video.mp4

# 使用默认 Avatar（跳过动态形象生成）
npx tsx src/index.ts --input article.txt --default-avatar

# npm script 方式
npm run generate -- --input article.txt
```

## 项目结构

```
talking-video-generation/
├── src/
│   ├── index.ts                    # CLI 入口，pipeline 编排
│   ├── pipeline/
│   │   ├── types.ts                # 核心类型定义
│   │   ├── script-generator.ts     # Gemini LLM 脚本生成
│   │   ├── avatar-generator.ts     # TTS + Avatar4 视频生成
│   │   ├── avatar-style-generator.ts  # 动态 Avatar 形象生成
│   │   ├── avatar-style.prompt.ts  # 动态形象 prompt 配置 ✏️
│   │   └── resource-preparer.ts    # ffprobe/ffmpeg 资源处理
│   ├── remotion/
│   │   ├── Root.tsx                # Remotion 根组件
│   │   ├── TalkingVideo.tsx        # 主 Composition
│   │   ├── render.ts               # 渲染入口
│   │   ├── fonts.ts                # 中文字体加载
│   │   ├── design.config.ts        # 视觉设计参数 ✏️
│   │   └── components/
│   │       ├── AvatarSegment.tsx    # Avatar 口播组件
│   │       ├── BrollSegment.tsx     # B-roll 幻灯片组件
│   │       ├── SubtitleOverlay.tsx  # 字幕叠加组件
│   │       └── slides/             # 5 种幻灯片模板
│   │           ├── SlideRenderer.tsx
│   │           ├── SlideBackground.tsx
│   │           ├── BulletListSlide.tsx
│   │           ├── BigNumberSlide.tsx
│   │           ├── ComparisonSlide.tsx
│   │           ├── QuoteSlide.tsx
│   │           └── TimelineSlide.tsx
│   └── utils/
│       ├── config.ts               # 环境变量加载
│       └── topview.ts              # Topview API 封装
├── skill/                          # Claude Code Skill 定义
│   ├── SKILL.md
│   ├── config/
│   ├── reference/
│   └── workflow/
├── assets/
│   └── avatar.jpg                  # 默认 Avatar 照片
├── output/                         # 输出目录
├── .env.example
├── package.json
└── tsconfig.json
```

标注 ✏️ 的文件是可定制的配置文件，修改后重新运行即可生效。

## 定制化

### 视觉设计

编辑 `src/remotion/design.config.ts`，可调整：

- **全局配色**：背景渐变、强调色、文字色
- **字幕样式**：字号、背景、位置
- **幻灯片动效**：弹簧参数、交错延迟、打字机速度
- **各模板细节**：图标尺寸、数字字号、对比列颜色等

### 动态 Avatar Prompt

编辑 `src/pipeline/avatar-style.prompt.ts`，可调整：

- **形象生成指令**：亲历者身份设计规则
- **图片模型**：模型名、比例、分辨率

### 脚本生成 Prompt

编辑 `src/pipeline/script-generator.ts` 中的 `SYSTEM_PROMPT`，可调整：

- **脚本结构**：段落数量、时长
- **文字风格**：口语化程度、语气
- **幻灯片布局**：选择逻辑、内容约束

## B-roll 幻灯片模板

| 模板 | 适用场景 | 动效 |
|------|---------|------|
| `bullet-list` | 列举要点 | 条目逐条从左侧滑入 |
| `big-number` | 统计数据 | 数字从 0 跳动到目标值 |
| `comparison` | 对比展示 | 左右两列分别飞入 |
| `quote` | 金句引用 | 打字机逐字显现 |
| `timeline` | 流程演变 | 时间线节点依次亮起 |

## 作为 Claude Code Skill 使用

将 `skill/` 目录复制到 Claude Code skills 目录：

```bash
cp -r skill/ ~/.claude/skills/talking-video-generating/
```

然后在 Claude Code 中说「生成口播视频」或「文章转视频」即可触发。

## 依赖说明

### npm 依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `@google/generative-ai` | ^0.24 | Google Gemini API SDK |
| `remotion` | ^4.0 | 视频合成框架 |
| `@remotion/bundler` | ^4.0 | Webpack 打包 |
| `@remotion/renderer` | ^4.0 | 视频渲染引擎 |
| `@remotion/cli` | ^4.0 | Remotion CLI（预览） |
| `@remotion/transitions` | ^4.0 | TransitionSeries + fade |
| `@remotion/captions` | ^4.0 | 字幕支持 |
| `@remotion/google-fonts` | ^4.0 | Google Fonts 加载（Noto Sans SC） |
| `react` | ^19.0 | UI 框架（Remotion 依赖） |
| `react-dom` | ^19.0 | React DOM |
| `zod` | ^3.24 | Schema 验证 |
| `dotenv` | ^16.4 | 环境变量加载 |

### 开发依赖

| 包名 | 版本 | 用途 |
|------|------|------|
| `typescript` | ^5.7 | TypeScript 编译器 |
| `tsx` | ^4.19 | TypeScript 直接执行 |
| `@types/node` | ^22.0 | Node.js 类型定义 |
| `@types/react` | ^19.0 | React 类型定义 |

### 外部依赖

| 工具 | 用途 | 安装方式 |
|------|------|----------|
| ffmpeg | 音频提取 | `winget install Gyan.FFmpeg` / `brew install ffmpeg` |
| ffprobe | 视频时长检测 | 随 ffmpeg 一起安装 |
| Python 3.13+ | 运行 Topview Skill 脚本 | https://python.org |
| Topview Skill | TTS / Avatar / 图片生成 | `git clone https://github.com/topviewai/skill.git` |

## License

MIT
