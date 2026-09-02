import { MarketPageFrame, MarketPageHeader } from "@/components/market/market-page-shell";
import { EmptyState } from "@/components/ui/state";
import { api, type Dashboard, type StockSearchResult, type UsDashboard, type UsSearchResult } from "@/lib/api";
import { formatPrice, formatPct } from "@/lib/format";
import Link from "next/link";
import { SearchBox } from "@/components/search/search-box";
import { marketFromSearchParams } from "@/lib/market";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "搜索股票",
  description: "搜索A股与美股股票，按代码、名称或拼音查找个股行情数据。",
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

// Batch hot quotes via a single watchlist request
async function fetchHotStockQuotes(signal?: AbortSignal): Promise<Record<string, { last: number; change_pct: number }>> {
  const quotes: Record<string, { last: number; change_pct: number }> = {};
  try {
    const res = await api.getWatchlistByCodes(HOT_STOCKS.map((s) => s.code), { signal });
    for (const item of res.watchlist) {
      quotes[item.code] = { last: item.price, change_pct: item.change_pct };
    }
  } catch {
    // keep quotes empty
  }
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
  searchParams: Promise<{ q?: string; market?: string }>;
}) {
  const { q, market } = await searchParams;
  const scope = marketFromSearchParams(market);
  if (scope === "all") {
    redirect("/search/?market=cn");
  }
  const isUs = scope === "us";
  let results: StockSearchResult[] = [];
  let usResults: UsSearchResult[] = [];
  let error: string | null = null;
  let dashboard: Dashboard | null = null;
  let usDashboard: UsDashboard | null = null;
  let hotQuotes: Record<string, { last: number; change_pct: number }> = {};

  const query = q?.trim();
  if (query) {
    try {
      if (isUs) {
        const data = await api.searchUsStocks(query);
        usResults = data.list || [];
      } else {
        const data = await api.searchStocks(query);
        results = data.list || [];
      }
    } catch {
      error = isUs ? "美股搜索接口暂时不可用" : "搜索接口暂时不可用";
    }
  } else if (isUs) {
    try {
      usDashboard = await api.getUsDashboard();
    } catch {}
  } else {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 2500);
    const [dashboardResult, hotQuotesResult] = await Promise.allSettled([
      api.getDashboard({ signal: controller.signal }),
      fetchHotStockQuotes(controller.signal),
    ]);
    clearTimeout(timeout);
    if (dashboardResult.status === "fulfilled") dashboard = dashboardResult.value;
    if (hotQuotesResult.status === "fulfilled") hotQuotes = hotQuotesResult.value;
  }

  // 从涨停板提取热门股票
  const hotFromMarket = isUs ? [] : dashboard?.limit_up?.slice(0, 6) || [];
  const searchResults = isUs ? usResults : results;

  return (
    <MarketPageFrame market={scope}>
      <MarketPageHeader
        market={scope}
        title="搜索"
        subtitle="按代码、名称或拼音查找股票"
        image="/images/ai-art/search-decoration.png"
      />

        <div className="mt-4">
          <SearchBox initialQuery={q || ""} market={scope} />
        </div>

        {/* 搜索结果 */}
        {q && (
          <div className="mt-4">
            <p className="text-sm text-neo-mid">
              关键词: <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-neo-ink">{q}</span>
              {searchResults.length > 0 && <span className="ml-2 text-neo-dim">({searchResults.length} 条结果)</span>}
            </p>

            {error && (
              <div className="neo-card-sm mt-4 p-6 text-center">
                <p className="text-sm text-neo-mid">{error}</p>
                <p className="mt-2 text-xs text-neo-dim">试试直接输入 6 位股票代码跳转，或从下方热门股票进入</p>
              </div>
            )}

            {!error && searchResults.length === 0 && (
              <div className="mt-4">
                <EmptyState
                  image="/images/ai-art/empty-state-robot.png"
                  title={isUs ? "未找到匹配的美股" : "未找到匹配的股票"}
                  description={isUs ? "试试直接输入美股代码（如 AAPL）或公司名称" : "试试直接输入 6 位代码（如 300414）或改用拼音搜索"}
                  action={isUs ? (/^[A-Za-z][A-Za-z0-9.-]{0,9}$/.test(q.trim()) ? (<a href={`/stock/${q.trim().toUpperCase()}/`} className="neo-btn-primary inline-block px-4 py-2 text-sm font-medium">直接查看 {q.trim().toUpperCase()} →</a>) : undefined) : (q.match(/^\d{6}$/) ? (<a href={`/stock/${q}/`} className="neo-btn-primary inline-block px-4 py-2 text-sm font-medium">直接查看 {q} →</a>) : undefined)}
                />
              </div>
            )}


            {searchResults.length > 0 && (
              <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                {searchResults.map((s) => (
                  <SearchStockCard
                    key={s.code}
                    name={s.name}
                    code={s.code}
                    tag={isUs ? (s as UsSearchResult).type || "美股" : (s as StockSearchResult).pinyin || "A股"}
                    href={isUs ? `/stock/${s.code}/` : `/stock/${s.code.replace(/\./, "")}/`}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* 没有搜索词时展示热门 */}
        {!q && (
          <>
            {isUs && usDashboard && (
              <section className="neo-fade-up mt-6">
                <div className="mb-3 flex items-center gap-2">
                  <h2 className="text-sm font-semibold text-neo-mid">美股热门</h2>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
                  {usDashboard.indices.map((idx) => (
                    <SearchStockCard key={idx.code} name={idx.name ?? idx.code} code={idx.code} price={idx.last} pct={idx.change_pct} tag="指数ETF" href={`/stock/${idx.code}/`} />
                  ))}
                </div>
                <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                  {usDashboard.stocks.map((s) => (
                    <SearchStockCard key={s.code} name={s.name ?? s.code} code={s.code} price={s.last} pct={s.change_pct} tag="美股" href={`/stock/${s.code}/`} />
                  ))}
                </div>
              </section>
            )}
            {/* 今日涨停热门 */}
            {hotFromMarket.length > 0 && (
              <section className="neo-fade-up mt-6">
                <div className="mb-3 flex items-center gap-2">
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
            {!isUs && (
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
            )}

            {/* 搜索提示 */}
            {!isUs && (
              <section className="neo-fade-up mt-6" style={{ animationDelay: "120ms" }}>
                <div className="neo-card-sm p-5">
                  <h3 className="text-sm font-medium text-neo-mid">搜索技巧</h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-neo-dim">
                    <li>• 输入 6 位股票代码可直接跳转，如 <Link href="/stock/sz300414/" className="text-brand hover:underline">300414</Link></li>
                    <li>• 输入股票名称搜索，如「茅台」「宁德」</li>
                    <li>• 也可以从上方热门股票或今日涨停直接进入</li>
                  </ul>
                </div>
              </section>
            )}
            {isUs && (
              <section className="neo-fade-up mt-6" style={{ animationDelay: "120ms" }}>
                <div className="neo-card-sm p-5">
                  <h3 className="text-sm font-medium text-neo-mid">搜索技巧</h3>
                  <ul className="mt-2 space-y-1.5 text-xs text-neo-dim">
                    <li>• 输入美股代码可直接跳转，如 AAPL、NVDA、BRK.B</li>
                    <li>• 输入公司名称搜索，如 Apple、Nvidia</li>
                    <li>• 也可以从上方美股热门直接进入</li>
                  </ul>
                </div>
              </section>
            )}
          </>
        )}
    </MarketPageFrame>
  );
}
