# Step 1.5: 动态 Avatar 形象生成（可选）

> **执行者**: 脚本 + Gemini LLM + Topview image_edit
> **输入**: 文章文本 + 原始 avatar 照片
> **输出**: `public/avatar-styled.jpg`

## 目标

根据文章内容，为主播设计匹配的"亲历者"形象（服装 + 场景），生成新的 avatar 照片。

## 触发条件

- `DYNAMIC_AVATAR=true`（.env）且未传入 `--default-avatar` CLI 参数
- 失败时自动降级为默认 avatar 照片

## 执行逻辑

**Phase 1: LLM 生成形象描述**：
- 调用 Gemini 根据文章内容生成英文 prompt
- Prompt 配置在 `src/pipeline/avatar-style.prompt.ts`
- 输出约 100-200 个英文单词的形象描述

**Phase 2: Topview image_edit 生图**：
- 模型：`Nano Banana 2`（免费）
- 输入图片：原始 avatar 照片
- 比例：`3:4`，分辨率 `2K`
- 超时：600 秒

**Phase 3: 下载保存**：
- 下载生成的图片到 `public/avatar-styled.jpg`

## 可定制参数

编辑 `src/pipeline/avatar-style.prompt.ts`：
- `AVATAR_STYLE_SYSTEM_PROMPT` — LLM 指令
- `AVATAR_IMAGE_CONFIG` — 模型、比例、分辨率

## 输出

`public/avatar-styled.jpg` — 新形象的 avatar 照片
