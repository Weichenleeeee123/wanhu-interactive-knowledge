import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  metadataBase: new URL("https://wanhu.asia"),
  title: "玩乎 · 让知识动起来",
  description: "从知乎的好问题出发，把文字讲解变成可以动手探索的知识作品。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}<div className="kanshan-assistant" aria-label="刘看山助手"><img src="/mascot/liu-kanshan-idle.gif" alt="刘看山" loading="lazy" decoding="async" fetchPriority="low"/><span>刘看山在旁边，随时帮你把知识变好玩。</span></div></body>
    </html>
  );
}
