"use client";
import { useEffect, useId, useState } from "react";
import {
  branchLayout,
  scenePoses,
  type SceneAnimationData,
  type BranchingPathData,
} from "@/lib/visual-experiences";
const colors = {
  blue: "#1677e8",
  orange: "#c96315",
  green: "#138264",
  purple: "#8253bb",
  gray: "#65758a",
};

export function SceneAnimation({
  scene,
  onActivity,
}: {
  scene: SceneAnimationData;
  onActivity: (value: string) => void;
}) {
  const [progress, setProgress] = useState(0),
    [playing, setPlaying] = useState(false),
    [speed, setSpeed] = useState(1);
  const [selected, setSelected] = useState<string | null>(null);
  const last = scene.frames.length - 1,
    index = Math.min(last, Math.floor(progress + 0.0001));
  const frame = scene.frames[index];
  useEffect(() => {
    if (!playing) return;
    let previous = performance.now(),
      raf = 0;
    function tick(now: number) {
      const dt = Math.min(100, now - previous);
      previous = now;
      setProgress((p) => Math.min(last, p + (dt / 2400) * speed));
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [playing, speed, last]);
  useEffect(() => {
    if (progress >= last) setPlaying(false);
  }, [progress, last]);
  function seek(value: number) {
    setPlaying(false);
    setProgress(Math.max(0, Math.min(last, value)));
    onActivity(
      `查看分镜：${scene.frames[Math.max(0, Math.min(last, Math.round(value)))].title}`,
    );
  }
  const poses = scenePoses(scene, progress);
  const active = scene.objects.find((o) => o.id === selected);
  return (
    <div className="visual-experience" aria-label="SVG 分镜演示">
      <div className="visual-topline">
        <span>看过程发生 · 点图形看细节</span>
        <strong>
          {index + 1} / {scene.frames.length}
        </strong>
      </div>
      <svg
        className="scene-stage"
        viewBox="0 0 640 340"
        role="group"
        aria-label={frame.title}
      >
        <path d="M40 310H600" stroke="#d6e4f3" strokeDasharray="4 6" />
        {scene.objects.map((object) => {
          const p = poses.find((p) => p.id === object.id)!;
          const choose = () => setSelected(object.id);
          return (
            <g
              key={object.id}
              transform={`translate(${p.x} ${p.y})`}
              opacity={p.opacity}
              role="button"
              tabIndex={p.opacity < 0.1 ? -1 : 0}
              aria-hidden={p.opacity < 0.1}
              aria-label={`查看${object.label}`}
              aria-pressed={selected === object.id}
              onClick={choose}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  choose();
                }
              }}
              style={{ cursor: "pointer" }}
            >
              <g
                transform={`rotate(${p.rotation})`}
                fill={colors[object.color]}
                stroke={selected === object.id ? "#172c48" : "#ffffff"}
                strokeWidth={selected === object.id ? 3 : 2}
              >
                {object.shape === "circle" ? (
                  <ellipse rx={p.width / 2} ry={p.height / 2} />
                ) : object.shape === "rect" ? (
                  <rect
                    x={-p.width / 2}
                    y={-p.height / 2}
                    width={p.width}
                    height={p.height}
                    rx={12}
                  />
                ) : (
                  <path
                    d={`M${-p.width / 2} ${-p.height / 5}H${p.width / 6}V${-p.height / 2}L${p.width / 2} 0L${p.width / 6} ${p.height / 2}V${p.height / 5}H${-p.width / 2}Z`}
                  />
                )}
              </g>
              <text
                y={p.height / 2 + 20}
                textAnchor="middle"
                fill="#243d59"
                fontSize="14"
                fontWeight="600"
              >
                {object.label}
              </text>
            </g>
          );
        })}
      </svg>
      <div className="scene-caption" aria-live="polite">
        <span>第 {index + 1} 幕</span>
        <h3>{frame.title}</h3>
        <p>{frame.caption}</p>
      </div>
      <label className="visual-scrubber">
        拖动进度，观察中间状态
        <input
          aria-label="演示进度"
          type="range"
          min={0}
          max={last}
          step={0.01}
          value={progress}
          onChange={(e) => seek(Number(e.target.value))}
        />
      </label>
      <div className="visual-buttons">
        <button
          className="button"
          disabled={progress <= 0}
          onClick={() => seek(Math.ceil(progress) - 1)}
        >
          上一幕
        </button>
        <button
          className="button primary"
          onClick={() => {
            if (progress >= last) setProgress(0);
            setPlaying(!playing);
            onActivity("播放 SVG 分镜，观察图形变化。");
          }}
        >
          {playing ? "暂停" : progress >= last ? "重新播放" : "播放演示"}
        </button>
        <button
          className="button"
          disabled={progress >= last}
          onClick={() => seek(Math.floor(progress) + 1)}
        >
          下一幕
        </button>
        <label>
          速度{" "}
          <select
            aria-label="播放速度"
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
          >
            <option value={0.5}>0.5×</option>
            <option value={1}>1×</option>
            <option value={2}>2×</option>
          </select>
        </label>
      </div>
      {active && (
        <aside className="visual-object-detail">
          <strong>{active.label}</strong>
          <p>{active.detail}</p>
          <button className="text-button" onClick={() => setSelected(null)}>
            收起说明
          </button>
        </aside>
      )}
      <details className="visual-notes">
        <summary>为什么这样演示 · 原文与边界</summary>
        <p>{scene.rationale}</p>
        <p>{scene.assumptions}</p>
        <blockquote>{scene.evidence.quote}</blockquote>
      </details>
    </div>
  );
}

export function BranchingPath({
  graph,
  onActivity,
}: {
  graph: BranchingPathData;
  onActivity: (value: string) => void;
}) {
  const [path, setPath] = useState([graph.start]);
  const current = graph.nodes.find((n) => n.id === path[path.length - 1])!;
  const marker = useId().replace(/:/g, "");
  const layout = branchLayout(graph),
    height = layout.height;
  const pos = (id: string) => layout.nodes.get(id)!;
  function go(target: string) {
    if (path.length >= 100) return;
    const next = [...path, target];
    setPath(next);
    onActivity(
      `已探索：${next.map((id) => graph.nodes.find((n) => n.id === id)!.title).join(" → ")}`,
    );
  }
  return (
    <div className="visual-experience" aria-label="分支流程探索">
      <div className="visual-topline">
        <span>换一个条件，走另一条路</span>
        <strong>{current.choices.length ? "探索中" : "到达结果"}</strong>
      </div>
      <details className="path-map" open>
        <summary>路径地图 · 高亮本次经过的节点</summary>
        <svg
          viewBox={`0 0 640 ${height}`}
          role="img"
          aria-label={`当前节点：${current.title}`}
        >
          <defs>
            <marker
              id={marker}
              markerWidth="8"
              markerHeight="8"
              refX="6"
              refY="3"
              orient="auto"
            >
              <path d="M0 0L6 3L0 6" fill="#92acc7" />
            </marker>
          </defs>
          {graph.nodes.flatMap((n) =>
            n.choices.map((c, i) => {
              const a = pos(n.id),
                b = pos(c.target),
                visited = path.some(
                  (id, j) => id === n.id && path[j + 1] === c.target,
                );
              return (
                <path
                  key={`${n.id}-${i}`}
                  d={
                    b.y > a.y
                      ? `M${a.x} ${a.y + 25} C${a.x} ${a.y + 65},${b.x} ${b.y - 65},${b.x} ${b.y - 25}`
                      : `M${a.x + a.width / 2} ${a.y} C630 ${a.y},630 ${b.y},${b.x + b.width / 2} ${b.y}`
                  }
                  fill="none"
                  stroke={visited ? "#1677e8" : "#b9cddd"}
                  strokeWidth={visited ? 3 : 1.5}
                  strokeDasharray={visited ? undefined : "4 4"}
                  markerEnd={`url(#${marker})`}
                />
              );
            }),
          )}
          {graph.nodes.map((n) => {
            const p = pos(n.id),
              visited = path.includes(n.id),
              active = n.id === current.id,
              maxChars = Math.floor((p.width - 20) / 13);
            return (
              <g key={n.id} transform={`translate(${p.x} ${p.y})`}>
                <title>{n.title}</title>
                <rect
                  x={-p.width / 2}
                  y="-25"
                  width={p.width}
                  height="50"
                  rx="12"
                  fill={active ? "#1677e8" : visited ? "#e6f1ff" : "#f6f8fb"}
                  stroke={visited ? "#1677e8" : "#dbe4ed"}
                />
                <text
                  textAnchor="middle"
                  y="5"
                  fontSize="13"
                  fill={active ? "#fff" : "#30475f"}
                >
                  {n.title.length > maxChars
                    ? n.title.slice(0, maxChars - 1) + "…"
                    : n.title}
                </text>
              </g>
            );
          })}
        </svg>
      </details>
      <div className="path-current" aria-live="polite">
        <span className="eyebrow">
          {current.choices.length ? "当前情境" : "这条路径的结果"}
        </span>
        <h3>{current.title}</h3>
        <p>{current.body}</p>
      </div>
      <div className="path-choices">
        {current.choices.map((choice, i) => (
          <button
            key={i}
            className="button"
            disabled={path.length >= 100}
            onClick={() => go(choice.target)}
          >
            {choice.label}
            <span aria-hidden="true">→</span>
          </button>
        ))}
      </div>
      {path.length >= 100 && (
        <p role="status">本次已走过 100 步，可以返回或重新探索。</p>
      )}
      <div className="visual-buttons">
        <button
          className="button"
          disabled={path.length === 1}
          onClick={() => setPath((p) => p.slice(0, -1))}
        >
          返回上一步
        </button>
        <button className="text-button" onClick={() => setPath([graph.start])}>
          从起点换条路
        </button>
      </div>
      <details className="visual-notes">
        <summary>我的路径 · 演示依据</summary>
        <ol>
          {path.map((id, i) => (
            <li key={i}>{graph.nodes.find((n) => n.id === id)!.title}</li>
          ))}
        </ol>
        <p>{graph.rationale}</p>
        <p>{graph.assumptions}</p>
        <blockquote>{graph.evidence.quote}</blockquote>
      </details>
    </div>
  );
}
