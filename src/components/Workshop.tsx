"use client";
import { useEffect, useRef, useState } from "react";
import { Header } from "./Brand";
import { MaterialInput } from "./MaterialInput";
import { LessonEditor } from "./LessonEditor";
import { LessonView } from "./LessonView";
import { SharePanel, exportLesson, exportWriting } from "./SharePanel";
import { LessonSchema, type Lesson, type ExperimentType } from "@/lib/lesson";
import { getExample } from "@/lib/examples";
import { readDraft, saveDraft } from "@/lib/drafts";
import { encodeLesson, parseLessonFile } from "@/lib/share";
export function Workshop() {
  const revision = useRef(0);
  const inputPanel = useRef<HTMLElement>(null);
  const [readingLink, setReadingLink] = useState<{lesson:Lesson;url:string} | null>(null);
  const [mode, setMode] = useState<"teach" | "learn">("teach"),
    [lesson, setLesson] = useState<Lesson | null>(null);
  const [tab, setTab] = useState<"material" | "editor">("material"),
    [mobilePreview, setMobilePreview] = useState(false);
  const [capabilities, setCapabilities] = useState<{
    search: boolean;
    generation: boolean;
    provider: string;
  } | null>(null);
  const [saved, setSaved] = useState<ReturnType<typeof readDraft>>(null),
    [saveStatus, setSaveStatus] = useState(""),
    [dirty, setDirty] = useState(false);
  const [notice, setNotice] = useState(""),
    [fileError, setFileError] = useState(""),
    [sharing, setSharing] = useState<Lesson | null>(null),
    [ready, setReady] = useState(false);
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setMode(params.get("mode") === "learn" ? "learn" : "teach");
    const example = getExample(params.get("example"));
    if (example) {
      setLesson(example);
      setTab("editor");
    }
    try {
      setSaved(readDraft(window.localStorage));
    } catch {}
    setReady(true);
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
    if (!dirty || !lesson) return;
    const valid = LessonSchema.safeParse(lesson);
    if (!valid.success) {
      setSaveStatus("待修正后保存");
      return;
    }
    setSaveStatus("正在保存…");
    const timer = setTimeout(() => {
      try {
        saveDraft(window.localStorage, valid.data);
        setSaveStatus("已保存到本机");
      } catch {
        setSaveStatus("保存失败，请导出作品");
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [lesson, dirty]);
  useEffect(() => {
    let active = true;
    const current = lesson && LessonSchema.safeParse(lesson);
    if (current?.success && lesson) {
      const snapshot = lesson;
      encodeLesson(current.data).then(payload => {
        if (active) setReadingLink({lesson:snapshot,url:`${window.location.origin}/view#${payload}`});
      }).catch(() => { if(active) setReadingLink(null); });
    } else setReadingLink(null);
    return () => { active = false; };
  }, [lesson]);
  useEffect(() => {
    if (tab === "editor" && inputPanel.current) inputPanel.current.scrollTop = 0;
  }, [tab]);
  function edit(next: Lesson) {
    revision.current += 1;
    setLesson(next);
    setDirty(true);
  }
  function example(type: ExperimentType) {
    revision.current += 1;
    setLesson(getExample(type));
    setDirty(true);
    setTab("editor");
    setMobilePreview(false);
    setNotice("已载入预置示例。修改讲解与参数，让它成为你的作品。");
  }
  async function importFile(file: File | undefined) {
    if (!file) return;
    const importingRevision = ++revision.current;
    setFileError("");
    try {
      if (file.size > 65536) throw new Error("作品文件过大，最多 64 KiB");
      const next = parseLessonFile(await file.text());
      if (importingRevision !== revision.current) return;
      edit(next);
      setTab("editor");
      setNotice("作品已导入，可以继续编辑。");
    } catch (e) {
      setFileError(e instanceof Error ? e.message : "文件读取失败");
    }
  }
  const parsed = lesson ? LessonSchema.safeParse(lesson) : null,
    valid = parsed?.success ? parsed.data : null;
  const invalid =
    parsed && !parsed.success
      ? parsed.error.issues.map((i) => i.message).join("；")
      : "";
  if (!ready)
    return (
      <>
        <Header workshop />
        <p className="loading-state">正在打开你的工坊…</p>
      </>
    );
  return (
    <>
      <Header workshop />
      <main className="workshop-shell">
        <div className="workshop-heading">
          <div>
            <span className="eyebrow">YOUR KNOWLEDGE WORKSHOP</span>
            <h1>把一个问题，变成一次探索。</h1>
          </div>
          <div className="mode-switch" role="group" aria-label="使用场景">
            <button
              className={mode === "teach" ? "active" : ""}
              onClick={() => {
                revision.current += 1;
                setMode("teach");
              }}
            >
              我想讲清楚
            </button>
            <button
              className={mode === "learn" ? "active" : ""}
              onClick={() => {
                revision.current += 1;
                setMode("learn");
              }}
            >
              我想弄明白
            </button>
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
              <span>02</span> 编辑作品
            </button>
          </div>
          <div className="toolbar-actions">
            <span className="save-status" role="status">
              {saveStatus}
            </span>
            {readingLink?.lesson === lesson && readingLink && valid && (
              <a className="button reader-preview-link" href={readingLink.url} target="_blank" rel="noreferrer">
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
              生成分享链接
            </button>
          </div>
        </div>
        {saved && (
          <div className="draft-banner">
            <span>发现上次保存在本机的作品：{saved.lesson.title}</span>
            <button
              className="text-button"
              onClick={() => {
                revision.current += 1;
                setLesson(saved.lesson);
                setSaved(null);
                setDirty(false);
                setSaveStatus("已恢复本地草稿");
                setTab("editor");
                setNotice("草稿已恢复。");
              }}
            >
              恢复本地草稿
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
            {invalid}。预览与分享将在内容有效后恢复。
          </p>
        )}
        <div className="mobile-preview-tabs">
          <button
            className={!mobilePreview ? "active" : ""}
            onClick={() => setMobilePreview(false)}
          >
            编辑
          </button>
          <button
            className={mobilePreview ? "active" : ""}
            onClick={() => setMobilePreview(true)}
          >
            作品预览
          </button>
        </div>
        <div
          className={`workspace-grid ${mobilePreview ? "show-mobile-preview" : ""}`}
        >
          <aside className="input-panel" ref={inputPanel}>
            <div hidden={tab !== "material"}>
              <MaterialInput
                mode={mode}
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
                  setNotice(mode === "learn" ? "互动讲解已生成。可以开始阅读、操作实验，也可以继续调整讲解。" : reason);
                }}
                onExample={example}
              />
            </div>
            {lesson && tab === "editor" && (
              <>
                <LessonEditor lesson={lesson} onChange={edit} />
                <div className="editor-exports">
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
                <span className="live-dot" /> 作品预览
              </span>
              <span>{valid ? "你的读者会看到这里" : "等待一个好问题"}</span>
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
                  <span>实验</span>
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
        <span>草稿保存在当前浏览器 · 分享链接包含作品快照</span>
        <span>知玩 / KNOWLEDGE IN MOTION</span>
      </footer>
    </>
  );
}
