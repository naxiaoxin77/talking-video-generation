# 脚本生成 Prompt

配置文件：`src/pipeline/script-generator.ts` 中的 `SYSTEM_PROMPT` 常量

## 核心指令

指导 Gemini 将文章转换为口播视频脚本 JSON。

**输出结构**：
- `title`: 视频标题
- `totalDurationEstimate`: 预估总时长
- `segments[]`: 分段列表

**脚本规则**：
- 3-5 个核心观点
- avatar 和 broll 段交替
- 以 avatar 开头/结尾
- 每段 15-30 秒（45-90 中文字）
- 总时长 60-120 秒

**口播风格**：
- 口语化
- 开头有 hook
- 结尾有 CTA

**B-roll slideData 布局选择**：

| 布局 | 适用场景 |
|------|---------|
| `bullet-list` | 列举要点（3-5 条，每条≤15 字） |
| `big-number` | 统计数据、数字冲击 |
| `comparison` | 对比（每边 2-4 条） |
| `quote` | 金句、重要观点（≤50 字） |
| `timeline` | 流程、演变（3-5 节点） |

**多样性要求**：不同 broll 段使用不同 layout 类型
