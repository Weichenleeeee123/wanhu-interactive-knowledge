"use client";
import { useEffect, useId, useState } from "react";
import { gradientStep, gradientStatus } from "@/lib/experiments";

const number = (x: number) =>
  Math.abs(x) > 9999 ? x.toExponential(2) : Number(x.toFixed(4)).toString();
export function GradientExperiment({
  initialX = 8,
  learningRate = 0.2,
  compact = false,
}: {
  initialX?: number;
  learningRate?: number;
  compact?: boolean;
}) {
  const id = useId();
  const [start, setStart] = useState(initialX),
    [rate, setRate] = useState(learningRate),
    [history, setHistory] = useState([initialX]);
  const [playing, setPlaying] = useState(false),
    [answer, setAnswer] = useState(""),
    [feedback, setFeedback] = useState("");
  const current = history[history.length - 1],
    steps = history.length - 1,
    status = gradientStatus(current, steps);
  function reset(x = start) {
    setPlaying(false);
    setHistory([x]);
    setAnswer("");
    setFeedback("");
  }
  useEffect(() => {
    setStart(initialX);
    setRate(learningRate);
    setPlaying(false);
    setHistory([initialX]);
    setAnswer("");
    setFeedback("");
  }, [initialX, learningRate]);
  useEffect(() => {
    if (!playing) return;
    const timer = setInterval(
      () =>
        setHistory((h) =>
          gradientStatus(h[h.length - 1], h.length - 1) === "running"
            ? [...h, gradientStep(h[h.length - 1], rate)]
            : h,
        ),
      450,
    );
    return () => clearInterval(timer);
  }, [playing, rate]);
  useEffect(() => {
    if (status !== "running") setPlaying(false);
  }, [status]);
  const domain = Math.max(
    10,
    Math.min(1e6, Math.max(...history.map(Math.abs)) * 1.12),
  );
  const px = (x: number) => 50 + ((x + domain) / (2 * domain)) * 500;
  const py = (x: number) => 264 - ((x * x) / (domain * domain)) * 205;
  const path = Array.from({ length: 101 }, (_, i) => {
    const x = -domain + (2 * domain * i) / 100;
    return `${i ? "L" : "M"}${px(x)},${py(x)}`;
  }).join(" ");
  const trail = history
    .slice(-20)
    .map((x) => `${px(x)},${py(x)}`)
    .join(" ");
  return (
    <section
      className={`experiment gradient-experiment ${compact ? "compact" : ""}`}
      aria-label="梯度下降互动实验"
    >
      <div className="experiment-top">
        <span className="eyebrow">EXPERIMENT 01</span>
        <span className="formula">f(x) = x²</span>
      </div>
      <div className="plot-wrap">
        <svg
          className="gradient-plot"
          viewBox="0 0 600 300"
          role="img"
          aria-label={`抛物线上的位置 x 为 ${number(current)}，第 ${steps} 步`}
        >
          <defs>
            <pattern
              id={`${id}-grid`}
              width="25"
              height="25"
              patternUnits="userSpaceOnUse"
            >
              <circle cx="1" cy="1" r=".9" fill="#c9d7ce" />
            </pattern>
          </defs>
          <rect
            x="0"
            y="0"
            width="600"
            height="300"
            fill={`url(#${id}-grid)`}
          />
          <path d="M30 264H570M300 15V284" stroke="#bed0c6" fill="none" />
          <text x="568" y="281" className="svg-label">
            x
          </text>
          <text x="311" y="23" className="svg-label">
            损失
          </text>
          <path d={path} stroke="var(--teal)" strokeWidth="3" fill="none" />
          <polyline
            points={trail}
            fill="none"
            stroke="var(--orange)"
            strokeWidth="1.5"
            strokeDasharray="5 4"
          />
          {history.slice(-12, -1).map((x, i) => (
            <circle
              key={i}
              cx={px(x)}
              cy={py(x)}
              r="3"
              fill="var(--orange)"
              opacity=".45"
            />
          ))}
          <line
            x1={px(current)}
            y1={py(current)}
            x2={px(current)}
            y2="264"
            stroke="var(--orange)"
            strokeDasharray="4 4"
          />
          <circle
            className="plot-dot-halo"
            cx={px(current)}
            cy={py(current)}
            r="13"
            fill="var(--orange)"
            opacity=".18"
          />
          <circle
            cx={px(current)}
            cy={py(current)}
            r="6"
            fill="var(--orange)"
            stroke="var(--white)"
            strokeWidth="2"
          />
          <text x="300" y="286" textAnchor="middle" className="svg-label">
            0 · 谷底
          </text>
        </svg>
        <span className="plot-note">调一调，知识就有了形状。</span>
      </div>
      <div className="experiment-body">
        <div className="readouts">
          <div>
            <span>当前位置 x</span>
            <strong>{number(current)}</strong>
          </div>
          <div>
            <span>损失 f(x)</span>
            <strong>{number(current * current)}</strong>
          </div>
          <div>
            <span>已走步数</span>
            <strong data-testid="gradient-step">{steps}</strong>
          </div>
        </div>
        <div className="slider-field">
          <label htmlFor={`${id}-rate`}>
            学习率 <span>η</span>
          </label>
          <input
            aria-label="学习率数值"
            type="number"
            min=".02"
            max="1.2"
            step=".01"
            value={rate}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (v >= 0.02 && v <= 1.2) {
                setRate(Math.round(v * 100) / 100);
                reset();
              }
            }}
          />
          <input
            id={`${id}-rate`}
            type="range"
            min=".02"
            max="1.2"
            step=".01"
            value={rate}
            onChange={(e) => {
              setRate(Number(e.target.value));
              reset();
            }}
          />
        </div>
        {!compact && (
          <div className="slider-field">
            <label htmlFor={`${id}-start`}>初始位置</label>
            <input
              aria-label="初始位置数值"
              type="number"
              min="-10"
              max="10"
              step=".5"
              value={start}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (v >= -10 && v <= 10) {
                  setStart(v);
                  reset(v);
                }
              }}
            />
            <input
              id={`${id}-start`}
              type="range"
              min="-10"
              max="10"
              step=".5"
              value={start}
              onChange={(e) => {
                const v = Number(e.target.value);
                setStart(v);
                reset(v);
              }}
            />
          </div>
        )}
        <div className="controls">
          <button
            className="button primary"
            onClick={() => setPlaying(!playing)}
            disabled={status !== "running"}
          >
            {playing ? "暂停" : "播放实验"}{" "}
            <span aria-hidden="true">{playing ? "Ⅱ" : "▷"}</span>
          </button>
          <button
            className="button"
            disabled={playing || status !== "running"}
            onClick={() =>
              setHistory((h) => [...h, gradientStep(h[h.length - 1], rate)])
            }
          >
            单步前进
          </button>
          <button
            className="icon-button"
            aria-label="重置实验"
            title="重置实验"
            onClick={() => reset()}
          >
            ↺
          </button>
        </div>
        <p className="experiment-status" role="status">
          {status === "converged"
            ? "已接近谷底（|x| < 10⁻⁸），实验暂停。"
            : status === "diverged"
              ? "位置超过显示上限，已停止。试试更小的学习率。"
              : status === "limit"
                ? "已运行 100 步，重置后可以继续探索。"
                : rate === 1
                  ? "当前学习率为 1：观察它是否在两侧来回。"
                  : rate > 1
                    ? "当前学习率超过 1：看看损失如何变化。"
                    : "每一步：x ← x − 学习率 × 2x"}
        </p>
        {!compact && (
          <div className="challenge">
            <span className="eyebrow">CHECK YOUR UNDERSTANDING</span>
            <h3>下一步，会落在哪里？</h3>
            <p>
              初始 x = {String(start)}，学习率 η = {String(rate)}
              。计算第一步更新后的位置。
            </p>
            <div className="answer-row">
              <label className="sr-only" htmlFor={`${id}-answer`}>
                你的下一步位置
              </label>
              <input
                id={`${id}-answer`}
                type="number"
                step="any"
                placeholder="输入你的预测"
                value={answer}
                onChange={(e) => {
                  setAnswer(e.target.value);
                  setFeedback("");
                }}
              />
              <button
                className="button"
                onClick={() =>
                  setFeedback(
                    answer.trim() &&
                      Math.abs(Number(answer) - gradientStep(start, rate)) <
                        1e-6
                      ? "回答正确！你已经掌握了单步更新。"
                      : `再试一次：${String(start)} − ${String(rate)} × 2 × ${String(start)}。`,
                  )
                }
              >
                验证答案
              </button>
            </div>
            <p className="feedback" role="status">
              {feedback}
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
