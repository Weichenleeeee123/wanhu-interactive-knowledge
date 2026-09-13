# 玩乎浏览器扩展实施计划

**目标：** 在知乎阅读和写作页面直接选取文字、生成互动演示、插入当前页面；现有工坊承接完整编辑和分享。

**形态：** Chrome/Edge Manifest V3 扩展。页面右侧工作区用于输入与编辑；独立的正文演示卡片放在读者选中段落之后。写作时只读取明确选中或主动载入的编辑区文字，演示放在编辑区外，不向知乎编辑器写入非原生结构。提供可手动复制到文章中的分享链接。

**实现选择：** 使用 content script 的隔离环境和 Shadow DOM；复用现有 React 互动渲染组件，避免开放第三方站点嵌入整套网站所需的 iframe 安全例外。扩展后台只请求构建时指定的玩乎后端，不携带知乎账号 cookie 或 Access Secret。不接受页面 postMessage 发起生成。

**边界：** 插入仅改变本机 DOM；其他读者需要扩展或分享链接。已载入的演示按文章地址存于扩展本机存储，可以再次打开；文章内的玩乎分享链接由用户点击载入。首版不宣称所有读者自动发现作者演示，不自动发布知乎文章，不绕过付费、登录或折叠内容。

## 实施步骤

- [ ] `src/extension/protocol.ts`：允许的知乎主机、文章/回答身份、输入及保存数据校验；非知乎消息、过长文本、任意后端 URL 均拒绝。
- [ ] `src/extension/page-context.ts`：读取当前选区或用户指定的文章/编辑区，保留标题作者与文章 URL；多回答页仅选择最近的一份回答。定位段落锚点；找不到明确正文时提示选段，不抓整页。
- [ ] `src/extension/background.ts`：固定后端的生成与状态检查；仅扩展自己的顶层知乎 content script 可调用。每文章保存、读取演示；生成失败保留输入。
- [ ] `src/extension/content.tsx`、`panel.tsx`、`extension.css`：收起入口、右侧生成面板、选段刷新、模式选择、来源预览、加载与错误状态、插入/收起演示、打开工坊、复制分享链接。切换知乎页面时隔离工作状态。
- [ ] `scripts/build-extension.mjs`：打包全部执行代码及样式，生成 MV3 manifest，无远程脚本、无凭证、无文件删除；产物保存 `dist/extension`。
- [ ] 工坊接收 `/create#v1.<快照>`，创建独立作品；引用定位支持 Shadow DOM。
- [ ] 单元测试验证协议和来源身份；真实 Chromium 加载扩展，在明确标注的知乎结构测试页面验证读者、作者、分享、恢复、跨文章隔离、不修改编辑器正文和错误重试；另做真实知乎可访问页面的烟测，无法访问如实记录。
- [ ] 发布本地加载说明与可安装目录，重新验证 Web 回归。只本地构建与试用，不上传商店或部署。

## 官方依据

- Chrome content scripts：https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts
- Chrome cross-origin network requests：https://developer.chrome.com/docs/extensions/develop/concepts/network-requests
- Playwright 扩展测试：https://playwright.dev/docs/chrome-extensions

用户已提出并授权开发浏览器插件形态；沿用本轮产品功能和体验改进的授权继续实现，不重新开启可视化伴侣或部署流程。
