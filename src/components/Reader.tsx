"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/lesson";
import { getExample } from "@/lib/examples";
import { decodeLesson, parseLessonFile } from "@/lib/share";
import { LessonView } from "./LessonView";
import { Header } from "./Brand";
import { createWork, saveWork } from "@/lib/works";
export function Reader() {
  const [lesson, setLesson] = useState<Lesson | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
  const [savedCopy, setSavedCopy] = useState<{
      lesson: Lesson;
      id: string;
    } | null>(null),
    [saveError, setSaveError] = useState("");
  function keep() {
    if (!lesson) return;
    try {
      const work = saveWork(
        window.localStorage,
        createWork({ lesson, mode: "learn" }),
      );
      setSavedCopy({ lesson, id: work.id });
      setSaveError("");
    } catch {
      setSaveError("未能保存到当前浏览器。可以先保留这个分享链接，稍后再试。");
    }
  }
  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const example = getExample(
          new URLSearchParams(window.location.search).get("example"),
        );
        const next = window.location.hash
          ? await decodeLesson(window.location.hash.slice(1))
          : example;
        if (!next)
          throw new Error("链接中没有作品，请打开一个示例或导入作品文件。");
        if (active) setLesson(next);
      } catch (e) {
        if (active) {
          setLesson(null);
          setError(e instanceof Error ? e.message : "作品读取失败");
        }
      } finally {
        if (active) setLoading(false);
      }
    }
    void load();
    window.addEventListener("hashchange", load);
    return () => {
      active = false;
      window.removeEventListener("hashchange", load);
    };
  }, []);
  async function importFile(file: File | undefined) {
    if (!file) return;
    try {
      if (file.size > 65536) throw new Error("文件过大，最多 64 KiB");
      setLesson(parseLessonFile(await file.text()));
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "文件读取失败");
    }
  }
  return (
    <>
      <Header />
      <main className="reader-shell">
        {loading ? (
          <p className="loading-state" role="status">
            正在展开这份知识作品…
          </p>
        ) : lesson ? (
          <>
            <div className="reader-topline">
              <Link href="/#experiments">← 返回实验集</Link>
              {savedCopy?.lesson === lesson ? (
                <Link
                  className="text-button"
                  href={`/create?work=${savedCopy.id}`}
                >
                  已保存 · 继续编辑 ↗
                </Link>
              ) : (
                <button className="text-button" onClick={keep}>
                  ＋ 保存到我的作品
                </button>
              )}
            </div>
            {saveError && (
              <p role="alert" className="error-message">
                {saveError}
              </p>
            )}
            <LessonView lesson={lesson} />
            <div className="reader-bottom">
              <span>你也有想讲清楚的问题？</span>
              <Link className="button primary" href="/create">
                制作我的互动作品 →
              </Link>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <span className="empty-mark">↗</span>
            <h1>这份作品暂时打不开</h1>
            <p role="alert">{error}</p>
            <div className="controls">
              <Link
                className="button primary"
                href="/view?example=gradient-descent"
              >
                体验梯度下降
              </Link>
              <label className="button file-label">
                导入 JSON 作品
                <input
                  type="file"
                  accept=".json,application/json"
                  onChange={(e) => void importFile(e.target.files?.[0])}
                />
              </label>
            </div>
          </div>
        )}
      </main>
      <footer className="footer">
        <span>玩乎 · 让知识动起来</span>
        <span>理解，始于亲自试一试。</span>
      </footer>
    </>
  );
}
