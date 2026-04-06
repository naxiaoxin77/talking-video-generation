# Step 4: 清理临时文件

> **执行者**: 脚本
> **输入**: 临时资源目录
> **输出**: 清理完成

## 目标

删除 pipeline 过程中产生的临时文件，保留最终输出。

## 执行逻辑

**删除目录**：
- `public/avatars/` — Avatar 视频
- `public/audio/` — 提取的音频
- `public/tts/` — TTS 音频

**删除文件**：
- `public/avatar-styled.jpg` — 动态生成的 Avatar 照片（如果存在）

**保留**：
- `output/script.json` — 生成的脚本（用于调试）
- `output/*.mp4` — 最终视频
- `assets/avatar.jpg` — 原始 Avatar 照片

## 输出

清理完成日志
