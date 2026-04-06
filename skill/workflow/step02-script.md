# Step 1: 生成口播脚本

> **执行者**: 脚本 + Gemini LLM
> **输入**: 文章文本文件
> **输出**: `output/script.json`

## 目标

调用 Gemini LLM 将文章转换为结构化的口播视频脚本，包含 avatar 段和 broll 段交替排列。

## 执行逻辑

**LLM 调用**：
- 模型：`gemini-2.5-flash`
- System Prompt 定义在 `src/pipeline/script-generator.ts` 的 `SYSTEM_PROMPT` 常量
- 用户输入：`请将以下文章转换为口播短视频脚本：\n\n{articleText}`

**脚本结构**：
- 5 个 segments（3 avatar + 2 broll 交替）
- 以 avatar 开头和结尾
- 每段 15-30 秒（45-90 字）
- 总时长 60-120 秒

**B-roll 段**：
- 必须包含 `slideData` 字段
- 支持 5 种布局：`bullet-list`、`big-number`、`comparison`、`quote`、`timeline`
- 不同 broll 段使用不同布局增加视觉多样性

**验证**：
- 所有 segment 必须有 `id`、`type`、`text`
- broll 段必须有 `slideData`
- `slideData.layout` 必须是有效类型

## 输出

`output/script.json` — VideoScript JSON 文件
