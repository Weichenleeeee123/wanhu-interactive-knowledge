import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = {
  title: "知玩 · 让知识动起来",
  description: "从知乎的好问题出发，把文字讲解变成可以动手探索的知识作品。",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body>{children}</body>
    </html>
  );
}
