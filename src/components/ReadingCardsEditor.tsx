"use client";
import { useId } from "react";
import { type Lesson, type ReadingCardSchema } from "@/lib/lesson";
import type { z } from "zod";
type Card = z.infer<typeof ReadingCardSchema>;

export function ReadingCardsEditor({
  lesson,
  onChange,
}: {
  lesson: Lesson;
  onChange: (lesson: Lesson, group?: string) => void;
}) {
  const prefix = useId();
  if (lesson.experiment.type !== "article-exploration") return null;
  const experiment = lesson.experiment;
  function update(index: number, patch: Partial<Card>, field: string) {
    onChange(
      {
        ...lesson,
        origin: "manual",
        experiment: {
          ...experiment,
          cards: experiment.cards.map((card, i) =>
            i === index ? { ...card, ...patch } : card,
          ),
        },
      },
      `reading-${index}-${field}`,
    );
  }
  return (
    <div className="reading-cards-editor">
      {experiment.cards.map((card, index) => (
        <details className="reading-edit-card" key={index} open={undefined}>
          <summary>
            要点 {index + 1} · {card.concept || "待填写要点"}
          </summary>
          {(
            [
              ["concept", "核心要点", 80],
              ["question", "情境问题", 300],
              ["explanation", "要点解释", 500],
            ] as const
          ).map(([field, label, max]) => (
            <div className="form-field" key={field}>
              <label htmlFor={`${prefix}-${index}-${field}`}>
                {label} {index + 1}
              </label>
              <textarea
                id={`${prefix}-${index}-${field}`}
                rows={field === "concept" ? 1 : 3}
                value={card[field]}
                maxLength={max}
                onChange={(event) =>
                  update(index, { [field]: event.target.value }, field)
                }
              />
            </div>
          ))}
          {card.options.map((option, optionIndex) => (
            <div key={optionIndex}>
              <div className="form-field">
                <label htmlFor={`${prefix}-${index}-option-${optionIndex}`}>
                  选项 {String.fromCharCode(65 + optionIndex)} · 要点{" "}
                  {index + 1}
                </label>
                <input
                  id={`${prefix}-${index}-option-${optionIndex}`}
                  value={option.label}
                  maxLength={180}
                  onChange={(event) =>
                    update(
                      index,
                      {
                        options: card.options.map((item, i) =>
                          i === optionIndex
                            ? { ...item, label: event.target.value }
                            : item,
                        ),
                      },
                      `option-${optionIndex}`,
                    )
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor={`${prefix}-${index}-feedback-${optionIndex}`}>
                  选择 {String.fromCharCode(65 + optionIndex)} 后的反馈 · 要点{" "}
                  {index + 1}
                </label>
                <textarea
                  id={`${prefix}-${index}-feedback-${optionIndex}`}
                  rows={2}
                  value={option.feedback}
                  maxLength={360}
                  onChange={(event) =>
                    update(
                      index,
                      {
                        options: card.options.map((item, i) =>
                          i === optionIndex
                            ? { ...item, feedback: event.target.value }
                            : item,
                        ),
                      },
                      `feedback-${optionIndex}`,
                    )
                  }
                />
              </div>
            </div>
          ))}
          <div className="form-field">
            <label htmlFor={`${prefix}-${index}-correct`}>
              最符合本文的选项 · 要点 {index + 1}
            </label>
            <select
              id={`${prefix}-${index}-correct`}
              value={card.correctIndex}
              onChange={(event) =>
                update(
                  index,
                  { correctIndex: Number(event.target.value) },
                  "correct",
                )
              }
            >
              {card.options.map((_, i) => (
                <option key={i} value={i}>
                  {String.fromCharCode(65 + i)}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor={`${prefix}-${index}-source`}>
              原句出处 · 要点 {index + 1}
            </label>
            <select
              id={`${prefix}-${index}-source`}
              value={card.evidence.sourceId}
              onChange={(event) =>
                update(
                  index,
                  {
                    evidence: {
                      ...card.evidence,
                      sourceId: event.target.value,
                    },
                  },
                  "source",
                )
              }
            >
              <option value="material">本次提交的正文材料</option>
              {lesson.sources.map((source) => (
                <option value={source.id} key={source.id}>
                  {source.title}
                </option>
              ))}
            </select>
          </div>
          <div className="form-field">
            <label htmlFor={`${prefix}-${index}-quote`}>
              材料原句 · 要点 {index + 1}
            </label>
            <textarea
              id={`${prefix}-${index}-quote`}
              value={card.evidence.quote}
              rows={3}
              maxLength={160}
              onChange={(event) =>
                update(
                  index,
                  { evidence: { ...card.evidence, quote: event.target.value } },
                  "quote",
                )
              }
            />
          </div>
        </details>
      ))}
    </div>
  );
}
