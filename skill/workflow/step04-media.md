# Step 2: 素材生成

> **执行者**: 脚本（Topview API + ffmpeg）
> **输入**: `output/script.json` + avatar 照片
> **输出**: TTS 音频、Avatar 视频、B-roll 音频

## 目标

为所有 segment 生成 TTS 音频和 avatar4 口播视频，为 broll 段提取音频。

## 执行逻辑

**Phase 1: 批量提交 TTS（text2voice）**：
- 为所有 5 个 segment 提交 TTS 任务
- 参数：`speed`（TTS_SPEED）、`emotion`（TTS_EMOTION）
- 输出：每个 segment 的 `taskId`

**Phase 2: 并行轮询 TTS**：
- `Promise.all` 并行等待所有 TTS 完成
- 下载音频到 `public/tts/seg-*.mp3`

**Phase 3: 批量提交 avatar4（音频驱动模式）**：
- 使用 TTS 音频 + avatar 照片提交 avatar4 任务
- 音频驱动模式：`--audio` 参数（非 `--text`）

**Phase 4: 并行轮询 avatar4**：
- 等待所有视频生成完成
- 下载视频到 `public/avatars/seg-*.mp4`

**Phase 5: 资源准备（ffmpeg）**：
- ffprobe 获取每个视频的精确时长
- ffmpeg 为 broll 段从 avatar 视频提取音频到 `public/audio/seg-*.mp3`

## 输出

| 目录 | 内容 |
|------|------|
| `public/tts/` | TTS 音频文件 |
| `public/avatars/` | Avatar4 口播视频 |
| `public/audio/` | B-roll 段的音频轨 |
