import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="玩乎首页">
      <span className="brand-mark" aria-hidden="true">
        <img src="/icon.svg" alt="" width={43} height={43} />
      </span>
      <span>
        玩乎<small>KNOWLEDGE IN MOTION</small>
      </span>
    </Link>
  );
}
export function Header({ workshop = false }: { workshop?: boolean }) {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="主导航">
        <Link href="/#examples">示例作品</Link>
        <Link href="/extension">安装插件</Link>
        <Link href="/library">我的作品</Link>
        <Link className="nav-cta" href={workshop ? "/" : "/create"}>
          {workshop ? "返回首页" : "进入工坊"} <span aria-hidden="true">→</span>
        </Link>
      </nav>
    </header>
  );
}
