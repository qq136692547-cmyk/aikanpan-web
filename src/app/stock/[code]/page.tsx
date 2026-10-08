import { BentoCard, BentoCell } from "@/components/stock/bento";
import { Activity, BarChart3, LineChart } from "lucide-react";
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
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import { api } from "@/lib/api";
import { formatPrice, formatVolume, formatAmount } from "@/lib/format";
import {
  canonicalStockCode,
  INDEXABLE_STOCKS,
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

/** 已在 INDEXABLE_STOCKS 里登记的名称，直接用来做面包屑，避免为了取名字再发一次行情请求 */
const STOCK_NAME_BY_CODE = new Map<string, string>(
  INDEXABLE_STOCKS.map((stock) => [stock.code, stock.name] as [string, string]),
);

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
  const breadcrumbName =
    STOCK_NAME_BY_CODE.get(routeCode) ??
    (isUsStockCode(routeCode) ? usNameZh(null, routeCode) : stockDisplayCode(routeCode));
  const breadcrumb = (
    <BreadcrumbSchema
      items={[
        { name: "首页", path: "/" },
        { name: "热门股票行情", path: "/stocks/" },
        { name: breadcrumbName, path: `/stock/${routeCode}/` },
      ]}
    />
  );
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
        {breadcrumb}
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
        {breadcrumb}
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
      {breadcrumb}
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        <StockTitleBar code={code} initial={quote} />

        {/* 统计数据网格 (1:1 镜像 Figma Bento Grid 核心盘口 + 主力资金) */}
        {quote && (
          <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2 neo-fade-up">
            {/* 左便当盒：日内核心盘口 3x2 矩阵 */}
            <BentoCard
              title="核心交易盘口"
              icon={<Activity className="h-4 w-4 text-purple-400" />}
              subtitle="实时撮合与量能规模"
            >
              <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
                <BentoCell label="今开" value={formatPrice(quote.open)} />
                <BentoCell label="最高" value={formatPrice(quote.high)} trend="up" />
                <BentoCell label="最低" value={formatPrice(quote.low)} trend="down" />
                <BentoCell label="昨收" value={formatPrice(quote.prev_close)} />
                <BentoCell label="成交量" value={formatVolume(quote.volume)} />
                <BentoCell label="成交额" value={formatAmount(quote.amount || quote.volume * quote.last)} trend="purple" />
              </div>
            </BentoCard>

            {/* 右便当盒：主力资金多空博弈 */}
            {moneyflow ? (
              <BentoCard
                title="主力资金博弈"
                icon={<BarChart3 className="h-4 w-4 text-amber-400" />}
                subtitle="机构与超大单博弈动能"
              >
                <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-2">
                  <BentoCell
                    label="主力净流入"
                    value={formatAmount(Number(moneyflow.main_net_inflow || 0))}
                    trend={Number(moneyflow.main_net_inflow || 0) >= 0 ? "up" : "down"}
                    sub={`占成交额 ${Number(moneyflow.main_net_inflow_pct || 0).toFixed(2)}%`}
                  />
                  <BentoCell
                    label="净流入占比"
                    value={`${Number(moneyflow.main_net_inflow_pct || 0) >= 0 ? "+" : ""}${Number(moneyflow.main_net_inflow_pct || 0).toFixed(2)}%`}
                    trend={Number(moneyflow.main_net_inflow_pct || 0) >= 0 ? "up" : "down"}
                    sub="多空净流向强度"
                  />
                  <BentoCell
                    label="超大单比例"
                    value={`${Number(moneyflow.super_large_ratio || 0).toFixed(2)}%`}
                    trend="purple"
                    sub="主力机构挂单"
                  />
                  <BentoCell
                    label="大单比例"
                    value={`${Number(moneyflow.large_ratio || 0).toFixed(2)}%`}
                    trend="amber"
                    sub="大资金跟进活跃度"
                  />
                </div>
              </BentoCard>
            ) : (
              <BentoCard title="资金流向" icon={<BarChart3 className="h-4 w-4 text-amber-400" />}>
                <div className="flex h-32 items-center justify-center text-xs text-neutral-500 font-mono">
                  资金流向数据撮合中
                </div>
              </BentoCard>
            )}
          </div>
        )}

        <StockTabs events={events} financials={financials} />

        {/* 技术指标四联盒 (1:1 镜像 Figma Bento Grid) */}
        {indicators && (
          <div className="mb-4 neo-fade-up">
            <BentoCard
              title="量化技术指标诊断"
              icon={<LineChart className="h-4 w-4 text-cyan-400" />}
              subtitle="MACD · KDJ · RSI · BOLL 多周期模型"
            >
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {indicators.macd && (
                  <BentoCell
                    label="MACD (12, 26, 9)"
                    value={latestValue(indicators.macd.macd).toFixed(3)}
                    trend={latestValue(indicators.macd.macd) >= 0 ? "up" : "down"}
                    sub={`DIF: ${latestValue(indicators.macd.dif).toFixed(3)} | DEA: ${latestValue(indicators.macd.dea).toFixed(3)}`}
                  />
                )}
                {indicators.kdj && (
                  <BentoCell
                    label="KDJ (9, 3, 3)"
                    value={`K:${latestValue(indicators.kdj.k).toFixed(1)} D:${latestValue(indicators.kdj.d).toFixed(1)}`}
                    trend="amber"
                    sub={`J值: ${latestValue(indicators.kdj.j).toFixed(1)}`}
                  />
                )}
                {indicators.rsi && (
                  <BentoCell
                    label="RSI (14)"
                    value={latestValue(indicators.rsi).toFixed(2)}
                    trend={latestValue(indicators.rsi) > 70 ? "up" : latestValue(indicators.rsi) < 30 ? "down" : "neutral"}
                    sub="相对强弱动能"
                  />
                )}
                {indicators.boll && (
                  <BentoCell
                    label="BOLL (20, 2)"
                    value={latestValue(indicators.boll.mid).toFixed(2)}
                    sub={`上:${latestValue(indicators.boll.upper).toFixed(2)} 下:${latestValue(indicators.boll.lower).toFixed(2)}`}
                  />
                )}
              </div>
            </BentoCard>
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
