# Step 0: 环境初始化

> **执行者**: 脚本
> **输入**: `.env` 环境变量
> **输出**: Board ID、配置验证通过

## 目标

验证所有必需的环境变量和依赖已就绪，获取 Topview Board ID。

## 执行逻辑

**环境检查**：
- 读取 `.env` 文件，验证 `GEMINI_API_KEY`、`TOPVIEW_SCRIPTS_DIR`、`AVATAR_PHOTO_PATH`、`AVATAR_VOICE_ID` 均已设置
- 验证 `AVATAR_PHOTO_PATH` 指向的文件存在
- 验证 `TOPVIEW_SCRIPTS_DIR` 目录存在

**依赖检查**：
- Node.js、npm 已安装
- `node_modules/` 存在（否则运行 `npm install`）
- ffmpeg/ffprobe 可用

**获取 Board ID**：
- 调用 `topview.getBoardId()` 获取默认画板 ID
- 从输出中提取 32 位十六进制 UUID

## 输出

- Board ID（32 位 hex 字符串）
- 配置对象 `PipelineConfig`
