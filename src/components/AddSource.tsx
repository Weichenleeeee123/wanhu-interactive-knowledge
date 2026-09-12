"use client";
import { useId, useState } from "react";
import { SourceSchema, type Source } from "@/lib/lesson";

export function AddSource({
  count,
  onAdd,
}: {
  count: number;
  onAdd: (source: Source) => void;
}) {
  const id = useId();
  const [title, setTitle] = useState(""),
    [author, setAuthor] = useState(""),
    [url, setUrl] = useState(""),
    [excerpt, setExcerpt] = useState(""),
    [error, setError] = useState("");
  return (
    <details className="attribution-fields add-source">
      <summary>＋ 添加引用来源</summary>
      <p className="field-note">
        补充出处后直接关联到讲解，无需重新生成。最多 5 条。
      </p>
      <div className="form-field">
        <label htmlFor={`${id}-title`}>引用来源标题</label>
        <input
          id={`${id}-title`}
          maxLength={200}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-url`}>引用来源链接</label>
        <input
          id={`${id}-url`}
          maxLength={2048}
          type="url"
          placeholder="https://www.zhihu.com/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-author`}>引用来源作者（可选）</label>
        <input
          id={`${id}-author`}
          maxLength={80}
          value={author}
          onChange={(e) => setAuthor(e.target.value)}
        />
      </div>
      <div className="form-field">
        <label htmlFor={`${id}-excerpt`}>相关摘要（可选）</label>
        <textarea
          id={`${id}-excerpt`}
          rows={3}
          maxLength={1200}
          value={excerpt}
          onChange={(e) => setExcerpt(e.target.value)}
        />
      </div>
      <button
        className="button"
        disabled={count >= 5}
        onClick={() => {
          const result = SourceSchema.safeParse({
            id: crypto.randomUUID(),
            title,
            author,
            url,
            excerpt,
          });
          if (!result.success) {
            setError("请填写来源标题和有效的 HTTP 或 HTTPS 链接。");
            return;
          }
          onAdd(result.data);
          setTitle("");
          setAuthor("");
          setUrl("");
          setExcerpt("");
          setError("");
        }}
      >
        添加并关联到讲解
      </button>
      {count >= 5 && (
        <p className="field-note">已有 5 条来源，可先移出不再使用的来源。</p>
      )}
      {error && (
        <p role="alert" className="error-message">
          {error}
        </p>
      )}
    </details>
  );
}
