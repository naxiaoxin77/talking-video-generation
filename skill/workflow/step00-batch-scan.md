# Step 0: 批量扫描工作流

## 触发条件
用户说：「生成今天的视频」「批量生成口播视频」「扫描今天的文章」

## 执行

```bash
# 扫描今天的文章
npm run batch

# 指定日期
npm run batch -- --date 2026-04-06
```

## 扫描逻辑
1. 扫描 Obsidian vault 中以下目录：
   - `03_Content_Factory/01_Final_Assets/深度blog/{today}/`
   - `03_Content_Factory/01_Final_Assets/短图文/{today}/`
2. 查找 `[终稿-图文]-*.md` 文件
3. 筛选条件：`video_status: "1"`
4. 读取文章 frontmatter 中的 `DYNAMIC_AVATAR` 值覆盖环境变量

## 每篇文章的处理流程
1. 读取 Markdown 内容（去掉 frontmatter）
2. Gemini 生成脚本 + 视频标题 + 视频简介
3. 动态 Avatar 生成（如果 DYNAMIC_AVATAR=true）
4. TTS + 数字人视频
5. Remotion 渲染
6. 保存视频到 `短视频/{today}/{slug}/video.mp4`
7. 生成 `metadata.md`（标题 + 简介 + 来源信息）
8. 更新原文 `video_status` → `"done"`

## 输出位置
```
01_Final_Assets/短视频/{today}/{today}-{slug}/
├── video.mp4
└── metadata.md
```

## 错误处理
- 单篇文章失败不影响后续文章
- 失败时自动清理临时文件
- 结束时输出汇总报告（成功/失败数量）
