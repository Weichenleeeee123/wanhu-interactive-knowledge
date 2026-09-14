# 玩乎｜让知乎文章多一个“可以试一试”的入口

> 知乎黑客松「学习工具与知识生产」赛道 · 评审版产品说明书
> 项目：玩乎（Wanhu）｜版本：0.4.3｜更新：2026 年 9 月 14 日

**立即体验**

- 官网：[wanhu.asia](https://wanhu.asia)
- 安装插件：[wanhu.asia/extension](https://wanhu.asia/extension)
- 十篇真实知乎内容：[集中体验页](https://wanhu.asia/showcase)
- 插件下载：[wanhu-extension.zip](https://wanhu.asia/downloads/wanhu-extension.zip?v=0.4.3)

## 1. 我们解决的瞬间

知乎文章可以把道理讲得很清楚，却很难让读者亲手验证。读者记住了“换门有三分之二胜率”，仍可能觉得两扇门应该一人一半；看懂“学习率过大会发散”，却不知道下一步会发生什么。

创作者也面临同一个断点：一段文字明明适合看图、做选择、拖参数或走一遍流程，真正做成交互页面却需要额外的前端开发。

**玩乎把“读过”接成“做过”。** 作者在知乎写作时选中一段材料，玩乎帮忙组织讲解并推荐表达形式；作者核对后发布一个普通分享链接。读者打开文章时，插件识别链接或预制示例，把互动卡片放回原文附近，边读边试，再回到原文。

## 2. 两个入口，同一条理解路径

### 知乎插件：主入口

- **创作者**：打开知乎编辑器即进入“讲清楚”模式；选段后可先获得前提、论证跳步、类比和小提纲，再决定是否生成互动演示。
- **读者**：打开文章即可看到作者附带的卡片；重新选择任意段落，选区会自动更新，可直接解释、换例子或继续追问。值得动手的内容再生成演示。
- **正文内**：生成结果自动插入本机正文预览；分享时复制普通链接，作者手动粘贴到知乎文章，发布边界清楚。

### 网页工坊：完整承接

网页与插件使用同一套作品协议。创作者可导入知乎链接、编辑材料、调整分镜/分支/参数并打开读者预览；读者可从分享链接进入无插件阅读页，再带着当前问题回到侧边栏。跨端传递的是独立快照，旧版本不会被悄悄改写。

## 3. 为什么是知乎

知乎天然从问题开始，玩乎补上“验证”这一拍：

1. 从知乎原文提出一个具体疑问；
2. 预测或选择一个结果；
3. 拖动参数、点击对象或走一条分支；
4. 观察结果并对照原句；
5. 回到知乎继续阅读、讨论和引用。

原文链接、标题、作者和选段范围始终可回访。玩乎不搬走文章，不伪装原作者内容，不自动替用户发布；没有安装插件的读者仍可打开普通分享页。

## 4. 三分钟体验路线

打开[集中体验页](https://wanhu.asia/showcase)，先体验“TCP 三次握手”：依次发送 SYN、SYN+ACK、ACK，看两端状态变化。再打开“冷萃与冰美式”，切换制备路径，观察差异发生在哪一步。最后体验“热榜衰减”，拖动时间和衰减速度，对比曲线。

安装插件后访问对应知乎原文，十篇示例会自动识别并嵌入正文；卡片标注“玩乎为本文制作的演示 · 预制示例”。作者头像、昵称和原文保持原样。

![真实知乎原文内的自动嵌入](../public/submission-assets/current/curated-zhihu-tcp.png)

*真实知乎页面与插件自动嵌入实拍。*

## 5. 十篇真实知乎内容，十种“值得动手”的方式

以下演示均由项目方直接编写 React/SVG 和确定性计算，不调用产品内置模型生成，用于展示内容与形式的匹配。原文只提供问题和语境，玩乎原创互动层并保留来源。

| # | 知乎原文 | 互动形式 | 体验 |
|---|---|---|---|
| 01 | [十年码农内功：TCP篇](https://www.zhihu.com/tardis/bd/art/612982114) | 发送报文的 SVG 场景 | [打开](https://wanhu.asia/view?example=showcase-tcp-handshake) |
| 02 | [牛顿冷却定律在热度排行榜中的实践](https://www.zhihu.com/tardis/zm/art/656807488) | 时间与衰减曲线对照 | [打开](https://wanhu.asia/view?example=showcase-heat-decay) |
| 03 | [经典排序算法汇总](https://www.zhihu.com/tardis/bd/art/430367415) | 两队数字归并 | [打开](https://wanhu.asia/view?example=showcase-merge-sort) |
| 04 | [如何构建个人资料库与个人知识库？](https://www.zhihu.com/tardis/bd/ans/1310435050) | 可检索笔记桌 | [打开](https://wanhu.asia/view?example=showcase-notes-workflow) |
| 05 | [告别无效努力：这八本书将彻底颠覆你的阅读与学习方式](https://www.zhihu.com/tardis/bd/art/1961531467042633609) | 合上材料再转述 | [打开](https://wanhu.asia/view?example=showcase-active-reading) |
| 06 | [机会成本](https://www.zhihu.com/tardis/bd/art/4416452409) | 主观价值取舍计算 | [打开](https://wanhu.asia/view?example=showcase-opportunity-cost) |
| 07 | [冷萃咖啡和冰美式比有什么区别？](https://www.zhihu.com/tardis/bd/art/632439891) | 制备步骤切换 | [打开](https://wanhu.asia/view?example=showcase-coffee-process) |
| 08 | [相关性与因果有什么联系与区别？](https://www.zhihu.com/tardis/bd/ans/2319205611) | 共同原因与干预沙盘 | [打开](https://wanhu.asia/view?example=showcase-causal-evidence) |
| 09 | [高等植物和藻类的能量转换器：叶绿体](https://www.zhihu.com/tardis/bd/art/597424073) | 光能到化学能 SVG 流程 | [打开](https://wanhu.asia/view?example=showcase-chloroplast) |
| 10 | [C4植物的C4途径](https://www.zhihu.com/tardis/zm/art/682891737) | 碳跨细胞转移动画 | [打开](https://wanhu.asia/view?example=showcase-c4-transfer) |

![三次握手演示](../public/submission-assets/current/curated-tcp-handshake.png)

![咖啡制备对照](../public/submission-assets/current/curated-coffee-process.png)

## 6. 互动形式不是固定题库

玩乎把形式交给内容：

- **SVG 分镜**：对象移动、步骤推进、时间轴、暂停/单步/速度控制；
- **分支流程**：选择条件、回退重走、比较路径；
- **参数模型**：有明确数量关系时才出现滑杆、轨迹和对照组；
- **专用组件**：TCP、归并、咖啡、因果、生物过程等由项目方精做；
- **轻量辅助**：作者检查前提、跳步、类比和小提纲；读者获得解释、补概念和换例子。简单问题直接回答，不强迫生成整份作品。

AI 只输出经过 Zod 校验的教学结构、分镜对象、分支和受限参数；React/SVG 组件执行规则与计算。它不能生成任意脚本、虚构来源或代替作者确认事实。十篇预制作品是手作展品，实时生成则使用通用渲染器，两者明确区分。

## 7. 技术与社区融合

Next.js、React、TypeScript 和 Chrome/Edge Manifest V3 组成网页与插件；知乎官方搜索和活动知识接口提供可追溯材料；OAuth 提供授权入口和回到当前作品的身份体验。作品以压缩 URL 快照分享，草稿保存在浏览器本地。插件只在页面增加展示层，不读取知乎 Cookie、不自动发布、不绕过不可见内容。

分享链接是“持有链接即可阅读”的快照，不是权限控制。搜索结果可能只有摘要，不能当作全文；作者应核对 AI 讲解和互动假设。完整授权回调仍需真实用户登录验收，重启后内存会话需要重新登录。

## 8. 当前版本与下一步

当前可提交版本已经贯通：知乎插件/网页双入口、作者与读者两条流程、选段辅助、通用多形式生成、正文自动识别、十篇真实内容预制演示、编辑预览、快照分享和本地草稿。

下一步用真实使用数据观察三件事：创作者能否顺利完成第一次发布，读者是否真的完成一次互动，互动后的讨论是否回到知乎。再按这些证据增加经过验证的新组件，而不是把所有文章都套进同一种题型。

## 9. 结语

知乎擅长把问题讲深，玩乎希望让其中一个关键瞬间多一个动作：

> **读到一个观点，先别急着划走，玩一次，再决定自己是不是真的懂了。**

完整十篇来源与操作边界见[体验指南](real-article-demos.md)；项目代码见[公开仓库](https://github.com/Weichenleeeee123/wanhu-interactive-knowledge)。

