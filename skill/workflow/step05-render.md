# Step 3: Remotion 视频渲染

> **执行者**: 脚本（Remotion bundler + renderer）
> **输入**: 所有素材 + `output/script.json`
> **输出**: `output/*.mp4`

## 目标

使用 Remotion 将所有素材合成为最终的 9:16 竖屏视频。

## 执行逻辑

**Bundling**：
- 入口文件：`src/remotion/Root.tsx`
- Webpack 打包所有 Remotion 组件
- 注意：Remotion 组件中的 import 不能使用 `.js` 后缀

**Composition 配置**：
- 分辨率：1080 x 1920（9:16 竖屏）
- 帧率：30 fps
- 总帧数：由 `calculateMetadata` 动态计算（段落时长之和 - 转场重叠）

**渲染内容**：
- Avatar 段：`<OffthreadVideo>` 播放口播视频 + 底部字幕
- B-roll 段：动画幻灯片（由 `slideData` 驱动）+ 音频 + 底部字幕
- 转场：0.5 秒 fade 过渡（TransitionSeries）

**幻灯片模板**（5 种）：
- `bullet-list`：要点列表，逐条滑入
- `big-number`：大数字计数动画
- `comparison`：左右对比列展示
- `quote`：打字机效果引用
- `timeline`：时间线节点逐个亮起

**设计参数**：
- 集中在 `src/remotion/design.config.ts`
- 中文字体：Noto Sans SC（@remotion/google-fonts）

## 输出

`output/*.mp4` — 最终视频文件（H.264 编码）
