"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Header } from "./Brand";
import { SharePanel } from "./SharePanel";
import {
  availableRecoveries,
  readPendingRecoveries,
  backupWork,
  duplicateWork,
  listWorks,
  migrateDraft,
  saveWork,
  workStatus,
  workTitle,
  type Work,
  type Recovery,
} from "@/lib/works";
import { LessonSchema, experimentNames, type Lesson } from "@/lib/lesson";

export function exportWork(work: Work) {
  const url = URL.createObjectURL(
    new Blob([backupWork(work)], { type: "application/json" }),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = `玩乎-素材与作品-${work.id.slice(0, 8)}.json`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function WorkLibrary() {
  const [works, setWorks] = useState<Work[]>([]),
    [ready, setReady] = useState(false);
  const [query, setQuery] = useState(""),
    [filter, setFilter] = useState<"all" | "teach" | "learn">("all");
  const [error, setError] = useState(""),
    [sharing, setSharing] = useState<Lesson | null>(null);
  const [recoveries, setRecoveries] = useState<Recovery[]>([]);
  useEffect(() => {
    const refresh = () => {
      try {
        migrateDraft(window.localStorage);
        const result = listWorks(window.localStorage);
        setWorks(result.works);
        setRecoveries(availableRecoveries(window.localStorage));
        setError(
          result.unreadable
            ? `${result.unreadable} 份本机数据暂时无法读取，原始数据仍然保留。其他作品可正常使用。`
            : "",
        );
      } catch {
        setRecoveries(readPendingRecoveries());
        setError(
          "浏览器暂不允许读取本机存储。可以从备份导入作品，或打开分享链接阅读。",
        );
      }
      setReady(true);
    };
    refresh();
    window.addEventListener("storage", refresh);
    window.addEventListener("focus", refresh);
    return () => {
      window.removeEventListener("storage", refresh);
      window.removeEventListener("focus", refresh);
    };
  }, []);
  function copy(work: Work) {
    try {
      const copied = saveWork(window.localStorage, duplicateWork(work));
      window.location.assign(`/create?work=${copied.id}`);
    } catch {
      setError("副本未能保存。请先下载作品备份，保留当前内容。");
    }
  }
  const shown = works.filter(
    (work) =>
      (filter === "all" || work.mode === filter) &&
      `${workTitle(work)} ${work.material.question}`
        .toLocaleLowerCase()
        .includes(query.trim().toLocaleLowerCase()),
  );
  return (
    <>
      <Header />
      <main className="library-shell">
        <div className="library-heading">
          <div>
            <span className="eyebrow">YOUR IDEAS, IN PROGRESS</span>
            <h1>每个问题，都值得继续。</h1>
            <p>写到一半的材料，讲清楚的作品，都在这里。</p>
          </div>
          <a className="button primary" href="/create">
            ＋ 新建作品
          </a>
        </div>
        <div className="library-storage-note">
          <span className="live-dot" />
          <span>
            保存在当前浏览器 · 换设备时，可在工坊下载并导入「素材与作品」备份。
          </span>
        </div>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
        {!ready ? (
          <p role="status" className="loading-state">
            正在打开你的作品集…
          </p>
        ) : works.length === 0 ? (
          <section className="library-empty">
            <span className="empty-mark" aria-hidden="true">
              ＋
            </span>
            <span className="eyebrow">A PLACE FOR YOUR NEXT QUESTION</span>
            <h2>先留住一个好问题。</h2>
            <p>
              不用一次做完。写下问题、放入材料，
              <br />
              玩乎会自动保存，下次从这里接着做。
            </p>
            <div className="controls">
              <a className="button primary" href="/create">
                开始我的第一份作品 →
              </a>
              <a className="text-button" href="/create?mode=learn">
                我想弄懂一篇材料 ↗
              </a>
            </div>
          </section>
        ) : (
          <>
            <div className="library-tools">
              <div
                role="group"
                aria-label="作品场景"
                className="library-filters"
              >
                {(
                  [
                    ["all", "全部作品"],
                    ["teach", "我的创作"],
                    ["learn", "我的学习"],
                  ] as const
                ).map(([value, label]) => (
                  <button
                    key={value}
                    aria-pressed={filter === value}
                    className={filter === value ? "active" : ""}
                    onClick={() => setFilter(value)}
                  >
                    {label}
                    <span>
                      {
                        works.filter(
                          (work) => value === "all" || work.mode === value,
                        ).length
                      }
                    </span>
                  </button>
                ))}
              </div>
              <label className="library-search">
                <span className="sr-only">搜索我的作品</span>
                <input
                  placeholder="搜索标题或问题…"
                  value={query}
                  maxLength={200}
                  onChange={(event) => setQuery(event.target.value)}
                />
              </label>
            </div>
            <p className="library-count" role="status">
              {shown.length} 份作品 · 最近编辑在前
            </p>
            {shown.length ? (
              <div className="work-list">
                {shown.map((work) => {
                  const parsed = LessonSchema.safeParse(work.lesson);
                  return (
                    <article className="work-card" key={work.id}>
                      <div className="work-card-top">
                        <span className="work-kind">
                          {work.mode === "teach" ? "创作" : "学习"}
                          {work.lesson
                            ? ` / ${experimentNames[work.lesson.experiment.type]}`
                            : " / 素材草稿"}
                        </span>
                        <span
                          className={`work-status ${parsed.success ? "is-ready" : ""}`}
                        >
                          {workStatus(work)}
                        </span>
                      </div>
                      <Link
                        className="work-card-title"
                        href={`/create?work=${work.id}`}
                      >
                        <h2>{workTitle(work)}</h2>
                        <span aria-hidden="true">↗</span>
                      </Link>
                      <p className="work-excerpt">
                        {work.lesson?.goal ||
                          work.material.material ||
                          "从写下一个问题开始，让想法慢慢成形。"}
                      </p>
                      <div className="work-metadata">
                        <span>
                          {work.material.material.length
                            ? `${work.material.material.length.toLocaleString()} 字材料`
                            : "尚无补充材料"}{" "}
                          ·{" "}
                          {work.lesson
                            ? `${work.lesson.sources.length} 个引用来源`
                            : `${work.material.sources.length + (work.material.sourceUrl.trim() ? 1 : 0)} 个素材来源`}
                        </span>
                        <time dateTime={work.updatedAt}>
                          {new Date(work.updatedAt).toLocaleString("zh-CN", {
                            month: "numeric",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </time>
                      </div>
                      <div className="work-card-actions">
                        <Link
                          className="button primary"
                          href={`/create?work=${work.id}`}
                        >
                          继续{work.lesson ? "编辑" : "整理"} →
                        </Link>
                        <button
                          className="text-button"
                          disabled={!parsed.success}
                          onClick={() => {
                            if (parsed.success) setSharing(parsed.data);
                          }}
                        >
                          阅读与分享
                        </button>
                        <details className="work-more">
                          <summary aria-label={`更多操作：${workTitle(work)}`}>
                            ···
                          </summary>
                          <div>
                            <button onClick={() => copy(work)}>
                              复制为新作品
                            </button>
                            <button onClick={() => exportWork(work)}>
                              下载完整备份
                            </button>
                          </div>
                        </details>
                      </div>
                    </article>
                  );
                })}
              </div>
            ) : (
              <div className="library-no-results">
                <h2>没有找到这份作品</h2>
                <p>试试标题中的其他词，或切换到全部作品。</p>
                <button
                  className="button"
                  onClick={() => {
                    setFilter("all");
                    setQuery("");
                  }}
                >
                  显示全部作品
                </button>
              </div>
            )}
          </>
        )}
        {recoveries.length > 0 && (
          <details
            className="library-recovery"
            open={recoveries.some((item) => item.temporary)}
          >
            <summary>{recoveries.length} 份可恢复的历史记录</summary>
            <p>来自其他标签页或保存中断前的修改。恢复会创建独立作品。</p>
            {recoveries.map((item) => (
              <div key={item.id}>
                <div>
                  <strong>{workTitle(item.work)}</strong>
                  <small>
                    {item.temporary && "尚未保存 · 关闭此页面前请下载备份 · "}
                    {new Date(item.work.updatedAt).toLocaleString("zh-CN")}
                  </small>
                </div>
                <Link className="button" href={`/create?recover=${item.id}`}>
                  恢复为新作品
                </Link>
                <button
                  className="text-button"
                  onClick={() => exportWork(item.work)}
                >
                  下载备份
                </button>
              </div>
            ))}
          </details>
        )}
      </main>
      <footer className="footer">
        <span>玩乎 · 让每次理解留下痕迹</span>
        <span>本机作品集</span>
      </footer>
      {sharing && (
        <SharePanel lesson={sharing} onClose={() => setSharing(null)} />
      )}
    </>
  );
}
