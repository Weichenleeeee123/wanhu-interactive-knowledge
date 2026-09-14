# 玩乎 2026-09-14 发布记录

## 发布范围

- 十篇真实知乎文章/回答对应十份直接编写的 React/SVG 演示：TCP、热度衰减、归并排序、笔记整理、主动阅读、机会成本、咖啡制作、因果干预、叶绿体、C4 运输。未使用产品内置模型生成这十份作品。
- 新增 `/showcase` 集中入口；插件按原文 ID 自动嵌入，保留来源与预制标识。评审材料见 [十篇体验指南](../submission/real-article-demos.md)。
- 通用生成支持 SVG 分镜、分支路径、安全参数模型；十份专用手作组件不冒充实时生成结果。
- 发布网页、后端与 0.4.0 插件，下载地址为 `https://wanhu.asia/downloads/wanhu-extension.zip?v=0.4.0`。
- README、产品说明计划书、体验指南、验收记录同步更新，纠正旧服务器地址。

## 发布前证据

本轮已完成 103 项单元测试、44 项网页测试、9 项扩展测试及类型检查、生产构建。真实知乎实测十篇均加载正文并自动嵌入专用组件，详见 [能力验收](visual-showcase-validation.md)。不把测试成功等同于未来所有网络状态或所有知乎页面均可访问。

## 生产环境与发布方式

- 域名：`https://wanhu.asia`，Cloudflare 代理。
- 海外 VPS：`43.110.32.113`；Caddy → `127.0.0.1:3100`；systemd `wanhu.service`。
- 将 Git 已提交版本通过 `git archive` 打包到全新的 `/opt/wanhu/releases/<日期时间>-<提交短号>`，使用 `scripts/deploy-vps.sh` 安装依赖并在 Linux 构建。
- 服务密钥继续从 `/opt/wanhu/shared/app.env` 读取，不进入 Git 或源码包。
- 构建成功后才切换服务；旧版本、压缩包、systemd 配置备份全部保留，不删除任何文件。基础健康检查失败时自动还原原服务配置。
- 本地开发者模式扩展更新：在扩展管理页重新加载 `dist/extension-public`，随后刷新知乎。通过 zip 安装的用户需把新版文件解压覆盖原安装目录，再重新加载。

## 本次执行

- 状态：2026-09-14 已推送 GitHub `master` 并部署成功。
- 功能提交：`41c50205ad8a2c348abd782ecff17dae8b639e69`；部署构建提交：`5364228d9ccd07f473769b3322323c687d69b431`（增加 shell 脚本 LF 换行规则）。后续验收记录提交只更新本文。
- 生产版本目录：`/opt/wanhu/releases/20260914-193336-5364228`，目录内 `REVISION` 与上述构建提交相符；systemd 状态 `active`。
- 旧版本保留：`/opt/wanhu/releases/20260913-221231`。服务备份：`/opt/wanhu/shared/wanhu.service.20260914-193336-5364228.backup`。
- Linux 上 `npm ci`、Next.js 生产编译、TypeScript 检查、23 个页面生成完成后切换服务。
- 正式 HTTPS 域名检查：首页、`/create`、`/showcase`、`/extension`、`/view?example=showcase-tcp-handshake`、`/api/capabilities` 均为 HTTP 200。能力接口返回搜索与生成已配置；这项检查不代替真实模型生成质量评测。
- 面向正式域名执行 `TEST_BASE_URL=https://wanhu.asia npx playwright test tests/curated-experiences.spec.ts`：**8/8 通过（42.6 秒）**。覆盖全部十个专用组件、390px 宽度、TCP 状态、归并操作、咖啡切换、机会成本、因果干预、笔记检索、私有转述、植物演示以及分享还原；预制体验不请求生成接口。
- Cloudflare 下插件下载 `?v=0.4.0`：HTTP 200，1,413,810 字节，与本地发布包 SHA-256 一致：`8e98ac95370f3c0ded1f188f2c64ef9b9f4be53850b4534a701a4670e9e17f03`。
- 本地原始线上检查记录保存在 `.artifacts/production-check-20260914.json`；其中无访问密钥。测试与截图旧文件保留在本地，未混入正式发布内容。
- 首次部署脚本预检发现 Windows `git archive` 的 CRLF 换行问题，尚未切换服务便停止；加入 `.gitattributes` 后以新提交重新打包成功。未删除任何文件。

## 回退方式

将本次保留的 `wanhu.service.<发布目录名>.backup` 复制覆盖 `/etc/systemd/system/wanhu.service`，执行 `systemctl daemon-reload` 和 `systemctl restart wanhu`。旧版本目录始终保留；回退后重新检查域名页面与服务状态。
