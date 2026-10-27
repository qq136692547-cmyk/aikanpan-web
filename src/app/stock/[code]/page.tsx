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
import { api, type UsQuote } from "@/lib/api";
import { buildOpenGraph } from "@/lib/open-graph";
import { classifyQuoteFailure } from "@/lib/quote-failure";
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
  const pageTitle = indexable
    ? `${displayName}（${displayCode}）股票行情与关键数据`
    : `个股 ${routeCode}`;
  const pageDescription = indexable
    ? `${displayName}（${displayCode}）页面，汇总实时行情、关键指标、财报事件与相关新闻，数据来自公开行情接口。`
    : `${routeCode} 个股行情页面，汇总公开行情接口的报价与关键数据。`;

  return {
    title: pageTitle,
    description: indexable ? pageDescription : undefined,
    robots: { index: indexable, follow: true },
    alternates: { canonical: `/stock/${routeCode}/` },
    openGraph: buildOpenGraph({
      title: `${pageTitle} · 爱看盘`,
      description: pageDescription,
      url: `/stock/${routeCode}/`,
    }),
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

/**
 * 美股行情里是否真有数据。
 *
 * 后端对不存在的代码不会返回 404，而是返回 HTTP 200 + 全 0 的占位行情
 * （name 与 code 相同，last/prev_close 都是 0）。所以「请求成功」不能当作
 * 「代码存在」的判据，只能看有没有真实价位。
 */
function hasUsQuoteData(quote: UsQuote | null | undefined): boolean {
  if (!quote) return false;
  const last = Number(quote.last);
  const prevClose = Number(quote.prev_close);
  return (Number.isFinite(last) && last > 0) || (Number.isFinite(prevClose) && prevClose > 0);
}

/** 行情首次请求超时。后端读缓存约 70ms，实时拉一次行情约 2s，8s 留足余量。 */
const QUOTE_TIMEOUT_MS = 8000;
/** 行情重试超时。只给一次重试，且时限更短——第一次已经耗掉 8s 了，再长时间挂起没意义。 */
const QUOTE_RETRY_TIMEOUT_MS = 4000;

/**
 * 把任意异常压成一行可读原因，只用于日志，不参与任何判定。
 *
 * 不写成 `err instanceof Error` 是有原因的：`AbortSignal.timeout()` 抛出的是 DOMException，
 * 它在浏览器和 Node 里都不是 Error 的子类，用 instanceof 会把它降级成 "unknown"。
 */
function describeError(err: unknown): string {
  if (err !== null && typeof err === "object") {
    const e = err as { name?: string; message?: string; status?: number };
    const head = [e.name || "Error", e.status].filter((v) => v !== undefined).join("/");
    return e.message ? `${head}: ${e.message}` : head;
  }
  return String(err);
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
      // 这里不按行情做存在性判断：能走到这一步说明代码在 INDEXABLE_STOCKS 白名单里，
      // 代码本身一定存在；行情缺失只会是数据源问题（Finnhub 限流会返回全 0），
      // 误判成 404 的代价比渲染一个降级页大得多。
      initialData = {
        quote: settled[0].status === "fulfilled" ? settled[0].value : null,
        history: settled[1].status === "fulfilled" ? settled[1].value : null,
        financials: settled[2].status === "fulfilled" ? settled[2].value : null,
        earnings: settled[3].status === "fulfilled" ? settled[3].value : null,
        news: settled[5].status === "fulfilled" ? settled[5].value.news : [],
        filings: settled[4].status === "fulfilled" ? settled[4].value : null,
      };
    } else {
      // 未登记的美股代码（如 /stock/zzzzzz/）：用一次行情请求确认代码是否存在。
      // 该请求走 Next 数据缓存（revalidate 30），不会每次访问都打后端。
      let probe: UsQuote | null = null;
      try {
        probe = await api.getUsQuote(routeCode);
      } catch (e) {
        // N6：Finnhub 限流(429)/5xx 是瞬时故障，不代表这个代码不存在。原来 `catch { probe = null }`
        // 会把它们一起变成 404 —— 一个有效美股代码被缓存成「不存在」比返回一次 500 严重得多。
        if (classifyQuoteFailure(e) === "transient") throw e;
        notFound();
      }
      if (!hasUsQuoteData(probe)) notFound();
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
  // N6：行情单独取，不并进下面的 allSettled。只有它需要区分「代码不存在」与「后端瞬时故障」，
  // 也需要独立超时 + 重试。
  let quote: Awaited<ReturnType<typeof api.getStockQuote>> | null = null;
  let quoteError: unknown = null;
  let quoteAttempts = 0;
  for (const timeoutMs of [QUOTE_TIMEOUT_MS, QUOTE_RETRY_TIMEOUT_MS]) {
    quoteAttempts += 1;
    try {
      quote = await api.getStockQuote(code, { signal: AbortSignal.timeout(timeoutMs) });
      break;
    } catch (e) {
      quoteError = e;
      // 后端已经明确说「没有行情」，重试也不会变成有，直接跳出省一次 4s。
      if (classifyQuoteFailure(e) === "not-found") break;
    }
  }
  // 首次失败但重试成功：页面正常，但这说明后端正在抖，必须留下信号，
  // 否则「页面好着」和「后端在坏」在日志里长得一模一样。
  if (quote && quoteAttempts > 1) {
    console.warn(
      `[stock/${code}] 行情首次请求失败，第 ${quoteAttempts} 次重试后成功 — ${describeError(quoteError)}`
    );
  }

  // 其余 4 个请求是「有则更好」的补充数据，任何一个失败都不该影响页面主体，保持 allSettled。
  const settled = await Promise.allSettled([
    api.getStockMoneyflow(code),
    api.getStockIndicators(code),
    api.getStockEvents(code),
    api.getStockFinancials(code),
  ]);
  const moneyflow = settled[0].status === "fulfilled" ? settled[0].value : null;
  const indicators = settled[1].status === "fulfilled" ? settled[1].value : null;
  const events = settled[2].status === "fulfilled" ? settled[2].value : null;
  const financials = settled[3].status === "fulfilled" ? settled[3].value : null;

  // N6：失败原因必须留痕。原来这里是一个包着 allSettled 的 try/catch —— allSettled 永不 reject，
  // 那段 catch 是死代码，所以取数失败从来没有任何日志，线上只能看到「页面空白」。
  const failureLines: string[] = [];
  if (!quote) failureLines.push(`quote: ${describeError(quoteError)}`);
  const optionalResults: Array<[string, PromiseSettledResult<unknown>]> = [
    ["moneyflow", settled[0]],
    ["indicators", settled[1]],
    ["events", settled[2]],
    ["financials", settled[3]],
  ];
  for (const [name, result] of optionalResults) {
    if (result.status === "rejected") failureLines.push(`${name}: ${describeError(result.reason)}`);
  }
  if (failureLines.length > 0) {
    console.warn(`[stock/${code}] 取数失败 ${failureLines.length}/5 — ${failureLines.join("; ")}`);
  }

  // 只有后端明确说「这个代码没有行情」才 404（503 "quote data unavailable" / 404）。
  // 瞬时故障则抛出去让 Next 返回 500：ISR 不缓存 500，下一次请求还能自愈；
  // 而缓存一个假 404 要等 revalidate 过后才恢复，期间爬虫会把它当成「页面不存在」。
  if (!quote) {
    if (classifyQuoteFailure(quoteError) === "not-found") notFound();
    throw quoteError instanceof Error
      ? quoteError
      : new Error(`行情取数失败：${describeError(quoteError)}`);
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
