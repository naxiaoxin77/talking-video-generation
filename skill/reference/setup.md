# 环境搭建指南

## 系统要求

- Node.js 20+
- Python 3.13+（Topview Skill 脚本）
- ffmpeg/ffprobe（视频处理）

## 安装步骤

### 1. 克隆项目

```bash
git clone https://github.com/your-repo/talking-video-generation.git
cd talking-video-generation
npm install
```

### 2. 安装 Topview Skill

```bash
cd ~/.claude/plugins
git clone https://github.com/topviewai/skill.git topview-skill
cd topview-skill/scripts
pip install -r requirements.txt
```

配置 Topview API Key：参考 Topview Skill 文档。

### 3. 安装 ffmpeg

**Windows**:
```bash
winget install Gyan.FFmpeg
```

**macOS**:
```bash
brew install ffmpeg
```

**Linux**:
```bash
sudo apt install ffmpeg
```

### 4. 配置环境变量

复制 `.env.example` 为 `.env`，填写：

```env
GEMINI_API_KEY=your-gemini-api-key
TOPVIEW_SCRIPTS_DIR=C:\\Users\\you\\.claude\\plugins\\topview-skill\\scripts
AVATAR_PHOTO_PATH=./assets/avatar.jpg
AVATAR_VOICE_ID=your-voice-id
TTS_SPEED=1.10
TTS_EMOTION=happy
DYNAMIC_AVATAR=false
```

### 5. 准备 Avatar 照片

将你的正面半身照放到 `assets/avatar.jpg`。

### 6. 获取 Voice ID

```bash
python path/to/topview-skill/scripts/voice.py list --custom
```

找到你克隆的语音，记录 Voice ID 填入 `.env`。

## 验证

```bash
npx tsx src/index.ts --input test-article.txt --default-avatar
```
