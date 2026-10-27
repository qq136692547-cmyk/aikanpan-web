import { Footer } from "@/components/layout/footer";
import { Navbar } from "@/components/layout/navbar";
import { INDEXABLE_STOCKS } from "@/lib/stock-seo";
import { buildOpenGraph } from "@/lib/open-graph";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "热门股票行情",
  description: "A股、港股与美股热门股票行情入口，覆盖贵州茅台、宁德时代、腾讯控股、阿里巴巴、苹果、英伟达等常见关注标的。",
  alternates: { canonical: "/stocks/" },
  openGraph: buildOpenGraph({
    title: "热门股票行情 · 爱看盘",
    description: "A股、港股与美股热门股票行情入口，覆盖贵州茅台、宁德时代、腾讯控股、阿里巴巴、苹果、英伟达等常见关注标的。",
    url: "/stocks/",
  }),
};

function isCnStock(code: string) {
  return /^(sh|sz|bj)\d{6}$/.test(code);
}

function isHkStock(code: string) {
  return /^\d{4,5}$/.test(code);
}

export default function StocksPage() {
  const cnStocks = INDEXABLE_STOCKS.filter((stock) => isCnStock(stock.code));
  const hkStocks = INDEXABLE_STOCKS.filter((stock) => isHkStock(stock.code));
  const usStocks = INDEXABLE_STOCKS.filter((stock) => !isCnStock(stock.code) && !isHkStock(stock.code));

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6">
        <header className="mb-5">
          <p className="text-[12px] font-medium text-neo-primary">股票行情</p>
          <h1 className="mt-1 text-2xl font-semibold text-neo-ink">热门股票</h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-neo-mid">
            汇总常见关注标的的行情、财务数据、资金流向与相关资讯入口。
          </p>
        </header>

        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-neo-ink">A 股热门股票</h2>
            <span className="text-[11px] text-neo-dim">{cnStocks.length} 只</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {cnStocks.map((stock) => (
              <Link
                key={stock.code}
                href={`/stock/${stock.code}/`}
                className="neo-card-sm flex min-h-14 items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-[var(--neo-surface-hover)]"
              >
                <span className="truncate text-[13px] font-medium text-neo-ink">{stock.name}</span>
                <span className="shrink-0 text-[10px] text-neo-dim">{stock.code.slice(2)}</span>
              </Link>
            ))}
          </div>
        </section>

        <section className="mb-5">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-neo-ink">港股热门股票</h2>
            <span className="text-[11px] text-neo-dim">{hkStocks.length} 只</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {hkStocks.map((stock) => (
              <Link
                key={stock.code}
                href={`/stock/${stock.code}/`}
                className="neo-card-sm flex min-h-14 items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-[var(--neo-surface-hover)]"
              >
                <span className="truncate text-[13px] font-medium text-neo-ink">{stock.name}</span>
                <span className="shrink-0 text-[10px] text-neo-dim">{stock.code}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-neo-ink">美股热门股票</h2>
            <span className="text-[11px] text-neo-dim">{usStocks.length} 只</span>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
            {usStocks.map((stock) => (
              <Link
                key={stock.code}
                href={`/stock/${stock.code}/`}
                className="neo-card-sm flex min-h-14 items-center justify-between gap-2 px-3 py-2 transition-colors hover:bg-[var(--neo-surface-hover)]"
              >
                <span className="truncate text-[13px] font-medium text-neo-ink">{stock.name}</span>
                <span className="shrink-0 text-[10px] text-neo-dim">{stock.code}</span>
              </Link>
            ))}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
