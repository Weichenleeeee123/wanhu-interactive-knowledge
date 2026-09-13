"use client";
import { useState } from "react";
import type { z } from "zod";
import { type ArticleExplorationSchema, type Source } from "@/lib/lesson";
export function ArticleExploration({
  experiment,
  sources,
  onActivity,
  onChallenge,
}: {
  experiment: z.infer<typeof ArticleExplorationSchema>;
  sources: Source[];
  onActivity: (text: string) => void;
  onChallenge: (correct: boolean | null) => void;
}) {
  const [index, setIndex] = useState(0),
    [answers, setAnswers] = useState<(number | null)[]>(
      experiment.cards.map(() => null),
    );
  const card = experiment.cards[index],
    answer = answers[index],
    source = sources.find((source) => source.id === card.evidence.sourceId);
  const completed = answers.filter((answer) => answer !== null).length;
  function choose(value: number) {
    const next = answers.map((answer, i) => (i === index ? value : answer));
    setAnswers(next);
    onActivity(
      `已完成 ${next.filter((answer) => answer !== null).length}/${experiment.cards.length} 个情境选择，可对照每题的材料原句。`,
    );
    onChallenge(
      next.every((answer, i) => answer === experiment.cards[i].correctIndex)
        ? true
        : next.some(
              (answer, i) =>
                answer !== null && answer !== experiment.cards[i].correctIndex,
            )
          ? false
          : null,
    );
  }
  return (
    <div className="reading-trail" aria-label="原文互动阅读">
      <div className="reading-trail-header">
        <span>把作者的意思，放回具体情境</span>
        <strong>
          {index + 1} / {experiment.cards.length}
        </strong>
      </div>
      <div className="reading-card">
        <span className="eyebrow">READ · CHOOSE · CHECK</span>
        <h3>{card.concept}</h3>
        <p className="reading-scenario">{card.question}</p>
        <div className="reading-options">
          {card.options.map((option, i) => (
            <button
              key={i}
              className={answer === i ? "is-chosen" : ""}
              aria-pressed={answer === i}
              onClick={() => choose(i)}
            >
              <span>{String.fromCharCode(65 + i)}</span>
              {option.label}
            </button>
          ))}
        </div>
        {answer !== null && (
          <>
            <div className="reading-feedback" role="status">
              <strong>
                {answer === card.correctIndex
                  ? "这个选择更贴近本文的表达"
                  : "再对照作者的表达想一想"}
              </strong>
              <p>{card.options[answer].feedback}</p>
              <p>{card.explanation}</p>
            </div>
            <div className="reading-evidence">
              <span className="small">对照材料原句</span>
              <blockquote>“{card.evidence.quote}”</blockquote>
              <span className="small">
                {source
                  ? `${source.title} · ${source.author || "作者信息未提供"}`
                  : "来自本次提交的正文材料"}
              </span>
              {source && (
                <a
                  className="text-link"
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {source.provenance === "zhihu-knowledge"
                    ? "核对知乎官方内容"
                    : "核对来源"}{" "}
                  ↗
                </a>
              )}
            </div>
          </>
        )}
        <div className="reading-card-nav">
          <button
            className="button"
            disabled={index === 0}
            onClick={() => setIndex(index - 1)}
          >
            ← 上一个要点
          </button>
          <div
            className="reading-progress-dots"
            aria-label={`已作答 ${completed} 个要点`}
          >
            {answers.map((answer, i) => (
              <span key={i} className={answer !== null ? "done" : ""} />
            ))}
          </div>
          {index < experiment.cards.length - 1 ? (
            <button
              className="button primary"
              disabled={answer === null}
              onClick={() => setIndex(index + 1)}
            >
              下一个情境 →
            </button>
          ) : (
            <span className="small muted">
              {completed === experiment.cards.length
                ? "已走完这次阅读"
                : "继续对照材料理解"}
            </span>
          )}
        </div>
        <p className="field-note">
          选项用于核对对本文的理解；作者观点不等于适用于所有情境的结论。
        </p>
      </div>
    </div>
  );
}
