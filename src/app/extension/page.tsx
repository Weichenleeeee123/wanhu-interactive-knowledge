import Link from "next/link";
import { Header } from "@/components/Brand";

export default function ExtensionPage() {
  return <>
    <Header />
    <main className="extension-page">
      <section className="extension-hero">
        <div>
          <span className="eyebrow">WANHU · FOR ZHIHU</span>
          <h1>把玩乎带进知乎。</h1>
          <p>作者在编辑器里选段生成互动演示，读者打开文章就能在原文旁边直接试。安装一次，侧边栏、正文卡片和工坊会连成一条体验。</p>
          <div className="extension-actions">
            <a className="button primary large" href="/downloads/wanhu-extension.zip?v=0.4.2" download>下载玩乎插件 ↓</a>
            <Link className="text-link" href="/create">先在网页工坊体验 →</Link>
          </div>
          <p className="extension-meta">支持 Chrome / Edge · 当前为开发者模式安装包 · 版本 0.4.2</p>
        </div>
        <div className="extension-preview" aria-label="插件使用预览">
          <div className="extension-preview-bar"><span className="live-dot" /> 知乎文章 · 玩乎已准备好</div>
          <div className="extension-preview-body"><div className="preview-lines"><i /><i /><i /><i /><i /><b /></div><div className="preview-card"><strong>作者附带的互动演示</strong><span>在原文旁边，把知识试明白</span><em>打开侧边栏继续 →</em></div></div>
        </div>
      </section>
      <section className="extension-steps">
        <div><span>01</span><h2>下载并解压</h2><p>下载 zip 后解压到一个不会被移动的文件夹。</p></div>
        <div><span>02</span><h2>加载扩展</h2><p>打开 <code>chrome://extensions</code> 或 Edge 的扩展管理页，开启“开发者模式”，选择“加载已解压的扩展程序”。</p></div>
        <div><span>03</span><h2>打开知乎</h2><p>刷新知乎文章或写作页面，右下角会出现玩乎入口。选中一段文字即可开始。</p></div>
      </section>
      <section className="extension-note"><strong>已经安装过？这样更新</strong><p>把新包解压并覆盖到原来的插件目录，在扩展管理页点击玩乎的“重新加载”，最后刷新知乎页面。仅刷新网页不会更新插件代码。</p><p>本次更新：兼容知乎外链自动识别、统一“本页演示”列表，并修复 SVG 动画播放。</p><Link href="/showcase" className="text-link">更新后，打开十篇真实文章验收 →</Link></section>
      <section className="extension-note"><strong>作者发布方式</strong><p>在侧边栏生成并检查演示，复制分享链接，作为普通链接粘贴回知乎文章。安装玩乎的读者会自动展开正文卡片；没有插件的读者仍可点击链接打开完整网页。</p></section>
    </main>
    <footer className="footer"><span>玩乎 · 可交互知识工坊</span><span><Link href="/">返回首页</Link> · <Link href="/create">进入工坊</Link></span></footer>
  </>;
}
