# 玩乎品牌配色

以已选定的 `wanhu-cover-ai.png` 与 `wanhu-icon-ai.png` 为视觉依据。

| 用途 | 颜色 |
| --- | --- |
| 主操作、链接、品牌底色 | #0866ED |
| 悬停 | #004AC2 |
| 正文与标题 | #0C2B53 |
| 页面底色 | #F6F9FF |
| 内容卡片 | #FFFFFF |
| 浅蓝分区、选中底色 | #EDF5FF |
| 互动点缀 | #00BDB0 |
| 互动反馈文字 | #007C77 |
| 互动反馈底色 | #E7FAF6 |
| 提示、图形强调 | #FFAC24 |

共享色板：`src/app/brand-palette.css`。扩展构建会把全局 `:root` 转成 Shadow DOM 的 `:host`，插件不另设一套颜色值。

薄荷青和橙黄用于图形与强调；正文不直接使用这两种浅色。原有警告/错误颜色及实验中表达含义的颜色保留。

实测页面：首页、工坊、阅读页、作品库、390px 移动工坊；插件侧栏、正文卡片。视觉检查截图保存在 `.artifacts/wanhu-palette-review/`，扩展截图保存在本次 `extension-browser-*` 目录。

## 品牌图标

唯一源文件：`public/submission-assets/wanhu-icon-ai.png`。
运行 `node scripts/prepare-brand-assets.mjs` 可更新各尺寸 PNG、SVG favicon（内嵌原图）、ICO 和 Apple 图标。网页页头直接使用 `/icon.svg`，以兼容 Next 和公共部署版本；插件构建打包同源 128px 图片，并配置工具栏及扩展管理页 icons。

正式封面：`public/submission-assets/wanhu-cover-mascot-v4.png`。使用已授权的兼容 API、gpt-image-2 编辑，提示词见 `docs/wanhu-cover-mascot-prompt.txt`。封面中界面为 AI 宣传示意。
