"use client";
import { useEffect, useRef, useState } from "react";
import { Header } from "./Brand";
import { ThinkingAssist } from "./ThinkingAssist";
import { MaterialInput } from "./MaterialInput";
import { LessonEditor } from "./LessonEditor";
import { LessonView } from "./LessonView";
import { SharePanel, exportLesson, exportWriting } from "./SharePanel";
import { LessonSchema, type Lesson, type ExperimentType } from "@/lib/lesson";
import { getExample } from "@/lib/examples";
import { createWork, parseWorkBackup, workTitle } from "@/lib/works";
import { useWorkSession } from "./useWorkSession";
import { exportWork } from "./WorkLibrary";
import { encodeLesson, parseLessonFile } from "@/lib/share";
export function Workshop() {
  const session = useWorkSession();
  const { work, ready, saveStatus } = session;
  const lesson = work?.lesson ?? null,
    mode = work?.mode ?? "teach";
  const revision = useRef(0);
  const inputPanel = useRef<HTMLElement>(null);
  const [readingLink, setReadingLink] = useState<{
    lesson: Lesson;
    url: string;
  } | null>(null);
  const [tab, setTab] = useState<"material" | "editor">("material"),
    [mobilePreview, setMobilePreview] = useState(false);
  const [capabilities, setCapabilities] = useState<{
    search: boolean;
    generation: boolean;
    provider: string;
  } | null>(null);
  const [notice, setNotice] = useState(""),
    [fileError, setFileError] = useState(""),
    [sharing, setSharing] = useState<Lesson | null>(null);
  useEffect(() => {
    fetch("/api/capabilities")
      .then((r) => r.json())
      .then((data) => {
        if (
          typeof data.search === "boolean" &&
          typeof data.generation === "boolean"
        )
          setCapabilities(data);
      })
      .catch(() => setNotice("服务状态暂时无法读取，可以先编辑示例。"));
  }, []);
  useEffect(() => {
    if (work) setTab(work.lesson ? "editor" : "material");
  }, [work?.id]);
  useEffect(() => {
    let active = true;
    const current = lesson && LessonSchema.safeParse(lesson);
    if (current?.success && lesson) {
      const snapshot = lesson;
      encodeLesson(current.data)
        .then((payload) => {
          if (active)
            setReadingLink({
              lesson: snapshot,
              url: `${window.location.origin}/view#${payload}`,
            });
        })
        .catch(() => {
          if (active) setReadingLink(null);
        });
    } else setReadingLink(null);
    return () => {
      active = false;
    };
  }, [lesson]);
  useEffect(() => {
    if (tab === "editor" && inputPanel.current)
      inputPanel.current.scrollTop = 0;
  }, [tab]);
  function edit(next: Lesson, group = "") {
    revision.current += 1;
    session.edit(next, group);
  }
  function example(type: ExperimentType) {
    revision.current += 1;
    if (!session.open(createWork({ lesson: getExample(type), mode }))) return;
    setTab("editor");
    setMobilePreview(false);
    setNotice("已载入预置示例。修改讲解与参数，让它成为你的作品。");
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    const importingRevision = ++revision.current;
    setFileError("");
    try {
      if (file.size > 1024 * 1024) throw new Error("文件过大，最多 1 MiB");
      const raw = await file.text();
      const next =
        JSON.parse(raw)?.format === "wanhu-workspace-v1"
          ? parseWorkBackup(raw)
          : createWork({ lesson: parseLessonFile(raw), mode });
      if (importingRevision !== revision.current) return;
      if (!session.open(next)) return;
      setTab(next.lesson ? "editor" : "material");
      setNotice("已导入为独立作品，可以继续编辑。");
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "文件读取失败");
    }
  }
  const parsed = lesson ? LessonSchema.safeParse(lesson) : null,
    valid = parsed?.success ? parsed.data : null;
  const invalid =
    parsed && !parsed.success
      ? parsed.error.issues
          .map(
            (i) =>
              `${({ title: "作品标题", intro: "开场讲解", goal: "学习目标", prediction: "预测问题", observation: "观察提示", explanation: "结果讲解", challenge: "带走一个理解", experiment: "初始参数", sources: "引用来源", sourceIds: "来源关联" } as Record<string, string>)[String(i.path[0])] || "作品内容"}：${i.message}`,
          )
          .join("；")
      : "";
  if (!ready)
    return (
      <>
        <Header workshop />
        <p className="loading-state">正在打开你的工坊…</p>
      </>
    );
  if (!work)
    return (
      <>
        <Header workshop />
        <main className="library-shell">
          <div className="empty-state">
            <h1>暂时无法继续这份作品</h1>
            <p role="alert">{session.loadError}</p>
            <div className="controls">
              <a className="button" href="/library">
                查看我的作品
              </a>
              <a className="button primary" href="/create">
                新建作品
              </a>
            </div>
          </div>
        </main>
      </>
    );
  return (
    <>
      <Header workshop />
      <main className="workshop-shell">
        <div className="workshop-heading">
          <div>
            <span className="eyebrow">YOUR KNOWLEDGE WORKSHOP</span>
            <h1>
              {mode === "teach"
                ? "把一个问题，变成一次探索。"
                : "从不理解的地方，开始探索。"}
            </h1>
          </div>
          <div className="mode-switch" role="group" aria-label="使用场景">
            <button
              className={mode === "teach" ? "active" : ""}
              onClick={() => {
                revision.current += 1;
                session.changeMode("teach");
              }}
            >
              我想讲清楚
            </button>
            <button
              className={mode === "learn" ? "active" : ""}
              onClick={() => {
                revision.current += 1;
                session.changeMode("learn");
              }}
            >
              我想弄明白
            </button>
          </div>
        </div>
        <div className="journey-strip" aria-label="创作进度">
          <div className={tab === "material" ? "journey-step active" : "journey-step done"}><span>01</span><div><strong>{mode === "teach" ? "准备写作素材" : "准备阅读材料"}</strong><small>导入知乎文章或粘贴关键段落</small></div></div>
          <div className="journey-arrow" aria-hidden="true">→</div>
          <div className={tab === "editor" ? "journey-step active" : "journey-step"}><span>02</span><div><strong>{mode==='teach'?'调整演示':'动手理解'}</strong><small>{mode==='teach'?'核对讲解，按需调整':'预测、操作，再核对解释'}</small></div></div>
          <div className="journey-arrow" aria-hidden="true">→</div>
          <div className={valid ? "journey-step ready" : "journey-step"}><span>03</span><div><strong>{mode==='teach'?'预览分享':'回到原文'}</strong><small>{valid ? "打开读者视角并生成链接" : "完成作品后解锁"}</small></div></div>
        </div>
        <div className="work-identity">
          <div>
            <a href="/library">我的作品</a>
            <span aria-hidden="true"> / </span>
            <strong>{workTitle(work)}</strong>
          </div>
          <div className="work-management">
            <a href={`/create?mode=${mode}`}>＋ 新建作品</a>
            <button
              onClick={() => {
                revision.current++;
                session.duplicate();
                setNotice("已打开独立副本，原作品保留在「我的作品」。");
              }}
            >
              另存副本
            </button>
            <button onClick={() => exportWork(work)}>备份素材与作品 ↓</button>
          </div>
        </div>
        <div className="workspace-toolbar">
          <div className="workspace-tabs">
            <button
              className={tab === "material" ? "active" : ""}
              onClick={() => {
                setTab("material");
                setMobilePreview(false);
              }}
            >
              <span>01</span> 素材与问题
            </button>
            <button
              disabled={!lesson}
              className={tab === "editor" ? "active" : ""}
              onClick={() => {
                setTab("editor");
                setMobilePreview(false);
              }}
            >
              <span>02</span> {mode==='teach'?'调整讲解':'继续理解'}
            </button>
          </div>
          <div className="toolbar-actions">
            <span className="save-status" role="status">
              {saveStatus}
            </span>
            <div
              className="history-controls"
              role="group"
              aria-label="改稿历史"
            >
              <button
                className="text-button"
                disabled={!session.canUndo}
                onClick={() => {
                  revision.current++;
                  const next = session.travel("undo");
                  setTab(next ? "editor" : "material");
                }}
              >
                ↶ 撤销
              </button>
              <button
                className="text-button"
                disabled={!session.canRedo}
                onClick={() => {
                  revision.current++;
                  const next = session.travel("redo");
                  setTab(next ? "editor" : "material");
                }}
              >
                ↷ 重做
              </button>
            </div>
            {readingLink?.lesson === lesson && readingLink && valid && (
              <a
                className="button reader-preview-link"
                href={readingLink.url}
                target="_blank"
                rel="noreferrer"
              >
                {mode === "learn" ? "开始阅读" : "用读者视角打开"} ↗
              </a>
            )}
            <label className="text-button file-label">
              导入作品
              <input
                aria-label="导入 JSON 作品"
                type="file"
                accept=".json,application/json"
                onChange={(e) => {
                  void importFile(e.target.files?.[0]);
                  e.target.value = "";
                }}
              />
            </label>
            <button
              className="button primary"
              disabled={!valid}
              onClick={() => {
                if (valid) setSharing(valid);
              }}
            >
              {mode==='teach'?'发布到知乎文章':'分享阅读链接'}
            </button>
          </div>
        </div>
        {session.saveError && (
          <div className="workspace-save-error" role="alert">
            <strong>{session.saveStatus}。</strong>
            {session.saveError}{" "}
            <button className="text-button" onClick={() => exportWork(work)}>
              下载当前备份
            </button>
          </div>
        )}
        {notice && (
          <div className="workspace-notice" role="status">
            {notice}
            <button aria-label="收起提示" onClick={() => setNotice("")}>
              ×
            </button>
          </div>
        )}
        {fileError && (
          <p className="error-message" role="alert">
            {fileError}
          </p>
        )}
        {invalid && (
          <p className="error-message" role="alert">
            {invalid}。未完成的编辑也会保存在本机；填写完整后即可预览和分享。
          </p>
        )}
        <div className="mobile-preview-tabs">
          <button
            className={!mobilePreview ? "active" : ""}
            onClick={() => setMobilePreview(false)}
          >
            {mode === "learn" ? "原文与提问" : "编辑"}
          </button>
          <button
            className={mobilePreview ? "active" : ""}
            onClick={() => setMobilePreview(true)}
          >
            {mode === "learn" ? "动手理解" : "作品预览"}
          </button>
        </div>
        <div
          className={`workspace-grid ${mode==='learn'?'reader-workspace':''} ${mobilePreview ? "show-mobile-preview" : ""}`}
        >
          <aside className="input-panel" ref={inputPanel}>
            <div hidden={tab !== "material"}>
              <MaterialInput
                key={work.id}
                mode={mode}
                value={work.material}
                onChange={(value) => {
                  revision.current++;
                  session.updateMaterial(value);
                }}
                capabilities={capabilities}
                onGenerationStart={() => revision.current}
                onGenerated={(next, reason, generationRevision) => {
                  if (generationRevision !== revision.current) {
                    setNotice("已保留当前编辑，较早的生成结果未覆盖作品。");
                    return;
                  }
                  edit(next);
                  setTab("editor");
                  setMobilePreview(mode === "learn");
                  setNotice(
                    mode === "learn"
                      ? "互动讲解已生成。可以开始阅读、参与互动，也可以继续调整讲解。"
                      : "互动演示已生成。请打开作品预览检查，再将分享链接贴进知乎文章。",
                  );
                }}
                onExample={example}
              />
            </div>
            {lesson && tab === "editor" && (
              <>
                {mode==='teach'?<LessonEditor lesson={lesson} onChange={edit}/>:<div className="reader-context-panel">
                  <span className="eyebrow">围绕原文继续理解</span><h2>{lesson.title}</h2>
                  <p>先在演示区动手试一试。如果仍有疑问，可以直接围绕这段提问。</p>
                  {lesson.sources.map(source=><blockquote key={source.id}><p>{source.excerpt}</p><a href={source.url} target="_blank" rel="noreferrer">返回《{source.title}》 ↗</a></blockquote>)}
                  <ThinkingAssist key={work.id} mode="learn" material={work.material.material || lesson.sources.map(source=>source.excerpt).join('\n\n') || lesson.intro+'\n'+lesson.explanation}/>
                </div>}
                <div className="editor-exports" hidden={mode==='learn'}>
                  <button
                    className="button"
                    disabled={!valid}
                    onClick={() => valid && exportWriting(valid)}
                  >
                    导出讲解文案 ↓
                  </button>
                  <button
                    className="button"
                    disabled={!valid}
                    onClick={() => valid && exportLesson(valid)}
                  >
                    导出 JSON 作品 ↓
                  </button>
                </div>
              </>
            )}
          </aside>
          <section className="preview-panel" aria-label="作品预览">
            <div className="preview-heading">
              <span>
                <span className="live-dot" /> {mode==='teach'?'作品预览':'动手理解'}
              </span>
              <span>{valid ? mode==='teach'?"你的读者会看到这里":"预测 → 操作 → 核对" : "等待一个好问题"}</span>
            </div>
            {valid ? (
              <LessonView lesson={valid} preview />
            ) : (
              <div className="preview-placeholder">
                <div className="placeholder-orbit" aria-hidden="true">
                  <span>?</span>
                  <i>↗</i>
                </div>
                <span className="eyebrow">AN IDEA BECOMES AN EXPERIENCE</span>
                <h2>理解，从一次尝试开始。</h2>
                <p>
                  选取知乎材料，或粘贴你的讲解。
                  <br />
                  把预测、操作与观察，组织成一次探索。
                </p>
                <div className="placeholder-steps">
                  <span>预测</span>
                  <i>→</i>
                  <span>互动形式</span>
                  <i>→</i>
                  <span>理解</span>
                </div>
                <button
                  className="text-button"
                  onClick={() => example("gradient-descent")}
                >
                  先打开一份示例 ↗
                </button>
              </div>
            )}
          </section>
        </div>
      </main>
      {sharing && (
        <SharePanel lesson={sharing} onClose={() => setSharing(null)} />
      )}
      <footer className="footer">
        <span>素材与作品保存在当前浏览器 · 可从「我的作品」继续</span>
        <span>玩乎 / KNOWLEDGE IN MOTION</span>
      </footer>
    </>
  );
}
