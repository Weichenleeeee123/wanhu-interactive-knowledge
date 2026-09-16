"use client";
import { ThinkingAssist } from "./ThinkingAssist";
import { readApiResponse } from "@/lib/api-response";
import { useEffect, useId, useRef, useState } from "react";
import {
  LessonSchema,
  SourceSchema,
  type Lesson,
  type Source,
} from "@/lib/lesson";
import type { Material } from "@/lib/works";
import { ArticleImport } from "./ArticleImport";
import { selectSourcesForMaterial } from "@/lib/source-materials";
type Capabilities = { search: boolean; generation: boolean; provider: string };
const starters = {
  "gradient-descent": {
    label: "学习率为什么不能太大？",
    query: "梯度下降 学习率",
    material:
      "我想用标准模型 f(x)=x² 解释梯度下降。每一步按 x_next = x − 学习率 × 2x 更新，初始 x=8。请引导读者比较学习率 0.2、0.5、1 和 1.2 的变化，区分收敛、震荡与发散。",
  },
  "monty-hall": {
    label: "剩两扇门真的五五开？",
    query: "三门问题 换门",
    material:
      "三扇门后等概率放置一个奖品。我先选一扇，主持人知道奖品位置，始终打开未选中的空门并提供换门机会。我想弄懂：为什么换门的胜率是 2/3，而不是 1/2？请使用标准三门规则。",
  },
};
export function MaterialInput({
  mode,
  capabilities,
  onGenerationStart,
  onGenerated,
  onExample,
  value,
  onChange,
}: {
  mode: "teach" | "learn";
  capabilities: Capabilities | null;
  onGenerationStart: () => number;
  onGenerated: (lesson: Lesson, reason: string, revision: number) => void;
  onExample: (type: "gradient-descent" | "monty-hall") => void;
  value: Material;
  onChange: (value: Material) => void;
}) {
  const id = useId();
  const {
    question,
    query,
    material,
    sources,
    sourceUrl,
    sourceTitle,
    sourceAuthor,
    consent,
  } = value;
  function setField<K extends keyof Material>(key: K, next: Material[K]) {
    onChange({ ...value, [key]: next });
  }
  const [results, setResults] = useState<Source[]>([]);
  const [searching, setSearching] = useState(false),
    [searched, setSearched] = useState(false),
    [searchError, setSearchError] = useState("");
  const [generating, setGenerating] = useState(false),
    [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const operation = useRef<AbortController|null>(null);
  const [stopped, setStopped] = useState(false);
  useEffect(()=>()=>operation.current?.abort(),[]);
  const [starterNotice, setStarterNotice] = useState("");
  function useStarter(type: keyof typeof starters) {
    const starter = starters[type];
    onChange({
      ...value,
      question: starter.label,
      query: starter.query,
      material: material.trim() ? material : starter.material,
    });
    setStarterNotice(
      material.trim() || sources.length
        ? "已切换问题；保留了已有材料和来源，请核对是否与新问题相关。"
        : "已填入原创起步材料，你可以修改或补充知乎来源。",
    );
    setError("");
  }
  useEffect(() => {
    const topic = new URLSearchParams(window.location.search).get("topic");
    if (topic === "gradient-descent" || topic === "monty-hall")
      useStarter(topic);
  }, []);
  useEffect(() => {
    if (!generating) return;
    const started = Date.now();
    setElapsed(0);
    const timer = setInterval(
      () => setElapsed(Math.floor((Date.now() - started) / 1000)),
      1000,
    );
    return () => clearInterval(timer);
  }, [generating]);
  async function search() {
    if (!query.trim()) return;
    setSearching(true);
    setSearchError("");
    setSearched(false);
    try {
      const response = await fetch(
        `/api/search?q=${encodeURIComponent(query.trim())}`,
        { signal: AbortSignal.timeout(35000) },
      );
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "知乎搜索暂不可用");
      const parsed = SourceSchema.array().safeParse(data.items);
      if (!parsed.success) throw new Error("搜索返回的内容格式无效");
      setResults(parsed.data);
      setSearched(true);
    } catch (e) {
      setSearchError(e instanceof Error ? e.message : "搜索失败，请稍后重试");
    } finally {
      setSearching(false);
    }
  }
  function select(source: Source) {
    setField(
      "sources",
      sources.some((s) => s.id === source.id)
        ? sources.filter((s) => s.id !== source.id)
        : sources.length + (sourceUrl.trim() ? 1 : 0) < 3
          ? [...sources, source]
          : sources,
    );
  }
  async function generate() {
    if(operation.current)return;
    setError("");
    setStopped(false);
    if (material.length > 20000) {
      setError("材料超过 20,000 字符，请选取关键段落后再生成。");
      return;
    }
    if (!question.trim()) {
      setError("先写下你想讲清楚或弄懂的问题。");
      return;
    }
    if (!consent) {
      setError("请先确认生成后核对讲解、原句与材料的关系。");
      return;
    }
    let selected = [...sources];
    if (sourceUrl.trim()) {
      const own = SourceSchema.safeParse({
        id: "user-material",
        title: sourceTitle.trim() || "用户提供的材料",
        author: sourceAuthor,
        url: sourceUrl.trim(),
        excerpt: material.slice(0, 1200),
      });
      if (!own.success) {
        setError("请检查材料来源链接，只支持有效的 HTTP 或 HTTPS 链接。");
        return;
      }
      selected = [...selected, own.data];
    }
    if (selected.length > 3) {
      setError("最多选择 3 个来源，包含你手动填写的来源。");
      return;
    }
    if (!material.trim() && !selected.length) {
      setError("请先选择知乎摘要或粘贴讲解材料。");
      return;
    }
    const generationRevision = onGenerationStart();
    const controller=new AbortController();operation.current=controller;
    const timeout=setTimeout(()=>controller.abort(),50000);
    setGenerating(true);
    try {
      const response = await fetch("/api/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          question,
          material,
          ...selectSourcesForMaterial(
            material,
            selected,
            value.sourceMaterials,
          ),
          standardModel: consent,
        }),
        signal: controller.signal,
      });
      const data = await readApiResponse(response);
      if(operation.current!==controller||controller.signal.aborted)return;
      if (!response.ok) throw new Error(data.error || "生成失败，请稍后重试");
      if (data.unsupported) {
        setError(data.reason || "材料还不足以支持互动讲解，请补充具体段落。");
        return;
      }
      const lesson = LessonSchema.safeParse(data.lesson);
      if (!lesson.success) throw new Error("生成的作品格式无效，请重试");
      onGenerated(
        lesson.data,
        data.reason || "草稿已生成，请核对讲解与引用。",
        generationRevision,
      );
    } catch (e) {
      if(operation.current===controller)setError(controller.signal.aborted?"这次等待超时，材料已保留，可以重试。":e instanceof Error ? e.message : "生成失败，材料已保留");
    } finally {
      clearTimeout(timeout);
      if(operation.current===controller){operation.current=null;setGenerating(false);}
    }
  }
  return (
    <div className="material-input">
      <div className="editor-heading">
        <span className="eyebrow">START WITH A QUESTION</span>
        <h2>
          {mode === "teach" ? "你想把什么讲清楚？" : "你卡在哪个知识点？"}
        </h2>
        <p>
          {mode === "teach"
            ? "导入一篇知乎内容，把关键观点变成可互动的讲解。"
            : "把不理解的地方告诉我们，带着问题动手试一试。"}
        </p>
      </div>
      <div className="material-step-label"><b>01</b><span>准备一段材料<small>导入链接，或直接粘贴文字</small></span></div>
      <ArticleImport value={value} onChange={onChange} disabled={generating} mode={mode} />
        <div className="form-field">
          <label htmlFor={`${id}-material`}>
            补充你的讲解材料<span>{material.length}/20000</span>
          </label>
          <textarea
            id={`${id}-material`}
            rows={6}
            value={material}
            disabled={generating}
            maxLength={200000}
            onChange={(e) => setField("material", e.target.value)}
            placeholder="粘贴你想解释或理解的关键段落。若摘要缺少公式与条件，请在这里补充。"
          />
          {material.length > 20000 && (
            <p className="error-message" role="alert">
              材料超过 20,000 字符，请选取关键段落后再生成。
            </p>
          )}
          <p className="field-note">
            已导入的内容会出现在这里。优先保留与目标问题有关的段落，可以补充上下文。
          </p>
        </div>
          {sources.length > 0 && (
            <div className="selected-sources">
              {sources.map((s) => (
                <button
                  key={s.id}
                  className="source-chip"
                  disabled={generating}
                  onClick={() => select(s)}
                  title="取消选择"
                >
                  {s.title}
                  <span aria-hidden="true">×</span>
                </button>
              ))}
            </div>
          )}
      <div className="material-step-label"><b>02</b><span>{mode==='teach'?'选一个想讲清楚的点':'说说你卡在哪里'}<small>一句话就够，不需要写提示词</small></span></div>
      <fieldset className="generation-fields" disabled={generating}>
        <details className="topic-starters" hidden={!!material.trim()}>
          <summary>或从一个标准模型问题开始</summary>
          <div>
            {(Object.keys(starters) as (keyof typeof starters)[]).map(
              (type) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => useStarter(type)}
                >
                  {starters[type].label}
                </button>
              ),
            )}
          </div>
          <small>
            填入原创教学提示；已有材料会保留。你也可以继续检索知乎来源。
          </small>
          {starterNotice && (
            <p className="small" role="status">
              {starterNotice}
            </p>
          )}
        </details>
        <div className="form-field">
          <label htmlFor={`${id}-question`}>
            {mode === "teach" ? "想讲清楚的问题" : "我不理解的地方"}
            <span>{question.length}/200</span>
          </label>
          <textarea
            id={`${id}-question`}
            rows={3}
            maxLength={200}
            placeholder={
              mode === "teach"
                ? "例如：怎样用文章里的方法，把大目标变成今天能开始的一步？"
                : "例如：我总是被琐事打断，文章里的建议应该怎么用？"
            }
            value={question}
            onChange={(e) => setField("question", e.target.value)}
          />
        </div>
        <ThinkingAssist mode={mode} material={material || sources.map(source=>source.excerpt).join('\n\n')} disabled={generating} onUseQuestion={question=>setField('question',question)} />
        <details className="advanced-material">
          <summary>检索知乎与补充出处 <span>可选</span></summary>
        <div className="search-block">
          <div className="section-line">
            <h3>从知乎找一点线索</h3>
            <span className="zhihu-badge">知</span>
          </div>
          <form
            className="search-form"
            onSubmit={(e) => {
              e.preventDefault();
              void search();
            }}
          >
            <label className="sr-only" htmlFor={`${id}-query`}>
              知乎搜索关键词
            </label>
            <input
              id={`${id}-query`}
              value={query}
              maxLength={200}
              placeholder="试试「梯度下降 学习率」"
              onChange={(e) => setField("query", e.target.value)}
            />
            <button
              className="button"
              disabled={
                searching || !query.trim() || capabilities?.search === false
              }
            >
              {searching ? "搜索中…" : "搜索"}
            </button>
          </form>
          {capabilities?.search === false && (
            <p className="notice">
              知乎检索暂未配置。你可以粘贴材料，或先编辑预置示例。
            </p>
          )}
          {searchError && (
            <p className="error-message" role="alert">
              {searchError}
            </p>
          )}
          {searched && !results.length && (
            <p className="notice">没有找到相关内容，试试更短的关键词。</p>
          )}
          {results.length > 0 && (
            <div className="search-results">
              <p className="small muted">
                返回的是摘要。已选 {sources.length} 条
                {sourceUrl.trim() ? "，另有 1 个手动来源" : ""}，合计最多 3
                个来源。
              </p>
              {results.map((source) => (
                <article
                  className={`search-result ${sources.some((s) => s.id === source.id) ? "is-selected" : ""}`}
                  key={source.id}
                >
                  <div className="result-title">
                    <label>
                      <input
                        type="checkbox"
                        checked={sources.some((s) => s.id === source.id)}
                        disabled={
                          !sources.some((s) => s.id === source.id) &&
                          sources.length + (sourceUrl.trim() ? 1 : 0) >= 3
                        }
                        onChange={() => select(source)}
                      />
                      <strong>{source.title}</strong>
                    </label>
                    <a
                      href={source.url}
                      target="_blank"
                      rel="noreferrer"
                      aria-label={`阅读原文：${source.title}`}
                    >
                      ↗
                    </a>
                  </div>
                  <span className="small muted">
                    {source.author || "作者信息未提供"} · 摘要
                  </span>
                  <p>{source.excerpt}</p>
                </article>
              ))}
            </div>
          )}
        </div>
        <details className="attribution-fields">
          <summary>为粘贴材料添加来源（可选）</summary>
          <div className="form-field">
            <label htmlFor={`${id}-url`}>原文链接</label>
            <input
              id={`${id}-url`}
              type="url"
              value={sourceUrl}
              onChange={(e) => setField("sourceUrl", e.target.value)}
              maxLength={2048}
              placeholder="https://…"
            />
          </div>
          <div className="form-field">
            <label htmlFor={`${id}-title`}>原文标题</label>
            <input
              id={`${id}-title`}
              value={sourceTitle}
              maxLength={200}
              onChange={(e) => setField("sourceTitle", e.target.value)}
            />
          </div>
          <div className="form-field">
            <label htmlFor={`${id}-author`}>原作者</label>
            <input
              id={`${id}-author`}
              value={sourceAuthor}
              maxLength={80}
              onChange={(e) => setField("sourceAuthor", e.target.value)}
            />
          </div>
        </details>
        </details>
        {sources.length + (sourceUrl.trim() ? 1 : 0) > 3 && (
          <p className="error-message" role="alert">
            来源超过 3 个，请取消一条搜索结果或清空手动来源链接。
          </p>
        )}
        <label className="checkbox-label model-consent">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setField("consent", e.target.checked)}
          />
          <span>
            根据材料生成互动阅读或标准模型实验。生成后由我核对讲解、原句与材料的关系。
          </span>
        </label>
        {capabilities?.generation === false && (
          <p className="notice">
            AI 生成尚未配置。下方示例可以直接编辑，修改后同样能分享。
          </p>
        )}
        <button
          className="button primary full-width"
          onClick={() => void generate()}
          disabled={
            generating ||
            material.length > 20000 ||
            sources.length + (sourceUrl.trim() ? 1 : 0) > 3 ||
            capabilities?.generation === false
          }
        >
          {generating
            ? "正在构思互动讲解…"
            : mode === "teach"
              ? "生成我的互动草稿 ↗"
              : "生成我的互动阅读 ↗"}
        </button>
        <p className="field-note">
          点击生成会将所选材料发送给配置的模型服务，结果仍需核对。
        </p>
        {error && (
          <p className="error-message" role="alert">
            {error}
          </p>
        )}
      </fieldset>
      {generating && <div className="generation-progress" role="status">
        <span className="generation-spinner" aria-hidden="true"/><div><strong>正在把这段材料做成演示 · {elapsed} 秒</strong><p>{elapsed>=25?'还在等待模型返回，材料已保留。':'可以继续阅读原文，完成后会带你看结果。'}</p><button type="button" className="text-button" onClick={()=>{operation.current?.abort();operation.current=null;setGenerating(false);setStopped(true);}}>停止等待，保留材料</button></div>
      </div>}
      {stopped&&<p className="notice" role="status">已停止等待，材料和问题都还在，可修改后重新生成。</p>}
      <div className="template-start">
        <span className="eyebrow">OR START WITH AN EXAMPLE</span>
        <p>先改一份示例，看看作品怎么长出来。</p>
        <div className="controls">
          <button
            className="button"
            onClick={() => onExample("gradient-descent")}
          >
            梯度下降 →
          </button>
          <button className="button" onClick={() => onExample("monty-hall")}>
            三门问题 →
          </button>
        </div>
        <small>预置教学内容，不计作 AI 生成。</small>
      </div>
    </div>
  );
}
