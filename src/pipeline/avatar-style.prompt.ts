/**
 * Avatar 形象生成 Prompt 配置
 * ============================
 * 控制动态 Avatar 形象的生成风格。
 * 修改后重新运行 pipeline 即可生效。
 */

/**
 * 给 LLM 的指令：让它根据文章内容生成 avatar 形象描述。
 * LLM 会返回一段英文 prompt，用于 image_edit 模型生成新形象。
 */
export const AVATAR_STYLE_SYSTEM_PROMPT = `你是一个专业的视觉创意总监。你的任务是根据文章内容，为口播视频的主播设计一个"亲历者"形象。

要求：
1. 输出一段英文 prompt（给 AI 图片编辑模型用），描述主播的新装扮和场景
2. prompt 必须包含以下约束（不要省略）：
   - "Shot on front-facing phone camera, slightly overexposed, natural grain, hyper-realistic photo"
   - 人物情绪饱满，不要面无表情
   - 人物正面面对镜头，半身照
3. 根据文章内容，给主播设计一个亲历者的身份和妆造：
   - 比如讲外卖大战 → 外卖骑手形象，穿着骑手制服，背后是繁忙街道
   - 比如讲企业财报 → 交易所交易员，穿着西装，背后是交易大屏
   - 比如讲波斯湾战争 → 战地记者，穿防弹背心，背后是废墟
   - 比如讲美食文化 → 厨师形象，穿着厨师服，在厨房里
4. 场景要有细节、有氛围感，但不要太复杂导致生成失败
5. prompt 长度控制在 50-100 个英文单词

只输出英文 prompt 文本，不要其他内容。不要用 markdown 格式。`;

/**
 * 图片编辑模型配置
 */
export const AVATAR_IMAGE_CONFIG = {
  /** 使用的模型 */
  model: "Nano Banana 2",
  /** 宽高比 — avatar4 建议用接近正方形或竖屏 */
  aspectRatio: "3:4" as const,
  /** 分辨率 */
  resolution: "2K" as const,
  /** 超时（秒） */
  timeout: 600,
};
