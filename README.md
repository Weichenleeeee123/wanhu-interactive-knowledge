# 知玩 · 可交互知识工坊

把想讲清楚或弄懂的知识点，变成可以预测、操作、观察和验证的互动作品。面向知乎黑客松「学习工具与知识生产」赛道。

首版支持梯度下降 `f(x)=x²` 和标准三门问题。知乎搜索提供真实摘要，AI 将选定材料组织成教学草稿；创作者编辑后生成分享链接。实验计算和挑战判分由固定组件执行。

## 启动

需要 Node.js 22。首次安装后启动：

```powershell
npm install
npm run dev
```

打开 <http://localhost:3000>。首页和两份示例不需要密钥。

开发脚本在 Windows 自动发现官方 `ZhihuCLI/current/zhihu-cli.exe`。如果 CLI 已通过官方认证并将凭据保存到系统凭证库，搜索和知乎生成即可复用该凭据；设置 `ZHIHU_GENERATION=0` 可关闭知乎生成。程序不会读取或导出凭证库里的明文密钥。其他安装位置可用绝对路径 `ZHIHU_CLI_PATH` 指定。

首次认证请使用官方 CLI 的交互式认证，或其 `auth set --secret-stdin` 安全输入方式。不要将真实密钥放进命令参数、源代码、前端环境变量或项目配置文件。

需要其他端口时，在 PowerShell 直接运行：

```powershell
node scripts/dev.mjs -p 3001
```

## 服务端配置

`.env.example` 只列配置名称。真实值请由部署平台 Secret 管理或服务进程环境注入。生产启动不会自动发现本机 CLI。

| 配置 | 用途 |
| --- | --- |
| `ZHIHU_ACCESS_SECRET` | 官方知乎搜索与可选知乎生成；优先于本机 CLI |
| `ZHIHU_GENERATION=1` | 开启知乎 `zhida-fast-1p5` 生成适配器 |
| `ZHIHU_CLI_PATH` | 官方可执行文件的绝对路径，本地开发可复用系统认证 |
| `AI_BASE_URL` | 可选兼容 Chat Completions 的 API 基址，如 `https://provider.example/v1` |
| `AI_MODEL` / `AI_API_KEY` | 与基址同时配置后优先使用该模型 |
| `TRUST_PROXY=1` | 仅在可信反向代理覆盖客户端转发头时开启 |
| `NEXT_DIST_DIR` | Next 构建目录；开发默认 `.next-dev`，生产默认 `.next` |

`/api/capabilities` 返回配置可用状态，实际认证及服务调用仍可能失败。失败会显示可重试的提示；示例始终可编辑。

## 使用

1. 进入「我想讲清楚」或「我想弄明白」，填写核心问题。
2. 搜索并选择最多三个知乎摘要，或粘贴关键段落。链接用于来源标注，不能自动提取整篇文章。
3. 确认使用标准模型，生成草稿。无关材料会返回不支持。
4. 核对讲解、编辑参数，在预览中完成实验和挑战。
5. 生成快照链接，或导出 JSON 作品和 Markdown 讲解。JSON 可再次导入。

有效草稿自动保存在当前浏览器，进入工坊后可明确选择恢复。分享 URL 的 `#` 后携带压缩后的作品快照，后续编辑不会改变旧链接。本机链接只能用于本机预览；部署到公开域名后再生成链接，其他人才能直接打开。长链接在部分聊天应用中可能受限，可改用 JSON 文件。

## 验证与构建

```powershell
npm test
npm run typecheck
```

先保持开发服务在 3000 端口运行，再执行浏览器测试（使用本机 Chrome）：

```powershell
npm run test:e2e
```

生产构建使用新目录，以保留已有构建产物：

```powershell
$env:NEXT_DIST_DIR = '.next-release-' + (Get-Date -Format 'yyyyMMdd-HHmmss')
npm run build
npm start
```

构建与启动必须使用相同的 `NEXT_DIST_DIR`。测试报告保存到 `.artifacts/`。项目遵守工作区要求，不执行文件清理或删除。

## 部署条件和边界

部署需要支持 Next.js 的 Node 服务，不能只托管静态 HTML。优先使用单实例和服务端知乎凭据；无需数据库。模型请求总时限 45 秒，托管平台及代理应至少允许 60 秒请求。

生成每 10 分钟最多 5 次，搜索每分钟最多 20 次；默认使用单实例共享计数。仅在可信代理环境启用 `TRUST_PROXY=1`，才按转发客户端地址区分。多实例部署需先将限流计数改为共享存储。

发布后需要用真实域名重新检验检索、两类生成、无关材料、以及另一浏览器中的分享链接。目前已验证本机完整流程，尚未公开部署。

知乎摘要可能缺公式和条件，不等于全文。AI 生成的教学文字仍需作者核对。引用链接不代表原作者参与或认可作品。首版不包含知乎站内嵌入、自动发布、账号授权、任意实验代码生成。

演示步骤见 [docs/demo-script.md](docs/demo-script.md)，实际验证记录见 [docs/validation.md](docs/validation.md)。
