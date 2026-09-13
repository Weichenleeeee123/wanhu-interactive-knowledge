"use client";
import { useEffect, useRef, useState } from "react";
import type { Lesson } from "@/lib/lesson";
import { encodeLesson, lessonJson } from "@/lib/share";
function download(content: string, name: string, type: string) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement("a");
  link.href = url;
  link.download = name;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function exportLesson(lesson: Lesson) {
  download(lessonJson(lesson), "玩乎-互动作品.json", "application/json");
}
export function exportWriting(lesson: Lesson) {
  const content = [
    `# ${lesson.title}`,
    lesson.intro,
    `## 学习目标\n${lesson.goal}`,
    `## ${lesson.experiment.type === "article-exploration" ? "阅读起点" : "先做预测"}\n${lesson.prediction}`,
    `## ${lesson.experiment.type === "article-exploration" ? "参与情境" : "动手观察"}\n${lesson.observation}`,
    ...(lesson.experiment.type === "article-exploration"
      ? lesson.experiment.cards.map((card, index) => {
          const source = lesson.sources.find(
            (source) => source.id === card.evidence.sourceId,
          );
          return [
            `## 情境 ${index + 1}：${card.concept}`,
            card.question,
            ...card.options.map(
              (option, i) =>
                `${String.fromCharCode(65 + i)}. ${option.label}\n   反馈：${option.feedback}`,
            ),
            `本文更贴近的选择：${String.fromCharCode(65 + card.correctIndex)}`,
            card.explanation,
            `> ${card.evidence.quote}`,
            source
              ? `出处：${source.title} / ${source.author || "作者信息未提供"}\n${source.url}`
              : "出处：本次提交的正文材料",
          ].join("\n\n");
        })
      : []),
    `## 结果讲解\n${lesson.explanation}`,
    `## 带走一个理解\n${lesson.challenge}`,
    `## 参考来源\n${lesson.sources.map((s) => `- ${s.title} — ${s.author || "作者信息未提供"}\n  ${s.url}`).join("\n")}`,
  ].join("\n\n");
  download(content, "玩乎-讲解文案.md", "text/markdown;charset=utf-8");
}
export function SharePanel({
  lesson,
  onClose,
}: {
  lesson: Lesson;
  onClose: () => void;
}) {
  const [url, setUrl] = useState(""),
    [error, setError] = useState(""),
    [copyState, setCopyState] = useState("");
  const input = useRef<HTMLInputElement>(null),
    dialog = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    dialog.current?.showModal();
    const current = dialog.current;
    return () => current?.close();
  }, []);
  useEffect(() => {
    let active = true;
    encodeLesson(lesson)
      .then((payload) => {
        if (active) setUrl(`${window.location.origin}/view#${payload}`);
      })
      .catch((e) => {
        if (active) setError(e instanceof Error ? e.message : "链接生成失败");
      });
    return () => {
      active = false;
    };
  }, [lesson]);
  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopyState("链接已复制");
    } catch {
      input.current?.select();
      setCopyState("请手动复制选中的链接");
    }
  }
  return (
    <dialog ref={dialog} className="share-dialog" onCancel={onClose}>
      <div className="section-line">
        <span className="eyebrow">SHARE AN UNDERSTANDING</span>
        <button className="icon-button" aria-label="关闭分享" onClick={onClose}>
          ×
        </button>
      </div>
      <span className="share-symbol" aria-hidden="true">
        ↗
      </span>
      <h2>让这次理解，走得更远。</h2>
      <p>这是当前作品的快照。后续编辑不会改变这个链接里的内容。</p>
      {error ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : url ? (
        <>
          <label htmlFor="share-url" className="small">
            发布到知乎文章的分享链接
          </label>
          <input
            ref={input}
            id="share-url"
            readOnly
            value={url}
            onFocus={(e) => e.target.select()}
          />
          <div className="controls">
            <button className="button primary" onClick={() => void copy()}>
              复制分享链接
            </button>
            <a className="button" href={url} target="_blank" rel="noreferrer">
              打开作品 ↗
            </a>
          </div>
          <p role="status" className="small">
            {copyState}
          </p>
          {["localhost", "127.0.0.1", "[::1]"].includes(
            new URL(url).hostname,
          ) && (
            <p className="notice">
              当前是本机预览链接。部署后才能分享给其他设备；现在也可以导出作品文件。
            </p>
          )}
        </>
      ) : (
        <p role="status">正在打包你的互动作品…</p>
      )}
      <div className="share-downloads">
        <button className="text-button" onClick={() => exportLesson(lesson)}>
          导出 JSON 作品 ↓
        </button>
        <button className="text-button" onClick={() => exportWriting(lesson)}>
          导出讲解文案 ↓
        </button>
      </div>
      <p className="small muted">
        将它作为普通链接粘贴进知乎文章。安装玩乎的读者会在链接附近自动展开互动卡片；其他读者仍可点击链接打开完整阅读页。
      </p>
    </dialog>
  );
}
