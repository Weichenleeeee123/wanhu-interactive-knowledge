import Link from "next/link";
export function Brand() {
  return (
    <Link className="brand" href="/" aria-label="知玩首页">
      <span className="brand-mark" aria-hidden="true">
        <svg viewBox="0 0 30 30">
          <path
            d="M5 8Q15 36 25 8M5 22H25"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          />
          <circle cx="22" cy="14" r="3" fill="var(--orange)" />
        </svg>
      </span>
      <span>
        知玩<small>KNOWLEDGE IN MOTION</small>
      </span>
    </Link>
  );
}
export function Header({ workshop = false }: { workshop?: boolean }) {
  return (
    <header className="site-header">
      <Brand />
      <nav aria-label="主导航">
        <Link href="/library">我的作品</Link>
        <Link href="/#experiments">
          探索实验 <span aria-hidden="true">↗</span>
        </Link>
        <Link className="nav-cta" href={workshop ? "/" : "/create"}>
          {workshop ? "返回首页" : "进入工坊"} <span aria-hidden="true">→</span>
        </Link>
      </nav>
    </header>
  );
}
