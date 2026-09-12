"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/lesson";
import { getExample } from "@/lib/examples";
import { decodeLesson, parseLessonFile } from "@/lib/share";
import { LessonView } from "./LessonView";
import { Header } from "./Brand";
export function Reader() {
  const [lesson, setLesson] = useState<Lesson | null>(null),
    [error, setError] = useState(""),
    [loading, setLoading] = useState(true);
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
              <span>一份可以动手探索的讲解</span>
            </div>
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
        <span>知玩 · 让知识动起来</span>
        <span>理解，始于亲自试一试。</span>
      </footer>
    </>
  );
}
