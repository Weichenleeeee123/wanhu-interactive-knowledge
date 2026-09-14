"use client";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { Lesson } from "@/lib/lesson";
import { getExample } from "@/lib/examples";
import { decodeLesson, parseLessonFile } from "@/lib/share";
import { LessonView } from "./LessonView";
import { ThinkingAssist } from "./ThinkingAssist";
import { Header } from "./Brand";
import { createWork, saveWork } from "@/lib/works";
export function Reader() {
  const reading=useRef<HTMLDivElement>(null),assistance=useRef<HTMLDivElement>(null);
  function jumpToInteraction(){
    const target=reading.current?.querySelector<HTMLElement>('[data-wanhu-interaction], .curated');
    const control=target?.querySelector<HTMLElement>('button:not(:disabled), input:not(:disabled), select:not(:disabled)');
    (control??target)?.scrollIntoView({block:control?'center':'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});
    control?.focus({preventScroll:true});
  }
  function askNow(){const details=assistance.current?.querySelector('details');if(details)details.open=true;assistance.current?.scrollIntoView({block:'center',behavior:'instant'});assistance.current?.querySelector('textarea')?.focus({preventScroll:true});}
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
              {lesson.sources[0]?<a href={lesson.sources[0].url} target="_blank" rel="noreferrer">← 返回原文</a>:<Link href="/#examples">← 返回示例作品</Link>}
              {savedCopy?.lesson === lesson ? (
                <Link
                  className="text-button"
                  href={`/create?work=${savedCopy.id}`}
                >
                  已保存 · 继续理解 ↗
                </Link>
              ) : (
                <button className="text-button" onClick={keep}>
                  ＋ 保存这份阅读
                </button>
              )}
            </div>
            {saveError && (
              <p role="alert" className="error-message">
                {saveError}
              </p>
            )}
            <div className="reader-guide"><div><strong>亲手试一次，再回到原文。</strong><p>可以先动手，也可以带着疑问开始。</p></div><div className="reader-quick-actions"><button className="button primary" onClick={jumpToInteraction}>直接动手试试 ↓</button><button className="button" onClick={askNow}>我有个问题</button></div></div>
            <div ref={reading}><LessonView lesson={lesson} /></div>
            <div ref={assistance}>
            <ThinkingAssist key={JSON.stringify(lesson)} mode="learn" material={lesson.sources.map(source=>source.excerpt).filter(Boolean).join('\n\n') || lesson.intro+'\n'+lesson.explanation}/>
            </div>

            <div className="reader-bottom">
              <span>试过之后，回到原文看看是否有新的理解。</span>
              <Link className="button primary" href="/create?mode=learn">
                理解另一段 →
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
