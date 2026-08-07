import Link from "next/link";

export default function NotFound() {
  return (
    <div className="neo-page flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center">
      <img loading="lazy"
        src="/images/ai-art/404-astronaut.png"
        alt="页面不存在"
        className="max-w-md w-full"
      />
      <h1 className="mt-8 text-[28px] font-bold text-neo-ink">页面不存在</h1>
      <p className="mt-2 text-[14px] text-neo-dim">
        你访问的页面可能已删除或暂时不可用
      </p>
      <Link
        href="/"
        className="neo-btn-primary mt-6 inline-block rounded-xl px-6 py-3 text-[14px] font-semibold"
      >
        返回首页 →
      </Link>
    </div>
  );
}
