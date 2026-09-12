"use client";
import { LessonSchema, type Lesson } from "@/lib/lesson";
import { AddSource } from "./AddSource";
export function LessonEditor({
  lesson,
  onChange,
}: {
  lesson: Lesson;
  onChange: (lesson: Lesson, group?: string) => void;
}) {
  const fields = [
    ["title", "作品标题", 80],
    ["intro", "开场讲解", 800],
    ["goal", "学习目标", 200],
    ["prediction", "预测问题", 800],
    ["observation", "操作与观察提示", 800],
    ["explanation", "结果讲解", 800],
    ["challenge", "带走一个理解", 800],
  ] as const;
  function update(key: (typeof fields)[number][0], value: string) {
    onChange({ ...lesson, [key]: value, origin: "manual" }, key);
  }
  const validation = LessonSchema.safeParse(lesson);
  const issues = validation.success ? [] : validation.error.issues;
  const chapters = {
    title: ["01", "吸引读者进入", "先说明问题，给读者一个继续探索的理由。"],
    goal: ["02", "组织探索过程", "明确目标，再安排预测和操作。"],
    explanation: [
      "03",
      "留下理解与出处",
      "说明结果为什么发生，再给读者一个能带走的问题。",
    ],
  } as const;
  return (
    <div className="lesson-editor">
      <div className="editor-heading">
        <span className="eyebrow">MAKE IT YOURS</span>
        <h2>把它变成你的讲解。</h2>
        <p>调整讲解与参数，随时预览读者体验。</p>
      </div>
      <nav className="editor-outline" aria-label="讲解结构">
        {Object.entries(chapters).map(([key, [number, label]]) => (
          <button
            key={key}
            onClick={() => document.getElementById(`edit-${key}`)?.focus()}
          >
            {number} {label}
          </button>
        ))}
      </nav>
      {fields.map(([key, label, max]) => (
        <div key={key}>
          {key in chapters && (
            <div className="editor-chapter">
              <span>{chapters[key as keyof typeof chapters][0]}</span>
              <h3>
                {chapters[key as keyof typeof chapters][1]}
                <small>{chapters[key as keyof typeof chapters][2]}</small>
              </h3>
            </div>
          )}
          <div className="form-field">
            <label htmlFor={`edit-${key}`}>
              {label}
              <span>
                {lesson[key].length}/{max}
              </span>
            </label>
            {key === "title" ? (
              <input
                id={`edit-${key}`}
                value={lesson[key]}
                maxLength={max}
                aria-invalid={issues.some((issue) => issue.path[0] === key)}
                onChange={(e) => update(key, e.target.value)}
              />
            ) : (
              <textarea
                id={`edit-${key}`}
                value={lesson[key]}
                maxLength={max}
                rows={key === "explanation" ? 5 : 3}
                aria-invalid={issues.some((issue) => issue.path[0] === key)}
                onChange={(e) => update(key, e.target.value)}
              />
            )}
            {issues.some((issue) => issue.path[0] === key) && (
              <p className="error-message">
                {label}：
                {issues.find((issue) => issue.path[0] === key)?.message}
              </p>
            )}
          </div>
        </div>
      ))}
      <div className="editor-divider">
        <span className="eyebrow">EXPERIMENT SETTINGS</span>
        <h3>实验的初始状态</h3>
      </div>
      {lesson.experiment.type === "gradient-descent" ? (
        <div className="two-fields">
          <div className="form-field">
            <label htmlFor="edit-initial">默认初始位置</label>
            <input
              id="edit-initial"
              type="number"
              min="-10"
              max="10"
              step=".5"
              value={lesson.experiment.initialX}
              onChange={(e) => {
                if (!Number.isFinite(Number(e.target.value))) return;
                if (lesson.experiment.type === "gradient-descent")
                  onChange({
                    ...lesson,
                    origin: "manual",
                    experiment: {
                      ...lesson.experiment,
                      initialX: Number(e.target.value),
                    },
                  });
              }}
            />
          </div>
          <div className="form-field">
            <label htmlFor="edit-rate">默认学习率</label>
            <input
              id="edit-rate"
              type="number"
              min=".02"
              max="1.2"
              step=".01"
              value={lesson.experiment.learningRate}
              onChange={(e) => {
                if (
                  !Number.isFinite(
                    Math.round(Number(e.target.value) * 100) / 100,
                  )
                )
                  return;
                if (lesson.experiment.type === "gradient-descent")
                  onChange({
                    ...lesson,
                    origin: "manual",
                    experiment: {
                      ...lesson.experiment,
                      learningRate:
                        Math.round(Number(e.target.value) * 100) / 100,
                    },
                  });
              }}
            />
          </div>
        </div>
      ) : (
        <div className="form-field">
          <label htmlFor="edit-trials">默认模拟次数</label>
          <select
            id="edit-trials"
            value={lesson.experiment.trials}
            onChange={(e) =>
              onChange({
                ...lesson,
                origin: "manual",
                experiment: {
                  type: "monty-hall",
                  trials: Number(e.target.value) as 100 | 1000,
                },
              })
            }
          >
            <option value="100">100 次</option>
            <option value="1000">1000 次</option>
          </select>
        </div>
      )}
      <p className="small muted">
        计算与挑战判分采用标准规则，讲解和初始参数由你决定。
      </p>
      <div className="editor-divider">
        <span className="eyebrow">SOURCE NOTES</span>
        <h3>材料与引用</h3>
      </div>
      {lesson.sources.map((source, index) => (
        <div className="editor-source" key={source.id}>
          <strong>{source.title}</strong>
          <div className="form-field">
            <label htmlFor={`source-author-${index}`}>
              来源作者 {index + 1}
            </label>
            <input
              id={`source-author-${index}`}
              placeholder="作者信息未提供"
              value={source.author}
              maxLength={80}
              onChange={(e) =>
                onChange({
                  ...lesson,
                  origin: "manual",
                  sources: lesson.sources.map((s, i) =>
                    i === index ? { ...s, author: e.target.value } : s,
                  ),
                })
              }
            />
          </div>
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={lesson.sourceIds.includes(source.id)}
              onChange={(e) =>
                onChange({
                  ...lesson,
                  origin: "manual",
                  sourceIds: e.target.checked
                    ? [...lesson.sourceIds, source.id]
                    : lesson.sourceIds.filter((id) => id !== source.id),
                })
              }
            />
            在结果讲解中关联这条来源
          </label>
          <a
            className="text-link"
            href={source.url}
            target="_blank"
            rel="noreferrer"
          >
            阅读来源 ↗
          </a>
          <button
            className="text-button source-remove"
            onClick={() =>
              onChange({
                ...lesson,
                origin: "manual",
                sources: lesson.sources.filter((s) => s.id !== source.id),
                sourceIds: lesson.sourceIds.filter((id) => id !== source.id),
              })
            }
          >
            移出当前作品
          </button>
        </div>
      ))}
      {!lesson.sources.length && (
        <p className="small muted">
          暂无外部来源。可以在下方补充出处，再关联到讲解。
        </p>
      )}
      <AddSource
        count={lesson.sources.length}
        onAdd={(source) =>
          onChange({
            ...lesson,
            origin: "manual",
            sources: [...lesson.sources, source],
            sourceIds: [...lesson.sourceIds, source.id],
          })
        }
      />
    </div>
  );
}
