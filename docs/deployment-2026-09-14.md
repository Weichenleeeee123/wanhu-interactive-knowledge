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

正在发布；提交编号、远端目录、线上功能检查及下载包校验结果将在发布完成后补记。

## 回退方式

将本次保留的 `wanhu.service.<发布目录名>.backup` 复制覆盖 `/etc/systemd/system/wanhu.service`，执行 `systemctl daemon-reload` 和 `systemctl restart wanhu`。旧版本目录始终保留；回退后重新检查域名页面与服务状态。
