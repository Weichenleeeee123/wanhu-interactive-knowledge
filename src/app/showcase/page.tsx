import Link from "next/link";
import { Header } from "@/components/Brand";
import { showcase } from "@/lib/showcase";

export const metadata = { title: "10 篇真实知乎内容 · 玩乎评审体验" };
export default function ShowcasePage() {
  return (
    <>
      <Header />
      <main className="showcase-page">
        <span className="eyebrow">HANDCRAFTED KNOWLEDGE LABS</span>
        <h1>
          到真实文章里，
          <br />
          看知识动起来。
        </h1>
        <p className="showcase-intro">
          10 篇知乎文章与回答，10
          个逐篇编写的互动实验室。安装新版插件后打开原文，演示会自动出现在正文中；也可以直接打开网页体验。
        </p>
        <div className="showcase-instructions">
          <Link className="button primary" href="/extension">
            先安装插件 →
          </Link>
          <p>
            演示由玩乎预制，不是原作者附带的内容，也不计作现场 AI
            生成。打开其他文章，仍可选段实时生成。
          </p>
        </div>
        <div className="showcase-grid">
          {showcase.map((item, i) => (
            <article key={item.id}>
              <Link
                className="showcase-preview"
                href={`/view?example=showcase-${item.id}`}
              >
                <img
                  src={`/submission-assets/current/curated-${item.id}.png`}
                  alt={`${item.takeaway}实际演示界面`}
                  loading="lazy"
                />
              </Link>
              <span className="showcase-number">
                {String(i + 1).padStart(2, "0")} · 手作 · 专用交互
              </span>
              <h2>{item.takeaway}</h2>
              <p>{item.steps}</p>
              <details>
                <summary>对应原文与出处</summary>
                <p>{item.source.title}</p>
                <p>
                  {item.source.author || "作者信息未核实，请以知乎原文为准"}
                </p>
                <blockquote>{item.source.excerpt}</blockquote>
              </details>
              <div className="visual-buttons">
                <a
                  className="button primary"
                  href={item.source.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  在知乎体验 ↗
                </a>
                <Link
                  className="button"
                  href={`/view?example=showcase-${item.id}`}
                >
                  网页直接体验 →
                </Link>
              </div>
            </article>
          ))}
        </div>
        <p className="field-note">
          来源于公开可检索内容（2026-09-14
          核对），演示只摘取短句并围绕单个机制原创讲解；不代表全文观点。知乎可能要求登录、安全验证或展开全文，插件不会绕过访问限制。正文未加载时请使用网页体验。
        </p>
      </main>
    </>
  );
}
