"use client";
import { useState, type ReactNode } from "react";
import type { Lesson } from "@/lib/lesson";
import { showcase } from "@/lib/showcase";

// These presentations are deliberately authored code, never an LLM response.
// Edits to a portable lesson use the regular renderer, so the preview cannot silently ignore edits.
export function curatedEntry(lesson: Lesson) {
  return showcase.find(
    (item) =>
      item.lesson.sources[0].id === lesson.sources[0]?.id &&
      JSON.stringify(item.lesson) === JSON.stringify(lesson),
  );
}
type Activity = { onActivity: (text: string) => void };
const titles: Record<string, [string, string, string]> = {
  "tcp-handshake": [
    "01 / NETWORK LAB",
    "一条连接，需要打几次招呼？",
    "亲手发送三个报文，看两端的状态如何改变。",
  ],
  "heat-decay": [
    "02 / TIME & ATTENTION",
    "热度，也会慢慢冷下来。",
    "把时间向前拨，比较不同衰减速度下的同一篇内容。",
  ],
  "merge-sort": [
    "03 / ALGORITHM PLAYGROUND",
    "把两队数字，合成一队。",
    "每次只取两队最前面较小的数字。你来完成这次归并。",
  ],
  "notes-workflow": [
    "04 / YOUR SECOND BRAIN",
    "收藏了，然后呢？",
    "试着从一桌笔记中找回一个知识点，再看看关联能帮什么忙。",
  ],
  "active-reading": [
    "05 / READING STUDIO",
    "眼熟，和读懂，差一步。",
    "合上材料，用自己的话讲一遍。这里没有分数，只有你的表达。",
  ],
  "opportunity-cost": [
    "06 / THE ART OF CHOOSING",
    "选中的之外，才是代价。",
    "一个下午只能做一件事。机会成本是被放弃的最佳选择。",
  ],
  "coffee-process": [
    "07 / COFFEE ATELIER",
    "同样冰凉，来路不同。",
    "跟着咖啡从粉到杯，看看“冷”到底发生在哪一步。",
  ],
  "causal-evidence": [
    "08 / CAUSAL DETECTIVE",
    "一起变化，就有因果吗？",
    "先改变共同原因，再只改变其中一项。看连线，也看结果。",
  ],
  chloroplast: [
    "09 / INSIDE A LEAF",
    "把一束光，变成生长的能量。",
    "打开光源，走进叶绿体里的能量接力。",
  ],
  "c4-transfer": [
    "10 / CARBON JOURNEY",
    "一份碳，经过两间“车间”。",
    "跟随碳的载体，观察它怎样从叶肉细胞去往维管束鞘细胞。",
  ],
};
export function CuratedExperience({
  lesson,
  onActivity,
}: { lesson: Lesson } & Activity) {
  const entry = curatedEntry(lesson);
  if (!entry) return null;
  const [eyebrow, title, intro] = titles[entry.id];
  const demos: Record<string, (props: Activity) => ReactNode> = {
    "tcp-handshake": TcpLab,
    "heat-decay": HeatLab,
    "merge-sort": MergeLab,
    "notes-workflow": NotesLab,
    "active-reading": ReadingLab,
    "opportunity-cost": ChoiceLab,
    "coffee-process": CoffeeLab,
    "causal-evidence": CausalLab,
    chloroplast: LeafLab,
    "c4-transfer": CarbonLab,
  };
  const Demo = demos[entry.id];
  return (
    <section className={`curated curated-${entry.id}`} aria-label={title}>
      <header className="curated-heading">
        <span>{eyebrow}</span>
        <h2>{title}</h2>
        <p>{intro}</p>
      </header>
      <Demo onActivity={onActivity} />
      <footer className="curated-source">
        <span>玩乎手作演示</span>
        <a href={entry.source.url} target="_blank" rel="noreferrer">
          原文 · {entry.source.author} ↗
        </a>
      </footer>
      <details className="curated-evidence">
        <summary>对照原文与演示边界</summary>
        <strong>{entry.source.title}</strong>
        <blockquote>{entry.source.excerpt}</blockquote>
        <p>
          {"assumptions" in lesson.experiment
            ? lesson.experiment.assumptions
            : ""}
        </p>
        <p>
          这份演示由玩乎直接编写，不调用内置生成模型；只讲解原文的一个要点，不代表原作者参与或认可。
        </p>
      </details>
    </section>
  );
}
function Insight({
  children,
  label = "此刻发生了什么",
}: {
  children: ReactNode;
  label?: string;
}) {
  return (
    <div className="curated-insight" aria-live="polite">
      <span>{label}</span>
      <p>{children}</p>
    </div>
  );
}
function Steps({
  labels,
  step,
  setStep,
}: {
  labels: string[];
  step: number;
  setStep: (step: number) => void;
}) {
  return (
    <div className="curated-steps">
      {labels.map((label, i) => (
        <button
          key={label}
          aria-pressed={step === i}
          onClick={() => setStep(i)}
        >
          <b>{String(i + 1).padStart(2, "0")}</b>
          <span>{label}</span>
        </button>
      ))}
    </div>
  );
}
function TcpLab({ onActivity }: Activity) {
  const [step, setStep] = useState(0);
  const messages = [
    "客户端准备发起连接。服务端正在监听，双方还不能假定连接已建立。",
    "SYN 到达：服务端知道客户端想连接，接下来要发回自己的 SYN 和确认。",
    "SYN + ACK 到达：客户端收到响应，进入 ESTABLISHED，并准备确认服务端。",
    "最终 ACK 到达：服务端也进入 ESTABLISHED。三次握手完成。",
  ];
  const next = () => {
    const value = step === 3 ? 0 : step + 1;
    setStep(value);
    onActivity(messages[value]);
  };
  return (
    <>
      <div className="tcp-lab">
        <div className="tcp-endpoints">
          <div>
            <span className="tcp-machine">⌘</span>
            <strong>你的浏览器</strong>
            <code>
              {["CLOSED", "SYN-SENT", "ESTABLISHED", "ESTABLISHED"][step]}
            </code>
          </div>
          <div>
            <span className="tcp-machine tcp-server">▤</span>
            <strong>远端服务器</strong>
            <code>
              {["LISTEN", "SYN-RECEIVED", "SYN-RECEIVED", "ESTABLISHED"][step]}
            </code>
          </div>
        </div>
        <svg
          viewBox="0 0 800 270"
          className="tcp-wire"
          role="img"
          aria-label={`已传递 ${step} 个报文`}
        >
          <path
            d="M115 0V270 M685 0V270"
            stroke="#455465"
            strokeDasharray="3 8"
          />
          {["SYN", "SYN + ACK", "ACK"].map((label, i) => (
            <g key={label} opacity={step > i ? 1 : 0.13}>
              <path
                d={
                  i === 1
                    ? `M685 ${55 + i * 80}H115l12 -8m-12 8l12 8`
                    : `M115 ${55 + i * 80}H685l-12 -8m12 8l-12 8`
                }
                stroke={i === 1 ? "#a6edc6" : "#80baff"}
                strokeWidth="2"
                fill="none"
              />
              <text
                x="400"
                y={40 + i * 80}
                textAnchor="middle"
                fill={i === 1 ? "#a6edc6" : "#b7d7ff"}
                fontSize="17"
                fontFamily="monospace"
              >
                {label}
              </text>
              <text
                x="400"
                y={78 + i * 80}
                textAnchor="middle"
                fill="#8297ac"
                fontSize="11"
              >
                {["请求同步序列号", "同步 + 确认", "确认收到"][i]}
              </text>
              {step === i + 1 && (
                <circle
                  className={i === 1 ? "tcp-packet reverse" : "tcp-packet"}
                  cx={i === 1 ? 115 : 685}
                  cy={55 + i * 80}
                  r="6"
                  fill={i === 1 ? "#a6edc6" : "#80baff"}
                />
              )}
            </g>
          ))}
        </svg>
        <div className="tcp-status">
          <span className={step === 3 ? "is-connected" : ""} />
          {step === 3 ? "CONNECTED · 连接已建立" : `HANDSHAKING · ${step} / 3`}
        </div>
      </div>
      <div className="curated-action-row">
        <button className="curated-primary" onClick={next}>
          {
            [
              "发送 SYN →",
              "返回 SYN + ACK ←",
              "发送最终 ACK →",
              "重新建立连接 ↻",
            ][step]
          }
        </button>
        <button
          className="curated-subtle"
          disabled={!step}
          onClick={() => setStep(step - 1)}
        >
          回看上一步
        </button>
      </div>
      <Insight>{messages[step]}</Insight>
    </>
  );
}
function MergeLab({ onActivity }: Activity) {
  const variants = [
    [
      [1, 4, 7],
      [2, 3, 8],
    ],
    [
      [2, 5, 9],
      [1, 6, 10],
    ],
    [
      [1, 2, 3],
      [4, 5, 6],
    ],
  ];
  const [variant, setVariant] = useState(0),
    [taken, setTaken] = useState<{ value: number; side: number }[]>([]),
    [hint, setHint] = useState(
      "两个队列分别有序。你可以点击任意一侧最前面的数字。",
    );
  const inputs = variants[variant],
    indices = [
      taken.filter((v) => v.side === 0).length,
      taken.filter((v) => v.side === 1).length,
    ];
  function take(side: number) {
    const value = inputs[side][indices[side]],
      other = inputs[1 - side][indices[1 - side]];
    if (value === undefined) return;
    if (other !== undefined && value > other) {
      setHint(
        `${value} 还不能先走：另一侧的 ${other} 更小。只需要比较两个队首。`,
      );
      return;
    }
    setTaken([...taken, { value, side }]);
    setHint(
      taken.length === 5
        ? "归并完成！两侧内部的相对顺序保留了下来。"
        : `取出 ${value}。现在重新比较两侧队首；不必机械地左右交替。`,
    );
    onActivity(`归并输出：${[...taken.map((v) => v.value), value].join("、")}`);
  }
  return (
    <>
      <div className="merge-stage">
        <div className="merge-inputs">
          {inputs.map((list, side) => (
            <div className={`merge-lane side-${side}`} key={side}>
              <span>有序队列 {side === 0 ? "A" : "B"}</span>
              <div>
                {list.map((n, i) => (
                  <button
                    key={n}
                    className={
                      i < indices[side]
                        ? "taken"
                        : i === indices[side]
                          ? "head"
                          : ""
                    }
                    disabled={i !== indices[side]}
                    aria-label={`取出${side === 0 ? "A" : "B"}队首 ${n}`}
                    onClick={() => take(side)}
                  >
                    {n}
                    {i === indices[side] && <small>取我 ↓</small>}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="merge-funnel">
          <span>比较队首</span>
          <i>↓</i>
          <span>较小者先行</span>
        </div>
        <div className="merge-output">
          <span>OUTPUT / 已归并</span>
          <div>
            {Array.from({ length: 6 }, (_, i) => (
              <div
                key={i}
                className={taken[i] ? `filled side-${taken[i].side}` : ""}
              >
                {taken[i]?.value ?? "·"}
              </div>
            ))}
          </div>
          <div className="merge-progress">
            <i style={{ width: `${(taken.length / 6) * 100}%` }} />
          </div>
        </div>
      </div>
      <Insight label={`${taken.length} / 6 个数字归位`}>{hint}</Insight>
      <div className="curated-action-row">
        <button
          className="curated-primary"
          onClick={() => {
            const a = inputs[0][indices[0]],
              b = inputs[1][indices[1]];
            take(a !== undefined && (b === undefined || a <= b) ? 0 : 1);
          }}
          disabled={taken.length === 6}
        >
          帮我推演一步 →
        </button>
        <button
          className="curated-subtle"
          onClick={() => {
            setVariant((variant + 1) % variants.length);
            setTaken([]);
            setHint("换了一组数字。这一次会连续从同一侧取出吗？");
          }}
        >
          换一组数字 ↻
        </button>
      </div>
    </>
  );
}
function HeatLab({ onActivity }: Activity) {
  const [hour, setHour] = useState(8),
    [decay, setDecay] = useState(0.1);
  const score = (t: number, k: number) => 100 * Math.exp(-k * t),
    curve = (k: number) =>
      Array.from(
        { length: 97 },
        (_, i) => `${70 + (i / 4 / 24) * 650},${280 - score(i / 4, k) * 2.1}`,
      ).join(" ");
  return (
    <>
      <div className="heat-stage">
        <div className="heat-scores">
          <div>
            <span>你设定的衰减</span>
            <strong>
              {score(hour, decay).toFixed(1)}
              <small>分</small>
            </strong>
            <em>k = {decay.toFixed(2)}</em>
          </div>
          <div>
            <span>固定对照</span>
            <strong>
              {score(hour, 0.06).toFixed(1)}
              <small>分</small>
            </strong>
            <em>k = 0.06</em>
          </div>
          <div>
            <span>时间已经过去</span>
            <strong>
              {hour}
              <small>小时</small>
            </strong>
            <em>从同样的 100 分出发</em>
          </div>
        </div>
        <svg
          viewBox="0 0 800 330"
          role="img"
          aria-label="两种指数衰减轨迹"
          className="heat-chart"
        >
          {[0, 25, 50, 75, 100].map((n) => (
            <g key={n}>
              <path
                d={`M70 ${280 - n * 2.1}H720`}
                stroke="#e2dfd6"
                strokeDasharray="3 5"
              />
              <text
                x="50"
                y={285 - n * 2.1}
                textAnchor="end"
                fill="#929488"
                fontSize="12"
              >
                {n}
              </text>
            </g>
          ))}
          <polyline
            points={curve(0.06)}
            fill="none"
            stroke="#abaea0"
            strokeWidth="3"
            strokeDasharray="6 6"
          />
          <polyline
            points={curve(decay)}
            fill="none"
            stroke="#df693d"
            strokeWidth="4"
          />
          <path d={`M${70 + (hour / 24) * 650} 50V280`} stroke="#5f6256" />
          <circle
            cx={70 + (hour / 24) * 650}
            cy={280 - score(hour, decay) * 2.1}
            r="8"
            fill="#df693d"
            stroke="white"
            strokeWidth="3"
          />
          {[0, 6, 12, 18, 24].map((t) => (
            <text
              x={70 + (t / 24) * 650}
              y="310"
              key={t}
              textAnchor="middle"
              fill="#777d6c"
              fontSize="12"
            >
              {t}h
            </text>
          ))}
        </svg>
      </div>
      <div className="curated-sliders">
        <label>
          拨动时间 <b>{hour} h</b>
          <input
            aria-label="经过小时"
            type="range"
            min="0"
            max="24"
            step="1"
            value={hour}
            onChange={(e) => {
              setHour(+e.target.value);
              onActivity(`观察第 ${e.target.value} 小时的热度。`);
            }}
          />
        </label>
        <label>
          冷得慢 ← 衰减速度 → 冷得快 <b>{decay.toFixed(2)}</b>
          <input
            aria-label="衰减速度"
            type="range"
            min="0"
            max=".3"
            step=".01"
            value={decay}
            onChange={(e) => setDecay(+e.target.value)}
          />
        </label>
      </div>
      <Insight label="只看时间这一项">
        初始分数相同，k 越大，旧内容的分数下降越快。图中公式为 100 ×
        e⁻ᵏᵗ；没有新增互动，不是知乎实际的热榜排名。
      </Insight>
    </>
  );
}
function CoffeeLab({ onActivity }: Activity) {
  const [method, setMethod] = useState<"cold" | "iced">("cold"),
    [step, setStep] = useState(0);
  const labels =
    method === "cold"
      ? ["咖啡粉与水", "低温浸泡", "过滤入杯"]
      : ["咖啡粉与水", "热水萃取", "加水与冰"];
  const captions =
    method === "cold"
      ? [
          "从低温水开始。杯子最后是冷的，并不是靠最后才加冰。",
          "咖啡粉与低温水接触，萃取发生得较慢。具体时间由配方决定。",
          "过滤后得到冷萃。重点是萃取阶段本来就采用低温。",
        ]
      : [
          "准备咖啡粉。冰美式通常先以热水萃取浓缩咖啡。",
          "热水流经咖啡粉，先得到热的浓缩咖啡，再进入降温步骤。",
          "加入水和冰。饮用时是冷的，但不等于用冷水萃取。",
        ];
  return (
    <>
      <div className="coffee-tabs">
        <button
          aria-pressed={method === "cold"}
          onClick={() => {
            setMethod("cold");
            setStep(0);
          }}
        >
          COLD BREW <strong>冷萃</strong>
        </button>
        <button
          aria-pressed={method === "iced"}
          onClick={() => {
            setMethod("iced");
            setStep(0);
          }}
        >
          ICED AMERICANO <strong>冰美式</strong>
        </button>
      </div>
      <div className="coffee-stage">
        <div className="coffee-note">
          <span>EXTRACTION</span>
          <strong>{method === "cold" ? "低温慢萃" : "先热萃，再冰镇"}</strong>
          <p>
            {step === 2
              ? "一杯冷咖啡，两种不同的过程。"
              : "观察水和咖啡粉接触时的温度。"}
          </p>
          <i>{method === "cold" ? "❄ 低温接触" : "≈ 热水接触"}</i>
        </div>
        <svg
          viewBox="0 0 480 370"
          role="img"
          aria-label={`${method === "cold" ? "冷萃" : "冰美式"}制备第${step + 1}步`}
        >
          <ellipse cx="245" cy="337" rx="155" ry="12" fill="#422d2610" />
          {method === "iced" && step === 1 ? (
            <>
              <rect
                x="140"
                y="48"
                width="210"
                height="106"
                rx="12"
                fill="#b9ada0"
                stroke="#84715f"
                strokeWidth="2"
              />
              <rect
                x="153"
                y="61"
                width="184"
                height="60"
                rx="6"
                fill="#e1d6c5"
              />
              <circle cx="204" cy="90" r="19" fill="#f9f3e8" stroke="#a8947a" />
              <path d="M204 90l9 -9" stroke="#aa734c" strokeWidth="2" />
              <circle cx="300" cy="89" r="7" fill="#8eaa86" />
              <path
                d="M220 154v16h51v-16M269 162h50"
                stroke="#695448"
                strokeWidth="11"
                fill="none"
              />
              <path
                d="M233 174V220M252 174V220"
                className="espresso-flow"
                stroke="#986343"
                strokeWidth="3"
              />
              <path
                d="M205 222h78l-8 55h-61Z"
                fill="#f7eddd"
                stroke="#ae9474"
                strokeWidth="2"
              />
              <ellipse cx="244" cy="223" rx="38" ry="8" fill="#9a6848" />
              <path
                d="M283 231h10q18 19 -14 25"
                fill="none"
                stroke="#ae9474"
                strokeWidth="4"
              />
              <rect
                x="161"
                y="282"
                width="175"
                height="12"
                rx="5"
                fill="#b5a38f"
              />
              <text
                x="245"
                y="325"
                textAnchor="middle"
                fontSize="18"
                fill="#8a6c4e"
                fontFamily="Georgia,serif"
              >
                espresso first.
              </text>
            </>
          ) : step < 2 ? (
            <>
              <path
                d="M155 95Q145 95 149 120L170 310Q171 325 190 325H300Q319 325 320 307L340 120Q344 95 330 95Z"
                fill="#ffffff88"
                stroke="#866c59"
                strokeWidth="2"
              />
              <path
                className="coffee-liquid"
                d={`M157 ${step === 0 ? 235 : 155}H332L318 307Q316 319 300 319H190Q176 319 176 306Z`}
                fill={step === 0 ? "#b6d7df88" : "#744932"}
              />
              {Array.from({ length: 18 }, (_, i) => (
                <ellipse
                  className={step === 1 ? "coffee-ground" : ""}
                  key={i}
                  cx={184 + (i % 6) * 23}
                  cy={280 + Math.floor(i / 6) * 12}
                  rx="6"
                  ry="3"
                  transform={`rotate(${i * 31} ${184 + (i % 6) * 23} ${280 + Math.floor(i / 6) * 12})`}
                  fill="#3c251d"
                />
              ))}
              <ellipse
                cx="245"
                cy="95"
                rx="92"
                ry="13"
                fill="#f6f1e7"
                stroke="#866c59"
                strokeWidth="2"
              />
              {method === "iced" &&
                step === 1 &&
                [205, 245, 285].map((x) => (
                  <path
                    key={x}
                    className="coffee-steam"
                    d={`M${x} 76q-16 -15 0 -30t0 -30`}
                    fill="none"
                    stroke="#bca493"
                    strokeWidth="3"
                  />
                ))}
              <text
                x="245"
                y="220"
                textAnchor="middle"
                fill={step ? "#f8ead6" : "#6c807f"}
                fontFamily="Georgia,serif"
                fontSize="24"
              >
                {method === "cold" ? "slow & cold" : "hot extraction"}
              </text>
            </>
          ) : (
            <>
              <path
                d="M160 130H332L316 306Q315 323 298 323H194Q176 323 175 306Z"
                fill="#42261c"
                stroke="#83614a"
                strokeWidth="2"
              />
              <path d="M170 148H321L318 176H173Z" fill="#b99271" />
              {[0, 1, 2].map((i) => (
                <rect
                  key={i}
                  x={184 + i * 38}
                  y={190 + (i % 2) * 32}
                  width="43"
                  height="43"
                  rx="9"
                  transform={`rotate(${i * 18 - 12} ${205 + i * 38} ${212 + (i % 2) * 32})`}
                  fill={method === "iced" ? "#c8e7ecaa" : "#885d4099"}
                  stroke={method === "iced" ? "#ebffffcc" : "transparent"}
                />
              ))}
              <path d="M320 95L293 267" stroke="#d1b68c" strokeWidth="8" />
              <text
                x="245"
                y="80"
                textAnchor="middle"
                fill="#6f4c36"
                fontFamily="Georgia,serif"
                fontSize="25"
              >
                {method === "cold" ? "Cold brew." : "Iced americano."}
              </text>
            </>
          )}
          <text
            x="245"
            y="363"
            textAnchor="middle"
            fontSize="11"
            fill="#a69380"
          >
            器具与液体为原创过程示意
          </text>
        </svg>
      </div>
      <Steps
        labels={labels}
        step={step}
        setStep={(n) => {
          setStep(n);
          onActivity(captions[n]);
        }}
      />
      <Insight label={labels[step]}>{captions[step]}</Insight>
    </>
  );
}
function ChoiceLab({ onActivity }: Activity) {
  const [chosen, setChosen] = useState(0),
    [values, setValues] = useState([8, 6, 9]);
  const options = [
    { name: "写一篇文章", icon: "✎", desc: "把一个想法讲清楚", color: "ink" },
    { name: "和朋友见面", icon: "☕", desc: "一次面对面的交流", color: "clay" },
    { name: "好好休息", icon: "☾", desc: "把下午留给自己", color: "sage" },
  ];
  const alternatives = options.map((_, i) => i).filter((i) => i !== chosen),
    best = Math.max(...alternatives.map((i) => values[i])),
    foregone = alternatives.filter((i) => values[i] === best);
  return (
    <>
      <div className="choice-time">
        <span>周六 · 14:00 — 18:00</span>
        <div>
          <i />
          <i />
          <i />
          <i />
        </div>
        <b>4 小时，只能选一件。</b>
      </div>
      <div className="choice-cards">
        {options.map((o, i) => (
          <div
            className={`choice-card ${o.color} ${chosen === i ? "chosen" : "foregone"}`}
            key={o.name}
          >
            <button
              aria-pressed={chosen === i}
              onClick={() => {
                setChosen(i);
                onActivity(`选择${o.name}，比较剩余两项。`);
              }}
            >
              <span>{chosen === i ? "我的选择" : "被放弃的选项"}</span>
              <i>{o.icon}</i>
              <strong>{o.name}</strong>
              <small>{o.desc}</small>
            </button>
            <label>
              对我的价值 <output>{values[i]} / 10</output>
              <input
                aria-label={`${o.name}的主观价值`}
                type="range"
                min="0"
                max="10"
                step="1"
                value={values[i]}
                onChange={(e) =>
                  setValues((v) =>
                    v.map((n, j) => (j === i ? +e.target.value : n)),
                  )
                }
              />
            </label>
          </div>
        ))}
      </div>
      <div className="choice-receipt">
        <span>这次选择的机会成本</span>
        <strong>
          {foregone.map((i) => options[i].name).join(" / ")}
          <i>
            {best} <small>主观价值</small>
          </i>
        </strong>
        <p>
          从你放弃的选项中，取价值最高的一项。不是{" "}
          {alternatives.map((i) => values[i]).join(" + ")}
          ，也不是你选中那项的价值。
        </p>
      </div>
      <Insight label="把滑杆换成你自己的偏好">
        数值只是用于比较的主观排序，不是钱，也不是推荐分。改变偏好后，最佳替代项也会改变；休息同样可以很有价值。
      </Insight>
    </>
  );
}
const notes = [
  {
    title: "冷萃为什么是冷萃？",
    tag: "咖啡",
    text: "先看萃取温度，再看杯中温度。",
    link: "方法与结果",
  },
  {
    title: "机会成本",
    tag: "经济学",
    text: "取被放弃选项中的最佳者。",
    link: "选择与取舍",
  },
  {
    title: "归并排序",
    tag: "算法",
    text: "比较两边剩余队列的队首。",
    link: "拆分再组合",
  },
  {
    title: "相关不等于因果",
    tag: "思考",
    text: "共同原因可能同时影响两件事。",
    link: "解释与证据",
  },
  {
    title: "读完后，合上书",
    tag: "学习",
    text: "能否离开原文重新表达？",
    link: "输入与输出",
  },
  {
    title: "文章写作备忘",
    tag: "创作",
    text: "留下来源和当时的上下文。",
    link: "知识的复用",
  },
];
function NotesLab({ onActivity }: Activity) {
  const [query, setQuery] = useState(""),
    [organized, setOrganized] = useState(false),
    [selected, setSelected] = useState<number | null>(null);
  const matching = notes
    .map((n, i) => ({ n, i }))
    .filter(({ n }) => !query || `${n.title}${n.tag}${n.text}`.includes(query));
  return (
    <>
      <div className="notes-toolbar">
        <label>
          <span>⌕</span>
          <input
            aria-label="搜索示例笔记"
            placeholder="试试搜「咖啡」或「证据」"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setOrganized(true);
            }}
          />
        </label>
        <button
          aria-pressed={organized}
          onClick={() => setOrganized(!organized)}
        >
          {organized ? "✓ 已整理" : "整理这张桌子 →"}
        </button>
      </div>
      <div className={`notes-desk ${organized ? "organized" : ""}`}>
        {matching.length ? (
          matching.map(({ n, i }) => (
            <button
              className={`note-paper paper-${i % 3} ${selected === i ? "selected" : ""}`}
              style={{
                transform: organized
                  ? "none"
                  : `rotate(${[-4, 3, -2, 4, -3, 2][i]}deg) translateY(${(i % 2) * 10}px)`,
              }}
              key={i}
              onClick={() => {
                setSelected(i);
                onActivity(`找回笔记：${n.title}`);
              }}
            >
              <span>
                {organized ? n.tag : `摘录 ${String(i + 1).padStart(2, "0")}`}
              </span>
              <strong>{n.title}</strong>
              <p>{n.text}</p>
              <small>{organized ? `↗ ${n.link}` : "点击翻开 ↗"}</small>
            </button>
          ))
        ) : (
          <p className="notes-empty">
            没有匹配。试试「咖啡」「算法」「学习」这些线索。
          </p>
        )}
      </div>
      {selected !== null ? (
        <div className="note-context">
          <span>重新用起来 / CONTEXT</span>
          <h3>{notes[selected].title}</h3>
          <p>{notes[selected].text}</p>
          <div>
            <b>原来的线索</b>
            {notes[selected].tag}
            <b>可以关联到</b>
            {notes[selected].link}
          </div>
          <small>这六张卡片是玩乎编写的操作样本，不是原作者的私人笔记。</small>
        </div>
      ) : (
        <Insight label="先找得到，再用得上">
          资料库的价值不只在“存进去”。试着检索一个主题，再点开卡片，看看标签和上下文怎样帮助复用。
        </Insight>
      )}
    </>
  );
}
function ReadingLab({ onActivity }: Activity) {
  const [stage, setStage] = useState(0),
    [draft, setDraft] = useState("");
  return (
    <>
      <div className={`reading-book book-stage-${stage}`}>
        <div className="book-left">
          <span>READ / 一段练习材料</span>
          <div className={stage === 1 ? "book-covered" : ""}>
            <h3>今天读到：机会成本</h3>
            <p>
              当同一段时间有几种互斥的用途，选择其中一种，就放弃了其他可能。
            </p>
            <p>
              机会成本，是那些被放弃的可行选项中，<mark>价值最高的一项</mark>
              ，不是全部相加。
            </p>
            <small>玩乎原创练习材料，用来体验主动阅读。</small>
          </div>
          {stage === 1 && (
            <div className="book-cover-label">
              <span>◒</span>
              <strong>先别偷看。</strong>
              <p>离开材料，试着重新表达。</p>
            </div>
          )}
        </div>
        <div className="book-right">
          <span>RECALL / 我的表达</span>
          <label>如果你选了写文章，放弃了什么？</label>
          <textarea
            aria-label="我的转述"
            placeholder="用自己的话写一句，再举一个生活里的例子……"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            readOnly={stage === 0}
          />
          <small>
            {stage === 0
              ? "先读左页，然后合上材料。"
              : "只保留在当前演示中，不发送给模型。"}
          </small>
          {stage === 2 && (
            <div className="recall-check">
              <strong>自己核对这两点</strong>
              <p>
                ① 是否比较了其他可行选项？
                <br />② 是否取了其中价值最高的一项？
              </p>
            </div>
          )}
        </div>
      </div>
      <div className="curated-action-row">
        <button
          className="curated-primary"
          onClick={() => {
            const next = stage === 2 ? 0 : stage + 1;
            setStage(next);
            if (next === 2)
              onActivity("完成了一次离开原文的转述，并返回核对。");
          }}
        >
          {
            ["合上材料，试着讲一遍 →", "打开材料，自己对照 →", "再读一遍 ↻"][
              stage
            ]
          }
        </button>
        <span className="curated-micro">
          {stage === 2
            ? "不自动判分，不把熟悉感当理解。"
            : `${stage + 1} / 3 · 阅读 → 回忆 → 核对`}
        </span>
      </div>
    </>
  );
}
function CausalLab({ onActivity }: Activity) {
  const [warm, setWarm] = useState(65),
    [intervene, setIntervene] = useState(false),
    [sales, setSales] = useState(65);
  const a = intervene ? sales : warm,
    b = warm;
  return (
    <>
      <div className="causal-mode">
        <button aria-pressed={!intervene} onClick={() => setIntervene(false)}>
          观察：改变共同原因
        </button>
        <button
          aria-pressed={intervene}
          onClick={() => {
            setSales(warm);
            setIntervene(true);
          }}
        >
          干预：只改变 A
        </button>
      </div>
      <div className="causal-stage">
        <svg
          viewBox="0 0 800 335"
          role="img"
          aria-label={
            intervene ? "只干预 A，B 仍由 C 决定" : "C 同时影响 A 与 B"
          }
        >
          <path
            d="M400 95C400 150 205 125 205 215 M400 95C400 150 595 125 595 215"
            fill="none"
            stroke="#b4c5c4"
            strokeWidth="3"
          />
          <path
            d="M205 190v25l-7 -10m7 10l7 -10M595 190v25l-7 -10m7 10l7 -10"
            stroke="#638c86"
            strokeWidth="2"
            fill="none"
          />
          {intervene && (
            <path
              d="M302 132l22 22m-22 0l22 -22"
              stroke="#d6764c"
              strokeWidth="6"
            />
          )}
          <circle cx="400" cy="65" r="46" fill="#f8dc91" />
          <text x="400" y="67" textAnchor="middle" fontSize="24" fill="#7a5826">
            ☀
          </text>
          <text
            x="400"
            y="130"
            textAnchor="middle"
            fontSize="14"
            fill="#796c50"
          >
            C · 天气炎热程度
          </text>
          <g transform="translate(205 240)">
            <circle r="48" fill="#f3d4c5" />
            <path d="M-15 -7h30L0 28Z" fill="#b87641" />
            <circle cy="-14" r="20" fill="#f9f0d6" />
            <text y="78" textAnchor="middle" fontSize="15" fill="#564133">
              A · 冰淇淋销量
            </text>
          </g>
          <g transform="translate(595 240)">
            <circle r="48" fill="#cfe6e6" />
            <path
              d="M-33 -5q11 -14 22 0t22 0t22 0M-33 15q11 -14 22 0t22 0t22 0"
              fill="none"
              stroke="#568e96"
              strokeWidth="3"
            />
            <text y="78" textAnchor="middle" fontSize="15" fill="#365b66">
              B · 游泳活动量
            </text>
          </g>
          <path d="M280 240H520" stroke="#c7ccbf" strokeDasharray="4 5" />
          <text
            x="400"
            y="221"
            textAnchor="middle"
            fill="#8c9087"
            fontSize="12"
          >
            本例没有 A → B
          </text>
        </svg>
        <div className="causal-meters">
          <div>
            <span>A</span>
            <i style={{ width: `${a}%` }} />
            <output>{a}</output>
          </div>
          <div>
            <span>B</span>
            <i style={{ width: `${b}%` }} />
            <output>{b}</output>
          </div>
        </div>
      </div>
      <div className="curated-sliders">
        <label>
          {intervene ? "只改变冰淇淋销量 A" : "改变天气炎热程度 C"}
          <b>{intervene ? sales : warm}</b>
          <input
            aria-label={intervene ? "干预销量" : "共同原因强度"}
            type="range"
            min="10"
            max="100"
            value={intervene ? sales : warm}
            onChange={(e) => {
              if (intervene) setSales(+e.target.value);
              else setWarm(+e.target.value);
              onActivity(
                intervene
                  ? "只改变 A，观察 B 保持不变。"
                  : "改变 C，观察 A 和 B 同时变化。",
              );
            }}
          />
        </label>
      </div>
      <Insight label="原创玩具模型，不是观测数据">
        {intervene
          ? "现在只改变 A，B 没有随之改变。在这个明确设定 C→A、C→B 的模型里，一起变化不能证明 A 导致 B。"
          : "天气变化让 A、B 同时升降。切到“只改变 A”再试试：相关背后，也可能藏着一个共同原因。"}{" "}
        真实世界还需证据查证，不能由本图判定因果。
      </Insight>
    </>
  );
}
function LeafLab({ onActivity }: Activity) {
  const [step, setStep] = useState(0);
  const captions = [
    "先打开光源。图中绿色薄片堆叠代表类囊体，右边留给后续碳同化。",
    "光反应把光能转成 ATP 和 NADPH 所携带的能量与还原力。",
    "ATP 和 NADPH 支持碳同化。动画表示功能联系，不是真实分子运动路径。",
    "有机产物形成。实际反应涉及更多物质与循环，本图只呈现这条能量主线。",
  ];
  return (
    <>
      <div className={`leaf-stage leaf-step-${step}`}>
        <svg viewBox="0 0 800 370" role="img" aria-label={captions[step]}>
          <ellipse
            cx="410"
            cy="215"
            rx="325"
            ry="132"
            fill="#d7e6b8"
            stroke="#6b9452"
            strokeWidth="3"
          />
          <ellipse
            cx="410"
            cy="215"
            rx="310"
            ry="117"
            fill="#f0f3d5"
            stroke="#b0c784"
            strokeWidth="2"
          />
          <g className={step ? "leaf-sun active" : "leaf-sun"}>
            <circle cx="85" cy="65" r="29" fill="#ebc14f" />
            {Array.from({ length: 8 }, (_, i) => (
              <path
                key={i}
                d="M85 23V14"
                stroke="#ebc14f"
                strokeWidth="3"
                transform={`rotate(${i * 45} 85 65)`}
              />
            ))}
          </g>
          <path
            d="M125 80L195 139l-28 -4 40 29"
            stroke={step ? "#ddb548" : "#d9dec9"}
            strokeWidth="5"
            fill="none"
          />
          {[0, 1, 2].map((col) => (
            <g
              key={col}
              transform={`translate(${205 + col * 48} ${190 + (col % 2) * 20})`}
            >
              {[0, 1, 2, 3].map((row) => (
                <g key={row} transform={`translate(0 ${row * 12})`}>
                  <path d="M-24 0v8a24 8 0 0 0 48 0V0" fill="#73934a" />
                  <ellipse
                    rx="24"
                    ry="8"
                    fill={step ? "#abc869" : "#819f5b"}
                    stroke="#607d3f"
                  />
                </g>
              ))}
            </g>
          ))}
          <text
            x="251"
            y="298"
            textAnchor="middle"
            fontSize="14"
            fill="#526d3b"
          >
            光反应 · 类囊体膜
          </text>
          <path
            d="M365 199H459l-10 -7m10 7l-10 7"
            stroke="#c1cba3"
            strokeWidth="2"
            fill="none"
          />
          <g
            className={`leaf-energy ${step >= 2 ? "travel" : step === 1 ? "ready" : ""}`}
          >
            <rect
              x="360"
              y="170"
              width="74"
              height="25"
              rx="12"
              fill="#e6b44d"
            />
            <text
              x="397"
              y="187"
              textAnchor="middle"
              fill="#604417"
              fontSize="12"
            >
              ATP
            </text>
            <rect
              x="360"
              y="206"
              width="74"
              height="25"
              rx="12"
              fill="#92bfc3"
            />
            <text
              x="397"
              y="223"
              textAnchor="middle"
              fill="#294d52"
              fontSize="12"
            >
              NADPH
            </text>
          </g>
          <g transform="translate(546 208)">
            <circle
              r="52"
              fill="#e7efcc"
              stroke={step >= 2 ? "#759854" : "#c0cca0"}
              strokeWidth="9"
              strokeDasharray="95 14"
              className={step === 2 ? "leaf-cycle" : ""}
            />
            <text textAnchor="middle" y="-2" fontSize="14" fill="#50713b">
              碳同化
            </text>
            <text textAnchor="middle" y="19" fontSize="11" fill="#899475">
              Calvin cycle
            </text>
          </g>
          <text
            x="550"
            y="135"
            textAnchor="middle"
            fill="#6b7e58"
            fontSize="14"
          >
            CO₂ ↓
          </text>
          <g opacity={step === 3 ? 1 : 0.15} transform="translate(684 211)">
            <path
              d="M-20 -12L0 -24 20 -12V12L0 24-20 12Z"
              fill="#dfa25f"
              stroke="#b88346"
              strokeWidth="2"
            />
            <text y="53" textAnchor="middle" fill="#7d603c" fontSize="12">
              有机产物
            </text>
          </g>
          <text
            x="410"
            y="363"
            textAnchor="middle"
            fill="#8d9e72"
            fontSize="11"
          >
            叶绿体剖面 · 结构不按比例 · 图形数量不代表反应计量
          </text>
        </svg>
      </div>
      <Steps
        labels={["光源关闭", "打开光源", "能量接力", "形成产物"]}
        step={step}
        setStep={(n) => {
          setStep(n);
          onActivity(captions[n]);
        }}
      />
      <Insight label="能量走到了哪一步">{captions[step]}</Insight>
    </>
  );
}
function CarbonLab({ onActivity }: Activity) {
  const [step, setStep] = useState(0);
  const captions = [
    "无机碳先进入叶肉细胞。这里关注两种细胞的分工。",
    "在叶肉细胞初步固定，形成四碳有机酸。载体已准备好运输碳。",
    "四碳酸运往维管束鞘细胞。拖动下面的进度可以回看两间“车间”的交接。",
    "四碳酸释放 CO₂，供后续碳同化。完整循环还包括返回与再生，本图没有展开。",
  ];
  const x = [155, 240, 548, 615][step];
  return (
    <>
      <div className="carbon-stage">
        <svg
          viewBox="0 0 800 370"
          role="img"
          aria-label={`碳转移第 ${step + 1} 阶段`}
        >
          <path
            d="M80 95Q80 65 120 65H325Q350 65 350 105V294Q350 323 310 323H118Q80 323 80 290Z"
            fill="#e9edd9"
            stroke="#93a46e"
            strokeWidth="4"
          />
          <path
            d="M450 100Q450 65 490 65H690Q723 65 723 100V290Q723 323 689 323H490Q450 323 450 290Z"
            fill="#dee9df"
            stroke="#7e9e85"
            strokeWidth="4"
          />
          <path d="M350 160H450V217H350" fill="#f7f1df" />
          <path d="M350 159H450M350 218H450" stroke="#a7b090" strokeWidth="3" />
          <text
            x="215"
            y="110"
            textAnchor="middle"
            fill="#66793f"
            fontSize="15"
          >
            叶肉细胞
          </text>
          <text
            x="585"
            y="110"
            textAnchor="middle"
            fill="#4b775b"
            fontSize="15"
          >
            维管束鞘细胞
          </text>
          <text
            x="215"
            y="290"
            textAnchor="middle"
            fill="#8b986c"
            fontSize="12"
          >
            初步固定
          </text>
          <text
            x="585"
            y="290"
            textAnchor="middle"
            fill="#7c9e86"
            fontSize="12"
          >
            释放 CO₂ → 后续同化
          </text>
          <path
            d="M135 194H650"
            stroke="#bbc8ab"
            strokeWidth="2"
            strokeDasharray="4 7"
          />
          <g
            className="carbon-cargo"
            style={{ transform: `translate(${x}px,194px)` }}
          >
            <circle
              r={step === 1 || step === 2 ? 37 : 25}
              fill={step === 1 || step === 2 ? "#d99a54" : "#718b79"}
              stroke="white"
              strokeWidth="3"
            />
            <text y="5" textAnchor="middle" fill="white" fontSize="14">
              {step === 1 || step === 2 ? "四碳酸" : "CO₂"}
            </text>
          </g>
          {step === 3 && (
            <g className="carbon-residue" transform="translate(521 232)">
              <circle r="20" fill="#d99a5480" />
              <text y="41" textAnchor="middle" fontSize="10" fill="#a18b62">
                剩余载体待返回
              </text>
            </g>
          )}
          <text
            x="400"
            y="42"
            textAnchor="middle"
            fill="#94a17d"
            fontSize="11"
            letterSpacing="3"
          >
            TWO CELLS · ONE CARBON JOURNEY
          </text>
        </svg>
      </div>
      <Steps
        labels={["进入", "固定", "运输", "释放"]}
        step={step}
        setStep={(n) => {
          setStep(n);
          onActivity(captions[n]);
        }}
      />
      <div className="curated-action-row">
        <button
          className="curated-primary"
          onClick={() => {
            const n = (step + 1) % 4;
            setStep(n);
            onActivity(captions[n]);
          }}
        >
          {["开始固定 →", "把碳运过去 →", "释放 CO₂ →", "再走一遍 ↻"][step]}
        </button>
      </div>
      <Insight>{captions[step]}</Insight>
    </>
  );
}
