# 设计配置参数说明

所有视觉参数集中在 `src/remotion/design.config.ts`，修改后重新渲染即可生效。

## 全局配色 (`theme`)

| 参数 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `background` | string | 深色渐变 | 幻灯片背景（支持 CSS 渐变） |
| `accent` | string | `#6C63FF` | 强调色（标题、图标、高亮） |
| `text` | string | `#ffffff` | 正文颜色 |

## 字幕样式 (`subtitle`)

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `fontSize` | 36 | 字号 |
| `fontWeight` | 600 | 字重 |
| `backgroundColor` | `rgba(0,0,0,0.6)` | 字幕背景 |
| `borderRadius` | 12 | 圆角 |
| `bottomPadding` | 120 | 距底部距离（px） |

## 幻灯片通用 (`slide`)

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `padding` | `80px 60px` | 内边距 |
| `title.fontSize` | 56 | 标题字号 |
| `title.fontWeight` | 800 | 标题字重 |
| `titleEnterDuration` | 15 | 标题入场动画帧数 |

## 各模板参数

### bullet-list

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `iconSize` | 64 | 图标容器尺寸 |
| `textFontSize` | 38 | 条目文字大小 |
| `spring.damping` | 15 | 弹簧阻尼（越大越平滑） |
| `spring.stiffness` | 120 | 弹簧刚度（越大越快） |

### big-number

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `numberFontSize` | 160 | 数字字号 |
| `countDurationRatio` | 0.5 | 计数动画占总时长比例 |
| `pulseScale` | 1.08 | 数字完成时的缩放脉冲 |

### comparison

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `leftColor` | `#FF6B6B` | 左列标签颜色 |
| `rightColor` | `#4ECDC4` | 右列标签颜色 |
| `dividerWidth` | 3 | 分隔线宽度 |

### quote

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `typewriterSpeed` | 1.5 | 每字符帧数（越小越快） |
| `cursorBlinkInterval` | 8 | 光标闪烁间隔帧数 |
| `quoteMarkOpacity` | 0.15 | 装饰引号透明度 |

### timeline

| 参数 | 默认值 | 说明 |
|------|--------|------|
| `dotSize` | 28 | 节点圆点尺寸 |
| `dotGlow` | true | 节点发光效果 |
| `nodeMarginBottom` | 48 | 节点间距 |
