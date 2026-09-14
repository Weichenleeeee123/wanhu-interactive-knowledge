"use client";
import { useId, useState } from "react";
import {
  ArticleMaterialSchema,
  KnowledgeItemSchema,
  type ArticleMaterial,
  type KnowledgeItem,
} from "@/lib/zhihu-materials";
import type { Material } from "@/lib/works";
import { showcaseForUrl } from "@/lib/showcase";

export function ArticleImport({
  value,
  onChange,
  disabled,
  mode = "teach",
}: {
  value: Material;
  onChange: (value: Material) => void;
  disabled: boolean;
  mode?: "teach" | "learn";
}) {
  const id = useId();
  const [url, setUrl] = useState(""),
    [items, setItems] = useState<KnowledgeItem[] | null>(null);
  const [preview, setPreview] = useState<ArticleMaterial | null>(null),
    [selected, setSelected] = useState<number[]>([]);
  const [busy, setBusy] = useState(""),
    [error, setError] = useState(""),
    [notice, setNotice] = useState("");
  const paragraphs =
    preview?.text.split(/\n+/).filter((part) => part.trim()) ?? [];
  const selectedText = paragraphs
    .filter((_, index) => selected.includes(index))
    .join("\n\n");
  const selectedAlready =
    preview && value.sources.some((source) => source.id === preview.source.id);
  const atLimit =
    !selectedAlready &&
    value.sources.length + (value.sourceUrl.trim() ? 1 : 0) >= 3;
  const materialPrefix =
    value.material.trim() && selectedText
      ? `\n\n【来自：${preview!.source.title}】\n`
      : "";
  const totalLength =
    value.material.length + selectedText.length + materialPrefix.length;
  async function load(path: string, label: string) {
    setBusy(label);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/materials${path}`, {
        signal: AbortSignal.timeout(35000),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "知乎内容暂时无法读取");
      if (data.items) {
        const list = KnowledgeItemSchema.array().parse(data.items);
        setItems(list);
      } else {
        const material = ArticleMaterialSchema.parse(data.material);
        const known = showcaseForUrl(material.source.url);
        if (known && material.coverage === "link-only") {
          material.source.title = known.source.title;
          material.source.author = known.source.author;
        }
        setPreview(material);
        setItems(null);
        const sections = material.text
          .split(/\n+/)
          .filter((part) => part.trim());
        setSelected(
          material.text.length + value.material.length <= 19500
            ? sections.map((_, index) => index)
            : [],
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "读取失败，请稍后再试");
    } finally {
      setBusy("");
    }
  }
  function attach() {
    if (
      !preview ||
      atLimit ||
      totalLength > 20000 ||
      (preview.text && !selectedText)
    )
      return;
    const prefix = materialPrefix;
    const source = {
      ...preview.source,
      title: preview.source.title.trim() || "用户提供的知乎内容",
      excerpt: selectedText.slice(0, 1200) || preview.source.excerpt,
    };
    const nextSources = selectedAlready
      ? value.sources.map((item) => (item.id === source.id ? source : item))
      : [...value.sources, source];
    const sourceMaterials = (value.sourceMaterials ?? []).filter((item) =>
      nextSources.some((source) => source.id === item.sourceId),
    );
    const previous = sourceMaterials.find(
      (item) => item.sourceId === source.id,
    )?.text;
    const combined =
      previous && selectedText
        ? previous.includes(selectedText)
          ? previous
          : previous + "\n\n" + selectedText
        : selectedText || previous || "";
    const nextSourceMaterials = combined
      ? [
          ...sourceMaterials.filter((item) => item.sourceId !== source.id),
          { sourceId: source.id, text: combined },
        ]
      : sourceMaterials;
    if (
      nextSourceMaterials.reduce((sum, item) => sum + item.text.length, 0) >
      20000
    ) {
      setError(
        "已保存的来源正文超过 20,000 字符，请减少选取的段落或取消旧来源。",
      );
      return;
    }
    onChange({
      ...value,
      question:
        value.question ||
        (preview.coverage === "link-only"
          ? ""
          : `${mode === "teach" ? "我想讲清楚" : "我想弄懂"}《${source.title}》中的核心观点与使用条件。`.slice(
              0,
              200,
            )),
      material: value.material + prefix + selectedText,
      sources: nextSources,
      sourceMaterials: nextSourceMaterials,
    });
    setNotice(
      preview.coverage === "link-only"
        ? "来源链接已保留。请在下方粘贴原文段落，并补充具体问题。"
        : `已带入 ${selectedText.length.toLocaleString()} 字材料及来源。已有材料已保留。`,
    );
    setPreview(null);
  }
  return (
    <section className="article-import" aria-label="导入知乎内容">
      <div className="section-line">
        <h3>从一篇知乎内容开始</h3>
        <span className="zhihu-badge">知</span>
      </div>
      <p className="field-note">
        粘贴文章或回答链接，或选择官方提供的知识内容。
      </p>
      <div className="article-link-form">
        <label className="sr-only" htmlFor={`${id}-url`}>
          要导入的知乎链接
        </label>
        <input
          id={`${id}-url`}
          type="url"
          placeholder="https://zhuanlan.zhihu.com/p/…"
          value={url}
          maxLength={2048}
          disabled={disabled || !!busy}
          onChange={(e) => setUrl(e.target.value)}
        />
        <button
          className="button"
          disabled={disabled || !!busy || !url.trim()}
          onClick={() =>
            void load(
              `?url=${encodeURIComponent(url.trim())}`,
              "正在匹配知乎内容…",
            )
          }
        >
          读取链接
        </button>
      </div>
      <p className="field-note">
        普通链接仅导入接口可提供的摘要；需要全文时，可补充你能阅读的段落。
      </p>
      {showcaseForUrl(url) && <p className="field-note">本文已有玩乎制作的预制演示。<a href={`/view?example=showcase-${showcaseForUrl(url)!.id}`} target="_blank" rel="noreferrer">直接体验演示 ↗</a>，也可以继续导入材料，围绕自己的问题生成。</p>}
      <button
        className="text-button"
        disabled={disabled || !!busy}
        onClick={() =>
          items ? setItems(null) : void load("", "正在读取官方知识库…")
        }
      >
        {items ? "收起官方知识内容 ↑" : "浏览知乎官方知识内容 →"}
      </button>
      {busy && (
        <p role="status" className="field-note">
          {busy}
        </p>
      )}
      {items && (
        <div className="knowledge-catalog">
          <p className="small muted">
            {items.length} 份官方知识内容 · 可带入正文材料
          </p>
          {items.map((item) => (
            <button
              className="knowledge-item"
              key={item.id}
              disabled={disabled || !!busy}
              onClick={() =>
                void load(`?knowledge=${item.id}`, "正在读取正文与作者…")
              }
            >
              <strong>{item.title}</strong>
              <span>{item.description}</span>
              <small>阅读并选取材料 ↗</small>
            </button>
          ))}
          {items.length === 0 && (
            <p className="field-note">当前没有可用内容，仍可粘贴知乎材料。</p>
          )}
        </div>
      )}
      {preview && (
        <div className="article-import-preview">
          <div className="section-line">
            <span className="source-coverage">
              {preview.coverage === "official-body"
                ? "知乎官方正文材料"
                : preview.coverage === "search-excerpt"
                  ? "知乎搜索摘要"
                  : "已识别来源链接"}
            </span>
            <button className="text-button" onClick={() => setPreview(null)}>
              收起
            </button>
          </div>
          <h4>{preview.source.title}</h4>
          <p className="field-note">
            {preview.source.author || "作者信息未提供"}
            {preview.text
              ? ` · ${preview.text.length.toLocaleString()} 字`
              : ""}
          </p>
          <p className="field-note">{preview.note}</p>
          {paragraphs.length > 0 && (
            <>
              <div className="section-line">
                <span className="small">
                  选择带入的段落 · {selectedText.length.toLocaleString()} 字
                </span>
                <button
                  className="text-button"
                  onClick={() =>
                    setSelected(
                      selected.length === paragraphs.length
                        ? []
                        : paragraphs.map((_, i) => i),
                    )
                  }
                >
                  {selected.length === paragraphs.length
                    ? "取消全选"
                    : "选择全部"}
                </button>
              </div>
              <div className="article-paragraphs">
                {paragraphs.map((paragraph, index) => (
                  <label key={index}>
                    <input
                      type="checkbox"
                      checked={selected.includes(index)}
                      onChange={(e) =>
                        setSelected(
                          e.target.checked
                            ? [...selected, index]
                            : selected.filter((i) => i !== index),
                        )
                      }
                    />
                    <span>{paragraph}</span>
                  </label>
                ))}
              </div>
            </>
          )}
          {preview.coverage === "link-only" && (
            <div className="two-fields">
              <div className="form-field">
                <label htmlFor={`${id}-title`}>补充这篇内容的标题</label>
                <input
                  id={`${id}-title`}
                  value={preview.source.title}
                  maxLength={200}
                  onChange={(event) =>
                    setPreview({
                      ...preview,
                      source: { ...preview.source, title: event.target.value },
                    })
                  }
                />
              </div>
              <div className="form-field">
                <label htmlFor={`${id}-author`}>补充原作者（可选）</label>
                <input
                  id={`${id}-author`}
                  value={preview.source.author}
                  maxLength={80}
                  onChange={(event) =>
                    setPreview({
                      ...preview,
                      source: { ...preview.source, author: event.target.value },
                    })
                  }
                />
              </div>
            </div>
          )}
          {atLimit && (
            <p className="error-message">
              已达到 3 个素材来源，请先在下方取消一个来源。
            </p>
          )}
          {totalLength > 20000 && (
            <p className="error-message">
              合计超过 20,000 字符，请减少选中的段落。
            </p>
          )}
          <button
            className="button primary"
            disabled={
              disabled ||
              !!busy ||
              atLimit ||
              totalLength > 20000 ||
              !!(preview.text && !selectedText)
            }
            onClick={attach}
          >
            {preview.coverage === "link-only"
              ? "保留这个来源链接"
              : "带入所选材料与来源"}
          </button>
        </div>
      )}
      {notice && (
        <p className="import-success" role="status">
          {notice}
        </p>
      )}
      {error && (
        <p className="error-message" role="alert">
          {error}
        </p>
      )}
    </section>
  );
}
