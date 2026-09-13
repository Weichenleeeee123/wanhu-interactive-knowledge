"use client";
import { useCallback, useState } from "react";
import { type Lesson, experimentNames } from "@/lib/lesson";
import { GradientExperiment } from "./GradientExperiment";
import { MontyExperiment } from "./MontyExperiment";
import { ArticleExploration } from "./ArticleExploration";
import {
  LearningRecap,
  PredictionCard,
  type LearningSession,
} from "./LearningProgress";
export function LessonView({
  lesson,
  preview = false,
}: {
  lesson: Lesson;
  preview?: boolean;
}) {
  return (
    <LessonExperience
      key={JSON.stringify(lesson)}
      lesson={lesson}
      preview={preview}
    />
  );
}
function LessonExperience({
  lesson,
  preview,
}: {
  lesson: Lesson;
  preview: boolean;
}) {
  const [session, setSession] = useState<LearningSession>({
    prediction: null,
    activity: "",
    verified: null,
  });
  const activity = useCallback(
    (value: string) => setSession((s) => ({ ...s, activity: value })),
    [],
  );
  const challenge = useCallback(
    (value: boolean | null) => setSession((s) => ({ ...s, verified: value })),
    [],
  );
  return (
    <article className={`lesson ${preview ? "lesson-preview" : ""}`}>
      <div className="lesson-label">
        <span className="pill">{experimentNames[lesson.experiment.type]}</span>
        <span>
          {lesson.origin === "example"
            ? "预置示例 · 原创教学说明"
            : lesson.origin === "ai"
              ? "AI 辅助创作 · 请核对讲解"
              : "手动编辑作品"}
        </span>
      </div>
      <h1>{lesson.title}</h1>
      <p className="lesson-intro">{lesson.intro}</p>
      <div className="learning-goal">
        <span>本次弄懂</span>
        <p>{lesson.goal}</p>
      </div>
      <section className="lesson-section">
        <div className="step-kicker">
          <span>01</span>
          {lesson.experiment.type === "article-exploration"
            ? "带着问题开始阅读"
            : "先做一个预测"}
        </div>
        <p>{lesson.prediction}</p>
        <PredictionCard
          experiment={lesson.experiment}
          value={session.prediction}
          onSelect={(value) =>
            setSession((s) =>
              s.prediction === null ? { ...s, prediction: value } : s,
            )
          }
        />
      </section>
      <section className="lesson-section">
        <div className="step-kicker">
          <span>02</span>现在，动手试一试
        </div>
        <p className="observation-note">{lesson.observation}</p>
        {lesson.experiment.type === "article-exploration" ? (
          <ArticleExploration
            experiment={lesson.experiment}
            sources={lesson.sources}
            onActivity={activity}
            onChallenge={challenge}
          />
        ) : lesson.experiment.type === "gradient-descent" ? (
          <GradientExperiment
            initialX={lesson.experiment.initialX}
            learningRate={lesson.experiment.learningRate}
            onActivity={activity}
            onChallenge={challenge}
          />
        ) : (
          <MontyExperiment
            trials={lesson.experiment.trials}
            onActivity={activity}
            onChallenge={challenge}
          />
        )}
      </section>
      <section className="lesson-section explanation">
        <div className="step-kicker">
          <span>03</span>把观察连成理解
        </div>
        <p>{lesson.explanation}</p>
        <p className="small muted">
          {lesson.experiment.type === "article-exploration"
            ? "阅读说明：情境题用于理解本次材料的表达。引句可核对，生成的解释仍需作者审阅。"
            : lesson.experiment.type === "gradient-descent"
              ? "模型说明：本实验固定采用 f(x) = x²，不代表所有损失函数。"
              : "模型说明：主实验采用标准主持人规则；延伸实验单独对照随机开门，不混用样本与结论。"}
        </p>
        {lesson.sourceIds.length > 0 && (
          <div className="inline-sources">
            参考线索：
            {lesson.sourceIds.map((id) => {
              const source = lesson.sources.find((s) => s.id === id);
              return source ? (
                <button
                  className="citation-link"
                  key={id}
                  onClick={(event) => {
                    const root = event.currentTarget.getRootNode() as Document | ShadowRoot;
                    const target = root.getElementById(`source-${id}`);
                    if (target instanceof HTMLDetailsElement) {
                      target.open = true;
                      target.scrollIntoView({
                        behavior: window.matchMedia(
                          "(prefers-reduced-motion: reduce)",
                        ).matches
                          ? "instant"
                          : "smooth",
                        block: "center",
                      });
                      target
                        .querySelector("summary")
                        ?.focus({ preventScroll: true });
                    }
                  }}
                >
                  {source.title} ↘
                </button>
              ) : null;
            })}
          </div>
        )}
      </section>
      <aside className="takeaway">
        <span className="eyebrow">TAKE IT WITH YOU</span>
        <p>{lesson.challenge}</p>
      </aside>
      <LearningRecap lesson={lesson} session={session} />
      <section className="source-section">
        <div className="section-line">
          <h2>理解，有迹可循</h2>
          <span className="small muted">
            材料来源 / {lesson.sources.length.toString().padStart(2, "0")}
          </span>
        </div>
        {lesson.sources.length ? (
          lesson.sources.map((s, i) => (
            <details className="source-item" id={`source-${s.id}`} key={s.id}>
              <summary>
                <span className="source-index">{i + 1}</span>
                <span>
                  <strong>{s.title}</strong>
                  <small>{s.author || "作者信息未提供"}</small>
                </span>
                <span aria-hidden="true">＋</span>
              </summary>
              <p>{s.excerpt || "未提供摘要，请阅读原文。"}</p>
              <a
                href={s.url}
                target="_blank"
                rel="noreferrer"
                className="text-link"
              >
                {s.provenance === "zhihu-knowledge"
                  ? "核对知乎官方内容"
                  : new URL(s.url).hostname === "zhihu.com" ||
                      new URL(s.url).hostname.endsWith(".zhihu.com")
                    ? "回知乎读完整解释"
                    : "阅读来源原文"}{" "}
                ↗
              </a>
            </details>
          ))
        ) : (
          <p className="small muted">创作者未提供外部参考来源。</p>
        )}
        <p className="source-disclaimer">
          本页为辅助理解的互动讲解。引用摘要不等于原文全文，参考链接不代表原作者参与或认可本作品。
        </p>
      </section>
    </article>
  );
}
