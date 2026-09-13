import Link from "next/link";
import { Header } from "@/components/Brand";
import { GradientExperiment } from "@/components/GradientExperiment";
export default function Home() {
  return (
    <>
      <Header />
      <main className="home">
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-eyebrow">
              <span className="live-dot" /> 从知乎的好问题出发
            </div>
            <h1>
              让知识，
              <br />
              <span>动起来。</span>
              <svg
                className="hero-swoop"
                viewBox="0 0 250 24"
                aria-hidden="true"
              >
                <path
                  d="M3 15Q130-8 244 15M35 23Q160 6 232 19"
                  fill="none"
                  stroke="var(--orange)"
                  strokeWidth="3"
                />
              </svg>
            </h1>
            <p className="hero-description">
              有些道理，亲手试一次就懂了。
              <br />
              从知乎文章出发，把文字变成可以参与的互动讲解。
            </p>
            <div className="hero-actions">
              <Link className="button primary large" href="/create?mode=teach">
                开始创作 <span aria-hidden="true">↗</span>
              </Link>
              <Link className="text-link" href="/create?mode=learn">
                我想弄懂一个问题 →
              </Link>
            </div>
            <Link className="extension-entry" href="/extension">安装玩乎插件，在知乎文章里直接使用 →</Link>
            <Link className="hero-demo-link" href="/view?example=monty-hall"><span>60 秒亲手体验</span>剩下两扇门，真的各占一半吗？ <b>→</b></Link>
            <p className="hero-footnote">
              <span>01 / 理解</span>
              <span>02 / 探索</span>
              <span>03 / 分享</span>
            </p>
          </div>
          <div className="hero-lab">
            <div className="lab-heading">
              <span className="tiny-label">此刻就能试</span>
              <span>学习率，真的越大越好吗？</span>
              <span aria-hidden="true">↘</span>
            </div>
            <GradientExperiment compact />
            <div className="handwritten">拖动学习率，看看小球怎么走。</div>
          </div>
        </section>
        <section className="process-strip" aria-label="创作流程">
          <div>
            <span className="process-number">01</span>
            <p>
              <strong>带着一个好问题</strong>
              <span>导入知乎知识内容、链接摘要或原文段落</span>
            </p>
          </div>
          <div>
            <span className="process-number">02</span>
            <p>
              <strong>给知识一个可玩的形状</strong>
              <span>提炼关键观点，编辑情境题、反馈与原句</span>
            </p>
          </div>
          <div>
            <span className="process-number">03</span>
            <p>
              <strong>分享一次真正的理解</strong>
              <span>读者参与互动，带着理解回到原文</span>
            </p>
          </div>
        </section>
        <section className="experiments-section" id="experiments">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE EXPLORABLE COLLECTION</span>
              <h2>从这两个问题，开始探索。</h2>
            </div>
            <p>
              也可以先体验两类标准模型实验。
              <br />
              每一份示例，都能成为你的创作起点。
            </p>
          </div>
          <div className="example-grid">
            <article className="example-card">
              <div className="example-art gradient-art" aria-hidden="true">
                <svg viewBox="0 0 260 140">
                  <path
                    d="M35 28Q130 216 225 28"
                    fill="none"
                    stroke="var(--teal)"
                    strokeWidth="3"
                  />
                  <path
                    d="M199 74L89 103L151 119L117 122"
                    stroke="var(--orange)"
                    fill="none"
                    strokeDasharray="5 3"
                  />
                  <circle cx="199" cy="74" r="7" fill="var(--orange)" />
                  <text x="20" y="130">
                    f(x) = x²
                  </text>
                </svg>
              </div>
              <div className="example-content">
                <span className="eyebrow">01 / 机器学习 · 参数探索</span>
                <h3>步子越大，下山越快吗？</h3>
                <p>调节学习率，亲眼观察收敛、震荡与发散。</p>
                <div>
                  <Link
                    className="text-link"
                    href="/view?example=gradient-descent"
                  >
                    动手体验 ↗
                  </Link>
                  <Link
                    className="subtle-link"
                    href="/create?example=gradient-descent"
                  >
                    用它创作 →
                  </Link>
                </div>
              </div>
            </article>
            <article className="example-card">
              <div className="example-art monty-art" aria-hidden="true">
                <span>
                  01<i>?</i>
                </span>
                <span>
                  02<i>★</i>
                </span>
                <span>
                  03<i>?</i>
                </span>
              </div>
              <div className="example-content">
                <span className="eyebrow">02 / 概率直觉 · 随机模拟</span>
                <h3>剩下两扇门，机会各一半？</h3>
                <p>选一次，再模拟一千次。看看直觉站在哪一边。</p>
                <div>
                  <Link className="text-link" href="/view?example=monty-hall">
                    动手体验 ↗
                  </Link>
                  <Link
                    className="subtle-link"
                    href="/create?example=monty-hall"
                  >
                    用它创作 →
                  </Link>
                </div>
              </div>
            </article>
          </div>
        </section>
        <section className="closing-note">
          <span className="asterisk" aria-hidden="true">
            ✳
          </span>
          <p>
            好的讲解，让人点头。
            <br />
            <strong>参与其中，让理解更进一步。</strong>
          </p>
          <Link className="text-link" href="/create">
            去工坊，做一个 →
          </Link>
        </section>
      </main>
      <footer className="footer">
        <span>玩乎 · 可交互知识工坊</span>
        <span>知乎黑客松 / 学习工具与知识生产</span>
      </footer>
    </>
  );
}
