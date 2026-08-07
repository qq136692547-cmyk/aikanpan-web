import { Navbar } from "@/components/layout/navbar";
import { EmptyState } from "@/components/ui/state";
import { Footer } from "@/components/layout/footer";
import { api, type StockSearchResult, type Dashboard, type StockQuote } from "@/lib/api";
import { formatPrice, formatPct } from "@/lib/format";
import Image from "next/image";
import { SearchBox } from "@/components/search/search-box";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "搜索股票",
  description: "搜索A股股票，按代码或名称查找个股行情数据。",
};

// 热门股票快捷入口
const HOT_STOCKS = [
  { code: "sh.600519", name: "贵州茅台", tag: "白酒" },
  { code: "sz.300750", name: "宁德时代", tag: "新能源" },
  { code: "sh.601318", name: "中国平安", tag: "保险" },
  { code: "sz.000858", name: "五粮液", tag: "白酒" },
  { code: "sh.600036", name: "招商银行", tag: "银行" },
  { code: "sz.002594", name: "比亚迪", tag: "汽车" },
  { code: "sh.688981", name: "中芯国际", tag: "半导体" },
  { code: "sz.000333", name: "美的集团", tag: "家电" },
  { code: "sh.601012", name: "隆基绿能", tag: "光伏" },
  { code: "sz.300059", name: "东方财富", tag: "券商" },
  { code: "sh.600276", name: "恒瑞医药", tag: "医药" },
  { code: "sz.002475", name: "立讯精密", tag: "消费电子" },
];

// 批量获取热门股票实时报价，失败的保持原样不显示价格
async function fetchHotStockQuotes(): Promise<Record<string, StockQuote>> {
  const results = await Promise.allSettled(
    HOT_STOCKS.map((s) => api.getStockQuote(s.code))
  );
  const quotes: Record<string, StockQuote> = {};
  results.forEach((r, i) => {
    if (r.status === "fulfilled") {
      quotes[HOT_STOCKS[i].code] = r.value;
    }
  });
  return quotes;
}

function SearchStockCard({
  name,
  code,
  price,
  pct,
  tag,
  href,
}: {
  name: string;
  code: string;
  price?: number;
  pct?: number;
  tag?: string;
  href: string;
}) {
  const color = pct === undefined ? "text-neo-dim" : pct > 0 ? "text-neo-up" : pct < 0 ? "text-neo-down" : "text-neo-mid";
  return (
    <a href={href} className="neo-card-sm group p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="truncate text-sm font-medium text-neo-ink transition-colors group-hover:text-brand">{name}</div>
{tag && <span className="shrink-0 rounded bg-[var(--neo-surface-inset)] px-1.5 py-0.5 text-[10px] text-neo-mid">{tag}</span>}
      </div>
      <div style={{ fontFamily: 'var(--font-inter), system-ui' }} className="mt-0.5 text-[10px] text-neo-dim">{code}</div>
      <div className="mt-1.5 flex items-baseline gap-1.5">
        <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`text-[13px] font-semibold ${color}`}>{price !== undefined ? formatPrice(price) : "-"}</span>
        <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`text-[11px] ${color}`}>{pct !== undefined ? formatPct(pct) : "-"}</span>
      </div>
    </a>
  );
}

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let results: StockSearchResult[] = [];
  let error: string | null = null;
  let dashboard: Dashboard | null = null;

  // 同时获取 dashboard 用于展示涨停板热门
  try {
    dashboard = await api.getDashboard();
  } catch {}

  // 批量获取热门股票实时报价
  const hotQuotes = await fetchHotStockQuotes();

  if (q && q.trim()) {
    try {
      const data = await api.searchStocks(q.trim());
      results = data.list || [];
    } catch {
      error = "搜索接口暂时不可用";
    }
  }

  // 从涨停板提取热门股票
  const hotFromMarket = dashboard?.limit_up?.slice(0, 6) || [];

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6 sm:py-6">
        {/* Header with decorative background */}
        <div className="relative overflow-hidden rounded-2xl">
          <Image
            src="/images/ai-art/search-decoration.png"
            alt=""
            aria-hidden
            fill
            className="pointer-events-none object-cover opacity-20"
          />
          <div className="relative py-2">
            <h1 className="text-xl font-bold text-neo-ink">搜索股票</h1>
          </div>
        </div>

        <div className="mt-4">
          <SearchBox initialQuery={q || ""} />
        </div>

        {/* 搜索结果 */}
        {q && (
          <div className="mt-4">
            <p className="text-sm text-neo-mid">
              关键词: <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-neo-ink">{q}</span>
              {results.length > 0 && <span className="ml-2 text-neo-dim">({results.length} 条结果)</span>}
            </p>

            {error && (
              <div className="neo-card-sm mt-4 p-6 text-center">
                <p className="text-sm text-neo-mid">{error}</p>
                <p className="mt-2 text-xs text-neo-dim">试试直接输入 6 位股票代码跳转，或从下方热门股票进入</p>
              </div>
            )}

            {!error && results.length === 0 && (
              <div className="mt-4">
                <EmptyState
                  image="/images/ai-art/empty-state-robot.png"
                  title="未找到匹配的股票"
                  description="试试直接输入 6 位代码（如 300414）或改用拼音搜索"
                  action={q.match(/^\d{6}$/) ? (<a href={`/stock/${q}/`} className="neo-btn-primary inline-block px-4 py-2 text-sm font-medium">直接查看 {q} →</a>) : undefined}
                />
              </div>
            )}

            {results.length > 0 && (
              <div className="neo-card-sm mt-4 overflow-hidden">
                <table className="w-full">
                  <thead>
                    <tr className="text-[11px] uppercase tracking-wide text-neo-dim">
                      <th className="px-4 py-2 text-left font-medium">名称</th>
                      <th className="px-4 py-2 text-left font-medium">代码</th>
                      <th className="px-4 py-2 text-left font-medium">拼音</th>
                    </tr>
                  </thead>
                  <tbody>
                    {results.map((s) => (
                      <tr key={s.code} className="transition-colors hover-neo-inset last:border-b-0">
                        <td className="px-4 py-2.5 text-sm">
                          <a href={`/stock/${s.code.replace(/\./, "")}/`} className="font-medium text-neo-ink transition-colors hover:text-brand">
                            {s.name}
                          </a>
                        </td>
                        <td style={{ fontFamily: 'var(--font-inter), system-ui' }} className="px-4 py-2.5 text-sm text-neo-mid">{s.code}</td>
                        <td className="px-4 py-2.5 text-xs text-neo-dim">{s.pinyin || "-"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* 没有搜索词时展示热门 */}
        {!q && (
          <>
            {/* 今日涨停热门 */}
            {hotFromMarket.length > 0 && (
              <section className="neo-fade-up mt-6">
                <div className="mb-3 flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-neo-up pulse-dot" />
                  <h2 className="text-sm font-semibold text-neo-mid">今日涨停</h2>
                  <span className="text-xs text-neo-dim">从涨停板进入个股详情</span>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {hotFromMarket.map((s) => (
                    <SearchStockCard
                      key={s.code}
                      name={s.name}
                      code={s.code}
                      price={s.price}
                      pct={s.pct}
                      tag={s.tag}
                      href={`/stock/${s.code.replace(/\./, "")}/`}
                    />
                  ))}
                </div>
              </section>
            )}

            {/* 热门股票 */}
            <section className="neo-fade-up mt-6" style={{ animationDelay: "60ms" }}>
              <div className="mb-3 flex items-center gap-2">
                <h2 className="text-sm font-semibold text-neo-mid">热门股票</h2>
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {HOT_STOCKS.map((s) => {
                  const quote = hotQuotes[s.code];
                  return (
                    <SearchStockCard
                      key={s.code}
                      name={s.name}
                      code={s.code}
                      price={quote?.last}
                      pct={quote?.change_pct}
                      tag={s.tag}
                      href={`/stock/${s.code.replace(/\./, "")}/`}
                    />
                  );
                })}
              </div>
            </section>

            {/* 搜索提示 */}
            <section className="neo-fade-up mt-6" style={{ animationDelay: "120ms" }}>
              <div className="neo-card-sm p-5">
                <h3 className="text-sm font-medium text-neo-mid">搜索技巧</h3>
                <ul className="mt-2 space-y-1.5 text-xs text-neo-dim">
                  <li>• 输入 6 位股票代码可直接跳转，如 <a href="/stock/sz300414/" className="text-brand hover:underline">300414</a></li>
                  <li>• 输入股票名称搜索，如「茅台」「宁德」</li>
                  <li>• 也可以从上方热门股票或今日涨停直接进入</li>
                </ul>
              </div>
            </section>
          </>
        )}
      </main>
      <Footer />
    </div>
  );
}
