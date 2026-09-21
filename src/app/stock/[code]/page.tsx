import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { TradingViewChart } from "@/components/chart/tradingview-chart";
import { AIComment } from "@/components/ai/ai-comment";
import { AIHistoryPanel } from "@/components/ai/ai-history-panel";
import { StockThesisPanel } from "@/components/research/stock-thesis-panel";
import { StockTabs } from "@/components/stock/stock-tabs";
import { StockTitleBar } from "@/components/stock/stock-title-bar";
import { UsStockDetail, type UsStockDetailInitialData } from "@/components/us/us-stock-detail";
import { HkStockDetail, type HkStockDetailInitialData } from "@/components/hk/hk-stock-detail";
import { api } from "@/lib/api";
import { formatPrice, formatVolume, formatAmount } from "@/lib/format";
import {
  canonicalStockCode,
  isHkStockCode,
  isIndexableStockCode,
  isUsStockCode,
  stockApiCode,
  stockDisplayCode,
} from "@/lib/stock-seo";
import { usNameZh } from "@/lib/us-stock-names";
import type { Metadata } from "next";
import { notFound } from "next/navigation";

export const revalidate = 30;

export async function generateMetadata({ params }: { params: Promise<{ code: string }> }): Promise<Metadata> {
  const { code: rawCode } = await params;
  const routeCode = canonicalStockCode(rawCode);
  const indexable = isIndexableStockCode(routeCode);
  const isUs = isUsStockCode(routeCode);
  const isHk = isHkStockCode(routeCode);
  let displayName = isUs ? usNameZh(null, routeCode) : routeCode;
  if (indexable && !isUs) {
    try {
      const quote = isHk ? await api.getHkQuote(routeCode) : await api.getStockQuote(stockApiCode(routeCode));
      displayName = quote.name || displayName;
    } catch {}
  }
  const displayCode = stockDisplayCode(routeCode);

  return {
    title: indexable ? `${displayName}（${displayCode}）股票行情与关键数据` : `个股 ${routeCode}`,
    description: indexable
      ? `${displayName}（${displayCode}）页面，汇总实时行情、关键指标、财报事件与相关新闻，数据来自公开行情接口。`
      : undefined,
    robots: { index: indexable, follow: true },
    alternates: { canonical: `/stock/${routeCode}/` },
  };
}


function latestValue(value: number | number[] | null | undefined): number {
  if (value == null) return 0;
  if (Array.isArray(value)) {
    const vals = value.filter((v) => typeof v === "number" && Number.isFinite(v));
    return vals.length ? vals[vals.length - 1] : 0;
  }
  return Number.isFinite(value) ? value : 0;
}


export default async function StockPage({ params }: { params: Promise<{ code: string }> }) {
  const { code: rawCode } = await params;
  const routeCode = canonicalStockCode(rawCode);
  const isCnStockCode = /^(sh|sz|bj)?\d{6}$/.test(routeCode.toLowerCase());
  if (!isCnStockCode && !isHkStockCode(routeCode) && !isUsStockCode(routeCode)) {
    notFound();
  }
  const code = stockApiCode(routeCode);
  if (isHkStockCode(routeCode)) {
    let initialData: HkStockDetailInitialData | undefined;
    if (isIndexableStockCode(routeCode)) {
      const settled = await Promise.allSettled([
        api.getHkQuote(routeCode),
        api.getHkHistory(routeCode, 120),
        api.getHkFinancials(routeCode),
        api.getHkNews(routeCode, 8),
        api.getHkIndicators(routeCode, 120),
      ]);
      initialData = {
        quote: settled[0].status === "fulfilled" ? settled[0].value : null,
        history: settled[1].status === "fulfilled" ? settled[1].value : null,
        financials: settled[2].status === "fulfilled" ? settled[2].value : null,
        news: settled[3].status === "fulfilled" ? settled[3].value.news : [],
        indicators: settled[4].status === "fulfilled" ? settled[4].value : null,
      };
    }
    return (
      <div className="neo-page">
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6 sm:py-5">
          <HkStockDetail symbol={routeCode} initialData={initialData} />
        </main>
        <Footer dataSource="腾讯行情 / 东方财富" />
      </div>
    );
  }
  if (isUsStockCode(routeCode)) {
    let initialData: UsStockDetailInitialData | undefined;
    if (isIndexableStockCode(routeCode)) {
      const settled = await Promise.allSettled([
        api.getUsQuote(routeCode),
        api.getUsHistory(routeCode, 120),
        api.getUsFinancials(routeCode),
        api.getUsEarnings(routeCode),
        api.getUsFilings(routeCode, 12),
        api.getUsNews(routeCode, 8),
      ]);
      initialData = {
        quote: settled[0].status === "fulfilled" ? settled[0].value : null,
        history: settled[1].status === "fulfilled" ? settled[1].value : null,
        financials: settled[2].status === "fulfilled" ? settled[2].value : null,
        earnings: settled[3].status === "fulfilled" ? settled[3].value : null,
        news: settled[5].status === "fulfilled" ? settled[5].value.news : [],
        filings: settled[4].status === "fulfilled" ? settled[4].value : null,
      };
    }
    return (
      <div className="neo-page">
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6 sm:py-5">
          <UsStockDetail symbol={routeCode} initialData={initialData} />
        </main>
        <Footer dataSource="Finnhub / SEC EDGAR" />
      </div>
    );
  }
  let quote = null;
  let moneyflow = null;
  let indicators = null;
  let events = null;
  let financials = null;
  try {
    const settled = await Promise.allSettled([
      api.getStockQuote(code),
      api.getStockMoneyflow(code),
      api.getStockIndicators(code),
      api.getStockEvents(code),
      api.getStockFinancials(code),
    ]);
    quote = settled[0].status === "fulfilled" ? settled[0].value : null;
    moneyflow = settled[1].status === "fulfilled" ? settled[1].value : null;
    indicators = settled[2].status === "fulfilled" ? settled[2].value : null;
    events = settled[3].status === "fulfilled" ? settled[3].value : null;
    financials = settled[4].status === "fulfilled" ? settled[4].value : null;
  } catch (e) {
    console.error("Failed to fetch stock data:", e);
  }

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        <StockTitleBar code={code} initial={quote} />

        {/* 统计数据网格 */}
        {quote && (
          <div className="neo-card p-5 mb-4 neo-fade-up" style={{ animationDelay: "30ms" }}>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-6">
              {[
                { label: "今开", value: quote.open, fmt: formatPrice },
                { label: "最高", value: quote.high, fmt: formatPrice, color: "text-neo-up" },
                { label: "最低", value: quote.low, fmt: formatPrice, color: "text-neo-down" },
                { label: "昨收", value: quote.prev_close, fmt: formatPrice },
                { label: "成交量", value: quote.volume, fmt: formatVolume },
                { label: "成交额", value: quote.amount || quote.volume * quote.last, fmt: formatAmount },
              ].map((item) => (
                <div key={item.label} className="neo-inset-sm px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-neo-dim">{item.label}</div>
                  <div className={`mt-1 text-[15px] font-semibold ${item.color || "text-neo-ink"}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                    {item.fmt(item.value)}
                  </div>
                </div>
              ))}
            </div>
            {moneyflow && (
              <div className="mt-3 pt-3" style={{ borderTop: '1px solid var(--neo-surface-active)' }}>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {[
                    { label: "主力净流入", value: Number(moneyflow.main_net_inflow || 0), fmt: formatAmount, color: Number(moneyflow.main_net_inflow) >= 0 ? "text-neo-up" : "text-neo-down" },
                    { label: "净流入占比", value: Number(moneyflow.main_net_inflow_pct || 0), fmt: (v: number) => `${v >= 0 ? "+" : ""}${v.toFixed(2)}%`, color: Number(moneyflow.main_net_inflow_pct) >= 0 ? "text-neo-up" : "text-neo-down" },
                    { label: "超大单比", value: Number(moneyflow.super_large_ratio || 0), fmt: (v: number) => `${v.toFixed(2)}%` },
                    { label: "大单比", value: Number(moneyflow.large_ratio || 0), fmt: (v: number) => `${v.toFixed(2)}%` },
                  ].map((item) => (
                    <div key={item.label} className="neo-inset-sm px-3 py-2">
                      <div className="text-[10px] uppercase tracking-wider text-neo-dim">{item.label}</div>
                      <div className={`mt-1 text-[14px] font-semibold ${item.color || "text-neo-ink"}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                        {item.fmt(item.value)}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <StockTabs events={events} financials={financials} />

        {/* 技术指标 */}
        {indicators && (
          <div className="neo-card p-5 mb-4 neo-fade-up" style={{ animationDelay: "60ms" }}>
            <h3 className="mb-3 text-[14px] font-semibold text-neo-ink">技术指标</h3>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
              {indicators.macd && (
                <div className="neo-inset-sm px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-neo-dim">MACD</div>
                  <div className="mt-1 space-y-0.5 text-[12px]" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                    <div className="flex justify-between"><span className="text-neo-dim">DIF</span><span className="text-neo-ink">{latestValue(indicators.macd.dif).toFixed(3)}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">DEA</span><span className="text-neo-ink">{latestValue(indicators.macd.dea).toFixed(3)}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">MACD</span><span className={latestValue(indicators.macd.macd) >= 0 ? "text-neo-up" : "text-neo-down"}>{latestValue(indicators.macd.macd).toFixed(3)}</span></div>
                  </div>
                </div>
              )}
              {indicators.kdj && (
                <div className="neo-inset-sm px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-neo-dim">KDJ</div>
                  <div className="mt-1 space-y-0.5 text-[12px]" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                    <div className="flex justify-between"><span className="text-neo-dim">K</span><span className="text-neo-ink">{latestValue(indicators.kdj.k).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">D</span><span className="text-neo-ink">{latestValue(indicators.kdj.d).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">J</span><span className={latestValue(indicators.kdj.j) >= 0 ? "text-neo-up" : "text-neo-down"}>{latestValue(indicators.kdj.j).toFixed(2)}</span></div>
                  </div>
                </div>
              )}
              {indicators.rsi && (
                <div className="neo-inset-sm px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-neo-dim">RSI</div>
                  <div className="mt-1 space-y-0.5 text-[12px]" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                    <div className="flex justify-between"><span className="text-neo-dim">RSI</span><span className="text-neo-ink">{latestValue(indicators.rsi).toFixed(2)}</span></div>
                  </div>
                </div>
              )}
              {indicators.boll && (
                <div className="neo-inset-sm px-3 py-2.5">
                  <div className="text-[10px] uppercase tracking-wider text-neo-dim">BOLL</div>
                  <div className="mt-1 space-y-0.5 text-[12px]" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                    <div className="flex justify-between"><span className="text-neo-dim">UP</span><span className="text-neo-ink">{latestValue(indicators.boll.upper).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">MID</span><span className="text-neo-ink">{latestValue(indicators.boll.mid).toFixed(2)}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">LOW</span><span className="text-neo-ink">{latestValue(indicators.boll.lower).toFixed(2)}</span></div>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TradingView 图表 — 凹陷容器 */}
        <div className="mb-4 neo-fade-up" style={{ animationDelay: "60ms" }}>
          <TradingViewChart code={code} />
        </div>

        {/* AI 诊断 */}
        <div className="neo-fade-up" style={{ animationDelay: "120ms" }}>
          <AIComment code={code} />
        </div>

        <div className="neo-fade-up mt-4" style={{ animationDelay: "160ms" }}>
          <AIHistoryPanel code={code} kind="stock_comment" />
        </div>

        <StockThesisPanel code={code} />
      </main>
      <Footer />
    </div>
  );
}
