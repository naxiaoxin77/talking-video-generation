/**
 * 视频设计配置文件
 * ================
 * 所有视觉参数集中在此，方便定制。
 * 修改后重新渲染即可生效，无需改动组件代码。
 */

export const designConfig = {

  // ========== 全局配色 ==========
  theme: {
    /** 幻灯片默认背景（支持渐变） */
    background: "linear-gradient(135deg, #000000 0%, ##575757 50%, #000000 100%)",
    /** 强调色（标题、图标、高亮） */
    accent: "#ff9431",
    /** 正文颜色 */
    text: "#ffecdb",
  },

  // ========== 字幕样式（Avatar 和 B-roll 底部字幕） ==========
  subtitle: {
    fontSize: 36,
    fontWeight: 600,
    color: "#1a1a1a",
    /** 当前句高亮颜色（蓝色，与 Topview caption22 统一） */
    highlightColor: "#2563EB",
    /** 非当前句颜色 */
    dimColor: "rgba(0, 0, 0, 0.45)",
    /** 字幕背景（白底） */
    backgroundColor: "rgba(255, 255, 255, 0.95)",
    borderRadius: 12,
    /** 内边距 */
    padding: "16px 24px",
    /** 距底部的距离 */
    bottomPadding: 120,
    /** 最大宽度（占屏幕比例） */
    maxWidth: "90%",
    lineHeight: 1.5,
    textShadow: "none",
  },

  // ========== B-roll 动效 ==========
  effects: {
    /** 镜头缓推：整个 slide 从初始比例缓慢放大 */
    cameraPush: {
      enabled: true,
      /** 起始缩放（1.0 = 原始大小） */
      scaleFrom: 1.0,
      /** 结束缩放 */
      scaleTo: 1.06,
    },
    /** 光效扫过：一道白色光带从左向右划过 */
    lightSweep: {
      enabled: true,
      /** 扫过开始帧（在标题入场后触发） */
      startFrame: 18,
      /** 扫过持续帧数 */
      duration: 25,
      /** 光带宽度（像素） */
      width: 120,
      /** 光带最大不透明度 */
      opacity: 0.18,
      /** 光带倾斜角度（度） */
      angle: 20,
    },
  },

  // ========== 画中画（B-roll 人物小窗） ==========
  pip: {
    /** 圆形直径 */
    size: 300,
    /** 距右边距 */
    right: 40,
    /** 距顶部 */
    top: 80,
    /** 边框 */
    borderWidth: 4,
    borderColor: "rgba(255,255,255,0.8)",
    /** 阴影 */
    boxShadow: "0 4px 20px rgba(0,0,0,0.5)",
    /** 入场动画时长（帧） */
    enterDuration: 12,
  },

  // ========== 幻灯片通用 ==========
  slide: {
    /** 幻灯片内边距 */
    padding: "60px 50px",

    /** 标题 */
    title: {
      fontSize: 88,
      fontWeight: 800,
      /** 标题与内容的间距 */
      marginBottom: 50,
      lineHeight: 1.3,
    },

    /** 标题入场动画（帧数） */
    titleEnterDuration: 15,
    /** 标题入场 Y 偏移 */
    titleEnterOffset: -20,
  },

  // ========== bullet-list 要点列表 ==========
  bulletList: {
    /** 条目间距 */
    itemGap: 40,
    /** 图标容器尺寸 */
    iconSize: 72,
    iconBorderRadius: 18,
    iconFontSize: 36,
    /** 文字大小 */
    textFontSize: 46,
    textFontWeight: 500,
    /** 弹簧动画参数 */
    spring: { damping: 15, stiffness: 120 },
    /** 最大交错延迟（帧） */
    maxStaggerDelay: 12,
  },

  // ========== big-number 大数字 ==========
  bigNumber: {
    /** 数字字号 */
    numberFontSize: 180,
    numberFontWeight: 900,
    /** 单位字号 */
    unitFontSize: 90,
    /** 副标题字号 */
    subtitleFontSize: 48,
    subtitleMarginTop: 40,
    /** 计数动画占时长比例 */
    countDurationRatio: 0.5,
    /** 缩放脉冲幅度 */
    pulseScale: 1.08,
    /** 弹簧参数 */
    spring: { damping: 15, stiffness: 100 },
  },

  // ========== comparison 对比 ==========
  comparison: {
    /** 左侧标签颜色 */
    leftColor: "#FF6B6B",
    /** 右侧标签颜色 */
    rightColor: "#4ECDC4",
    /** 标签字号 */
    labelFontSize: 42,
    labelFontWeight: 700,
    /** 内容字号 */
    itemFontSize: 38,
    /** 分隔线宽度 */
    dividerWidth: 3,
    /** 弹簧参数 */
    spring: { damping: 15, stiffness: 100 },
    /** 最大交错延迟（帧） */
    maxItemStagger: 10,
  },

  // ========== quote 引用 ==========
  quote: {
    /** 装饰引号字号 */
    quoteMarkFontSize: 320,
    /** 装饰引号最终透明度 */
    quoteMarkOpacity: 0.15,
    /** 引文字号 */
    quoteFontSize: 52,
    quoteFontWeight: 500,
    quoteLineHeight: 1.8,
    /** 出处字号 */
    attributionFontSize: 38,
    /** 打字机速度：每字符帧数（越小越快） */
    typewriterSpeed: 1.5,
    /** 打字机占时长比例上限 */
    typewriterMaxRatio: 0.75,
    /** 光标闪烁间隔（帧） */
    cursorBlinkInterval: 8,
  },

  // ========== timeline 时间线 ==========
  timeline: {
    /** 时间线左侧缩进 */
    paddingLeft: 50,
    /** 节点圆点尺寸 */
    dotSize: 32,
    dotBorderWidth: 3,
    /** 节点发光效果 */
    dotGlow: true,
    /** 标签字号 */
    labelFontSize: 44,
    labelFontWeight: 700,
    /** 描述字号 */
    descriptionFontSize: 36,
    /** 节点间距 */
    nodeMarginBottom: 52,
    /** 弹簧参数 */
    spring: { damping: 14, stiffness: 120 },
    /** 最大交错延迟（帧） */
    maxStaggerDelay: 18,
  },

} as const;

/** 类型导出，方便外部使用 */
export type DesignConfig = typeof designConfig;
