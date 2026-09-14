import { LessonSchema, type Lesson, type Source } from "./lesson";
import type {
  SceneAnimationData,
  BranchingPathData,
} from "./visual-experiences";
import type { InteractiveModel } from "./interactive-model";

type Visual = SceneAnimationData | BranchingPathData | InteractiveModel;
type VisualSpec =
  | Omit<SceneAnimationData, "evidence">
  | Omit<BranchingPathData, "evidence">
  | Omit<InteractiveModel, "evidence">;
type ObjectItem = SceneAnimationData["objects"][number];
const objectDetails: Record<string, string> = {
  client: "连接发起方。发出 SYN，收到 SYN + ACK 后发送最终确认。",
  server: "接收连接请求的一方。响应 SYN + ACK，并等待客户端的最终 ACK。",
  syn: "客户端发往服务端的连接请求。SYN 用于同步初始化序列号。",
  synack: "服务端同时发送自己的 SYN，并确认客户端的 SYN，因此沿反方向传回。",
  ack: "客户端确认服务端的 SYN。该报文到达后，本图所展示的成功握手完成。",
  one: "蓝色有序序列 [1,4] 的首项。因为 1 小于另一序列首项 2，所以先进入输出区。",
  four: "蓝色序列的第二项。取出 1 后，4 依次与 2、3 比较，最后才被取出。",
  two: "橙色有序序列 [2,3] 的首项。取出蓝色 1 后，2 小于剩余的 4。",
  three: "橙色序列第二项。3 仍小于 4，因此会紧随橙色 2 进入输出区。",
  light:
    "光反应利用光能。光图形的消失表示能量转换，不表示光被运送到碳同化反应中。",
  membrane: "类囊体膜是光反应的重要场所；本图不展示膜内电子传递的细节。",
  energy:
    "ATP 和 NADPH 为碳同化提供能量与还原力。合并为一个标记，不表示它们是同一种物质。",
  carbon: "碳同化利用 ATP 和 NADPH 等，把无机碳转入有机物。",
  sugar: "有机产物的示意标记，不对应一个特定糖分子或实际产率。",
  mesophyll:
    "C4 植物中，初步固定无机碳的叶肉细胞。这里仅呈现细胞层面，不画亚细胞反应位置。",
  sheath: "接收四碳酸的维管束鞘细胞。四碳酸在这里释放 CO₂，供后续同化。",
  co2: "用一个圆形代表无机碳进入与释放环节，并不表示真实分子数量。",
  acid: "携带碳的四碳有机酸，从叶肉细胞转运至维管束鞘细胞。本图省略返回和再生步骤。",
};
const object = (
  id: string,
  label: string,
  color: ObjectItem["color"] = "blue",
  shape: ObjectItem["shape"] = "rect",
): ObjectItem => ({
  id,
  label,
  color,
  shape,
  detail: objectDetails[id] ?? label,
});
const pose = (
  id: string,
  x: number,
  y: number,
  opacity = 1,
  width = 100,
  height = 45,
  rotation = 0,
) => ({ id, x, y, opacity, width, height, rotation });
const frame = (
  title: string,
  caption: string,
  poses: SceneAnimationData["frames"][number]["poses"],
) => ({ title, caption, poses });
const node = (
  id: string,
  title: string,
  body: string,
  choices: [string, string][] = [],
) => ({
  id,
  title,
  body,
  choices: choices.map(([label, target]) => ({ label, target })),
});
const branch = (
  nodes: BranchingPathData["nodes"],
): Omit<BranchingPathData, "evidence"> => ({
  type: "branching-path",
  start: nodes[0].id,
  nodes,
  rationale:
    "把材料中的区别变成可比较的行动路径。读者可以返回换条件，无需回答标准答案。",
  assumptions:
    "玩乎编写的教学情境，聚焦原文一个要点；路径不是原作者提供的判断工具，也不代表适用于所有人。",
});
const scene = (
  objects: ObjectItem[],
  frames: SceneAnimationData["frames"],
): Omit<SceneAnimationData, "evidence"> => ({
  type: "scene-animation",
  objects,
  frames,
  rationale: "用图形的位置、显隐和方向呈现原文的过程，允许逐帧观察与回放。",
  assumptions:
    "玩乎原创示意图，形状、距离、速度不按真实比例，仅展示原文中选定的机制，不复刻原文图片。",
});
export type ShowcaseEntry = {
  id: string;
  articleKey: string;
  source: Source;
  takeaway: string;
  steps: string;
  verifiedOn: string;
  lesson: Lesson;
};
function entry(
  id: string,
  articleKey: string,
  title: string,
  url: string,
  author: string,
  quote: string,
  takeaway: string,
  steps: string,
  exp: VisualSpec,
): ShowcaseEntry {
  const source: Source = {
    id: `showcase-${id}`,
    title,
    url,
    author,
    excerpt: quote,
    provenance: "user",
    contentScope: "search-excerpt",
  };
  const lesson = LessonSchema.parse({
    version: 1,
    origin: "manual",
    title: takeaway,
    intro: "玩乎为这篇真实知乎内容预先制作的互动讲解。先体验，再回到原文核对。",
    goal: takeaway,
    prediction: "先想想：改变其中一个条件，过程会发生什么变化？",
    observation: steps,
    explanation:
      "这份演示聚焦原文中的一个机制。图示情境和参数由玩乎编写，不能替代完整文章，也不表示原作者参与或认可。",
    challenge: "把演示观察与原文的适用条件联系起来，区分图示简化与现实情况。",
    experiment: { ...exp, evidence: { sourceId: source.id, quote } },
    sources: [source],
    sourceIds: [source.id],
  });
  return {
    id,
    articleKey,
    source,
    takeaway,
    steps: curatedSteps[id] ?? steps,
    verifiedOn: "2026-09-14",
    lesson,
  };
}

const tcpObjects = [
  object("client", "客户端"),
  object("server", "服务端", "green"),
  object("syn", "SYN", "orange", "arrow"),
  object("synack", "SYN + ACK", "purple", "arrow"),
  object("ack", "ACK", "blue", "arrow"),
];
const tcpFrame = (
  title: string,
  caption: string,
  xs: number[],
  visible: number[],
) =>
  frame(title, caption, [
    pose("client", 100, 100),
    pose("server", 540, 100),
    pose("syn", xs[0], 175, visible[0], 90, 24),
    pose("synack", xs[1], 230, visible[1], 110, 24, 180),
    pose("ack", xs[2], 280, visible[2], 90, 24),
  ]);
const curatedSteps: Record<string, string> = {
  "tcp-handshake":
    "依次点击发送 SYN、返回 SYN + ACK、发送最终 ACK，观察浏览器与服务器的状态；可回看上一步。",
  "heat-decay":
    "拖动时间与衰减速度，比较当前内容与固定 k=0.06 对照；数值为教学设定。",
  "merge-sort":
    "点击 A、B 两队的首个数字，完成六个数字的归并。试着先取较大的数字，再观察连续取同一侧的情况。",
  "notes-workflow":
    "整理笔记桌面，搜索“咖啡”或“证据”，打开卡片找回主题、关联与上下文。六张笔记是原创操作样本。",
  "active-reading":
    "阅读左页，合上材料，用自己的话转述，然后重新打开自行核对。文字不发送模型，不自动判分。",
  "opportunity-cost":
    "选择一个下午的安排，再调节三个选项的主观价值；观察最高价值的被放弃项如何改变。",
  "coffee-process":
    "切换冷萃与冰美式，点击备料、萃取和成品步骤，比较低温发生在萃取还是饮用阶段。",
  "causal-evidence":
    "先改变共同原因 C 看 A、B 同变，再切换“只改变 A”，观察 B 保持不变；这是明确指定因果结构的玩具模型。",
  chloroplast:
    "打开光源，推进到能量接力与有机物形成，观察类囊体、ATP/NADPH 与碳同化的联系。",
  "c4-transfer":
    "依次推进进入、固定、运输、释放，让四碳酸载体从叶肉细胞移动到维管束鞘细胞。",
};
const plantObjects = [
  object("light", "光能", "orange", "circle"),
  object("membrane", "类囊体", "green"),
  object("energy", "ATP / NADPH", "purple"),
  object("carbon", "碳同化", "blue"),
  object("sugar", "有机物", "green", "circle"),
];
export const showcase: ShowcaseEntry[] = [
  entry(
    "tcp-handshake",
    "art:612982114",
    "十年码农内功：TCP篇",
    "https://www.zhihu.com/tardis/bd/art/612982114",
    "科英",
    "同步双方的初始化序列号",
    "三次握手：三个报文往哪走？",
    "播放三次报文传递，再拖动进度回看每次发送与接收。",
    scene(tcpObjects, [
      tcpFrame(
        "准备发起连接",
        "客户端准备发送 SYN；这幅图仅展示成功建立连接时的三个报文方向。",
        [100, 540, 100],
        [1, 0, 0],
      ),
      tcpFrame(
        "SYN 到达服务端",
        "服务端收到客户端的连接请求。此时开始准备 SYN + ACK。",
        [540, 540, 100],
        [1, 1, 0],
      ),
      tcpFrame(
        "SYN + ACK 返回",
        "服务端的响应抵达客户端。客户端准备发送最终确认。",
        [540, 100, 100],
        [1, 1, 1],
      ),
      tcpFrame(
        "ACK 到达服务端",
        "最终确认抵达服务端。示意省略序列号、状态机与重传；完整规则请对照原文。",
        [540, 100, 540],
        [1, 1, 1],
      ),
    ]),
  ),
  entry(
    "heat-decay",
    "art:656807488",
    "牛顿冷却定律在热度排行榜中的实践：保持内容新鲜的科学方法",
    "https://www.zhihu.com/tardis/zm/art/656807488",
    "南山",
    "较小的k值导致热度冷却得较慢",
    "热榜上的旧内容，怎样逐渐降温？",
    "固定一条衰减曲线作对照，改变衰减系数，逐小时观察同一起始分数的变化。",
    {
      type: "interactive-model",
      duration: 24,
      stepLabel: "小时",
      rules:
        "每小时：新分数=上一小时分数×exp(−衰减系数)。这是指数衰减，不是与时间成反比。",
      assumptions:
        "仅采用原文的指数衰减公式，不沿用其中“与时间成反比”的不准确说法。初始100分、k=0.1均为教学设定；忽略新增点赞与其他权重，不代表知乎真实热榜算法或实际热度。",
      controls: [
        {
          id: "initial",
          label: "初始分数",
          unit: "分",
          min: 10,
          max: 200,
          step: 10,
          value: 100,
        },
        {
          id: "decay",
          label: "衰减系数",
          unit: "/小时",
          min: 0,
          max: 0.5,
          step: 0.01,
          value: 0.1,
        },
      ],
      stocks: [
        {
          id: "heat",
          label: "剩余分数",
          unit: "分",
          initial: "initial",
          next: "heat*exp(-decay)",
        },
      ],
    },
  ),
  entry(
    "merge-sort",
    "art:430367415",
    "经典排序算法汇总",
    "https://www.zhihu.com/tardis/bd/art/430367415",
    "AItimeHub",
    "将已有序的子序列合并",
    "归并的一步：两排数字怎样合成一排？",
    "从 [1,4] 和 [2,3] 开始，逐幕比较两边尚未取出的首项。观察它并不是机械地左右交替。",
    scene(
      [
        object("one", "1", "blue"),
        object("four", "4", "blue"),
        object("two", "2", "orange"),
        object("three", "3", "orange"),
      ],
      [
        frame(
          "两边已经有序",
          "蓝色 [1,4]，橙色 [2,3]。下面空出的行是输出区；只演示合并步骤，不展开递归拆分。",
          [
            pose("one", 130, 100),
            pose("four", 260, 100),
            pose("two", 400, 100),
            pose("three", 530, 100),
          ],
        ),
        frame(
          "比较 1 和 2，取 1",
          "从蓝色序列取出 1；蓝色下一项变成 4，橙色仍从 2 开始。",
          [
            pose("one", 100, 250),
            pose("four", 260, 100),
            pose("two", 400, 100),
            pose("three", 530, 100),
          ],
        ),
        frame(
          "比较 4 和 2，取 2",
          "较小的 2 放进输出区。每次只比较两边剩余序列的第一项。",
          [
            pose("one", 100, 250),
            pose("four", 260, 100),
            pose("two", 240, 250),
            pose("three", 530, 100),
          ],
        ),
        frame(
          "比较 4 和 3，取 3",
          "连续从橙色序列取出 2、3，说明归并不是机械交替。",
          [
            pose("one", 100, 250),
            pose("four", 260, 100),
            pose("two", 240, 250),
            pose("three", 380, 250),
          ],
        ),
        frame(
          "橙色取空，补上 4",
          "最终从左到右为 [1,2,3,4]。颜色保留来源，位置表示输出顺序。",
          [
            pose("one", 100, 250),
            pose("four", 520, 250),
            pose("two", 240, 250),
            pose("three", 380, 250),
          ],
        ),
      ],
    ),
  ),
  entry(
    "notes-workflow",
    "ans:1310435050",
    "如何构建个人资料库与个人知识库？",
    "https://www.zhihu.com/tardis/bd/ans/1310435050",
    "白馥芮",
    "能迅速查找到所需内容",
    "笔记该记什么，才能再次用起来？",
    "选择“找内容”或“共享笔记”，分别走一遍笔记使用路径，再返回比较。",
    branch([
      node(
        "start",
        "现在要用笔记做什么？",
        "围绕原回答的记录、检索和共享，选择当前任务。",
        [
          ["找回过去的内容", "find"],
          ["与同伴共享笔记", "share"],
        ],
      ),
      node(
        "find",
        "留下可检索的线索",
        "用主题、关键词和背景帮助未来找到它。这是检索路径的起点。",
        [
          ["已经找到所需内容", "reuse"],
          ["线索仍不够清楚", "context"],
        ],
      ),
      node(
        "share",
        "记录任务上下文",
        "为同伴补充主题、背景与关键问题，使共享内容可以被读懂。这是玩乎编写的应用情境。",
        [["补齐共享信息", "reuse"]],
      ),
      node(
        "context",
        "补充背景与关联",
        "本次可回到原材料查证。下次记录时，把检索需要的线索一起留下。",
      ),
      node(
        "reuse",
        "让记录进入实际工作",
        "找到、读懂并使用这条记录。返回起点比较另一类用途。",
      ),
    ]),
  ),
  entry(
    "active-reading",
    "art:1961531467042633609",
    "告别无效努力：这八本书将彻底颠覆你的阅读与学习方式",
    "https://www.zhihu.com/tardis/bd/art/1961531467042633609",
    "咩小漫",
    "带着问题阅读",
    "从“读过了”走到“能说清楚”",
    "选择自己的阅读状态，探索主动回忆、回到原文与输出之间的路径。",
    branch([
      node(
        "start",
        "读完这一段之后",
        "暂停看原文，试着用自己的话讲一遍。这里只提供练习路径，不评定学习能力。",
        [
          ["能够独立讲出核心意思", "apply"],
          ["说不清关键关系", "return"],
        ],
      ),
      node(
        "return",
        "带着具体问题重读",
        "找出卡住的概念或前提，再回原文定位依据。",
        [["定位到不懂的部分", "retell"]],
      ),
      node("retell", "重新组织一遍表达", "用短句转述，并保留原文的重要条件。", [
        ["尝试举一个新例子", "apply"],
        ["仍有疑问，记录待查", "question"],
      ]),
      node(
        "apply",
        "换个例子检查理解",
        "把概念放进新的情境，检查是否仍说得通。这是一次输出练习，不保证长期记忆。",
      ),
      node(
        "question",
        "保留一个可追问的问题",
        "下次带着它继续阅读或检索，避免把模糊熟悉感当作理解。",
      ),
    ]),
  ),
  entry(
    "opportunity-cost",
    "art:4416452409",
    "机会成本",
    "https://www.zhihu.com/tardis/bd/art/4416452409",
    "Violetta San",
    "放弃的其他用途中所能得到的最高收益",
    "选了一件事，究竟放弃了什么？",
    "在同一个周末选择不同安排，观察被放弃的最佳替代项，而非累加全部选项。",
    branch([
      node(
        "start",
        "周末只有一段可用时间",
        "教学情境：你可以写文章、参加活动或休息。价值排序由你判断，不换算成收入。",
        [
          ["选择写文章", "write"],
          ["选择参加活动", "event"],
          ["选择休息", "rest"],
        ],
      ),
      node(
        "write",
        "写文章的替代项",
        "被放弃的是活动与休息，其中对你更有价值的那一个构成机会成本。",
        [
          ["活动更有价值", "social"],
          ["休息更有价值", "recovery"],
        ],
      ),
      node(
        "event",
        "参加活动的替代项",
        "比较写文章和休息，取你认为更有价值的替代项；不能把两者全部相加。",
        [
          ["写文章更有价值", "creation"],
          ["休息更有价值", "recovery"],
        ],
      ),
      node(
        "rest",
        "休息的替代项",
        "比较写文章和活动。这不是说休息没有价值，而是帮助看清取舍。",
        [
          ["写文章更有价值", "creation"],
          ["活动更有价值", "social"],
        ],
      ),
      node(
        "creation",
        "最佳替代项：创作",
        "这条路径把被放弃的创作机会作为机会成本。",
      ),
      node(
        "social",
        "最佳替代项：活动",
        "这条路径把被放弃的活动机会作为机会成本。",
      ),
      node(
        "recovery",
        "最佳替代项：休息",
        "这条路径把被放弃的休息机会作为机会成本。",
      ),
    ]),
  ),
  entry(
    "coffee-process",
    "art:632439891",
    "冷萃咖啡和冰美式比有什么区别？",
    "https://www.zhihu.com/tardis/bd/art/632439891",
    "知乎知物咖啡",
    "冷萃则是冷水萃取咖啡",
    "冷萃与冰美式，差别发生在哪一步？",
    "沿两种制备路径探索，区分萃取时的温度和最终饮用温度。",
    branch([
      node(
        "start",
        "最终都是一杯冷咖啡",
        "从萃取环节开始比较，而不是只看杯中有没有冰。",
        [
          ["走冷萃路径", "cold"],
          ["走冰美式路径", "hot"],
        ],
      ),
      node(
        "cold",
        "用冷水萃取",
        "以低温和较长接触时间提取咖啡成分，具体条件依配方而变。",
        [["继续观察成品", "coldend"]],
      ),
      node("hot", "热水萃取浓缩", "先制成浓缩咖啡，再通过加水和冰降温。", [
        ["加水与冰", "iceend"],
      ]),
      node(
        "coldend",
        "低温发生在萃取阶段",
        "冷萃是过程特征。返回比较热萃后再降温的路径。",
      ),
      node(
        "iceend",
        "低温发生在成品阶段",
        "杯中变冷，不等于之前用冷水萃取。这是两条路径的关键差别。",
      ),
    ]),
  ),
  entry(
    "causal-evidence",
    "ans:2319205611",
    "相关性与因果有什么联系与区别？",
    "https://www.zhihu.com/tardis/bd/ans/2319205611",
    "人民邮电出版社",
    "A和B是由同一个原因造成的",
    "看到一起变化，下一步该查什么？",
    "选择时间先后或共同原因两条调查路径，比较为什么仅有相关仍不足以判定因果。",
    branch([
      node(
        "start",
        "A 和 B 经常一起出现",
        "仅观察到共同出现，还不能确定原因。本流程是查证路径，不是因果判定器。",
        [
          ["先检查时间顺序", "order"],
          ["寻找共同原因 C", "common"],
        ],
      ),
      node(
        "order",
        "A 总在 B 之前？",
        "先发生不自动等于造成后发生。时间顺序可以提供线索，但不能替代机制证据。",
        [
          ["继续寻找其他解释", "common"],
          ["尚无更多证据", "unknown"],
        ],
      ),
      node(
        "common",
        "C 可能同时影响 A、B",
        "原文提出 C→A 且 C→B 的结构。在这个结构里，A、B 可以相关，却没有 A→B。",
        [
          ["发现了可能的 C", "test"],
          ["暂时找不到 C", "unknown"],
        ],
      ),
      node(
        "test",
        "设计进一步查证",
        "比较条件，检查测量与机制，必要时设计合适的实验。找到候选解释仍不等于已经证明它。",
      ),
      node(
        "unknown",
        "暂时只能描述相关",
        "明确还缺哪些证据，保留多种解释。返回起点试另一条查证路径。",
      ),
    ]),
  ),
  entry(
    "chloroplast",
    "art:597424073",
    "高等植物和藻类的能量转换器：叶绿体",
    "https://www.zhihu.com/tardis/bd/art/597424073",
    "卧龙05学长国涛",
    "将光能转换为化学能",
    "叶绿体里的能量接力",
    "播放光能到化学能再到有机物的示意，点图形查看对象；不把它当完整生化反应。",
    scene(plantObjects, [
      frame(
        "光能进入",
        "以光反应和碳同化两个环节示意能量转换，省略具体分子反应。",
        [
          pose("light", 90, 200, 1, 55, 55),
          pose("membrane", 280, 120),
          pose("energy", 280, 220, 0),
          pose("carbon", 490, 120),
          pose("sugar", 530, 230, 0, 55, 55),
        ],
      ),
      frame(
        "光反应转换能量",
        "光反应利用光能生成 ATP 和 NADPH 等分子；这里省略电子传递和水分解细节。",
        [
          pose("light", 280, 200, 0, 55, 55),
          pose("membrane", 280, 120),
          pose("energy", 280, 220, 1),
          pose("carbon", 490, 120),
          pose("sugar", 530, 230, 0, 55, 55),
        ],
      ),
      frame(
        "连接碳同化",
        "ATP 和 NADPH 为后续碳同化提供支持。图形移动表示功能联系，不是实际运动轨迹。",
        [
          pose("light", 280, 200, 0, 55, 55),
          pose("membrane", 280, 120),
          pose("energy", 490, 220, 1),
          pose("carbon", 490, 120),
          pose("sugar", 530, 230, 0, 55, 55),
        ],
      ),
      frame(
        "有机物形成",
        "两阶段相互联系。本示意没有表达反应计量，不能从图形数量推断产率。",
        [
          pose("light", 280, 200, 0, 55, 55),
          pose("membrane", 280, 120),
          pose("energy", 400, 220, 0.3),
          pose("carbon", 490, 120),
          pose("sugar", 550, 230, 1, 55, 55),
        ],
      ),
    ]),
  ),
  entry(
    "c4-transfer",
    "art:682891737",
    "C4植物的C4途径",
    "https://www.zhihu.com/tardis/zm/art/682891737",
    "高中生物",
    "四碳酸被运送到维管束鞘细胞中",
    "C4 途径：碳如何跨细胞转移？",
    "拖动分镜，观察固定、运输和释放三个环节；回原文核对教材对具体场所的表述。",
    scene(
      [
        object("mesophyll", "叶肉细胞", "green"),
        object("sheath", "维管束鞘细胞", "blue"),
        object("co2", "CO₂", "gray", "circle"),
        object("acid", "四碳酸", "orange", "circle"),
      ],
      [
        frame(
          "进入叶肉细胞",
          "只讨论细胞层面的联系，不断言原文讨论的亚细胞场所争议。",
          [
            pose("mesophyll", 160, 120, 1, 145, 80),
            pose("sheath", 490, 120, 1, 145, 80),
            pose("co2", 80, 235, 1, 55, 55),
            pose("acid", 160, 235, 0, 60, 60),
          ],
        ),
        frame(
          "形成四碳化合物",
          "用一个图形代表形成四碳有机酸的环节，省略反应计量。",
          [
            pose("mesophyll", 160, 120, 1, 145, 80),
            pose("sheath", 490, 120, 1, 145, 80),
            pose("co2", 160, 235, 0, 55, 55),
            pose("acid", 160, 235, 1, 60, 60),
          ],
        ),
        frame("运输到另一类细胞", "四碳酸的移动用来示意跨细胞运输。", [
          pose("mesophyll", 160, 120, 1, 145, 80),
          pose("sheath", 490, 120, 1, 145, 80),
          pose("co2", 490, 235, 0, 55, 55),
          pose("acid", 490, 235, 1, 60, 60),
        ]),
        frame(
          "释放 CO₂",
          "四碳酸释放 CO₂，供后续同化使用。完整循环还包括返回与再生，本图未展开。",
          [
            pose("mesophyll", 160, 120, 1, 145, 80),
            pose("sheath", 490, 120, 1, 145, 80),
            pose("co2", 550, 235, 1, 55, 55),
            pose("acid", 400, 235, 0.25, 60, 60),
          ],
        ),
      ],
    ),
  ),
];

export function zhihuArticleKey(value: string): string | null {
  try {
    const url = new URL(value);
    if (
      url.protocol !== "https:" ||
      !["www.zhihu.com", "zhihu.com", "zhuanlan.zhihu.com"].includes(
        url.hostname,
      )
    )
      return null;
    const path = url.pathname.replace(/\/$/, "");
    const article =
      path.match(/^\/p\/(\d+)$/) ??
      path.match(/^\/tardis\/[a-z]+\/art\/(\d+)$/);
    if (article) return `art:${article[1]}`;
    const answer =
      path.match(/^\/question\/\d+\/answer\/(\d+)$/) ??
      path.match(/^\/tardis\/[a-z]+\/ans\/(\d+)$/);
    return answer ? `ans:${answer[1]}` : null;
  } catch {
    return null;
  }
}
export function showcaseForUrl(url: string) {
  const key = zhihuArticleKey(url);
  return showcase.find((item) => item.articleKey === key) ?? null;
}
