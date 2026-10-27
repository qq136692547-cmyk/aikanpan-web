"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { BellRing } from "lucide-react";
import { Sparkline } from "@/components/chart/sparkline";
import { HkWatchlistButton } from "./hk-watchlist-button";
import { reportConversionEvent } from "@/lib/analytics";
import { StockThesisPanel } from "@/components/research/stock-thesis-panel";
import { AIHistoryPanel } from "@/components/ai/ai-history-panel";
import { AIComment as StockAIComment } from "@/components/ai/ai-comment";
import { formatPct, formatPrice, formatVolume } from "@/lib/format";
import { friendlyDataSource } from "@/lib/data-source";
import { useAuth } from "@/lib/auth";
import {
  api,
  type AIComment,
  type HkFinancials,
  type HkHistory,
  type HkNewsItem,
  type HkQuote,
  type StockIndicators,
} from "@/lib/api";
import { BentoCard, BentoCell } from "@/components/stock/bento";
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ShieldAlert, BarChart3, LineChart, Newspaper } from "lucide-react";

export type HkStockDetailInitialData = {
  quote?: HkQuote | null;
  history?: HkHistory | null;
  financials?: HkFinancials | null;
  news?: HkNewsItem[];
  indicators?: StockIndicators | null;
  ai?: AIComment | null;
};

function formatHkMarketCap(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return "--";
  if (val >= 1e12) return (val / 1e12).toFixed(2) + "万亿";
  if (val >= 1e8) return (val / 1e8).toFixed(2) + "亿";
  if (val >= 1e4) return (val / 1e4).toFixed(0) + "万";
  return val.toLocaleString();
}

function latestValue(value: number | number[] | null | undefined): number {
  if (value == null) return 0;
  if (Array.isArray(value)) return value.length ? value[value.length - 1] ?? 0 : 0;
  return value;
}

export function HkStockDetail({
  symbol,
  initialData,
}: {
  symbol: string;
  initialData?: HkStockDetailInitialData;
}) {
  const { isAuthenticated } = useAuth();
  const [quote, setQuote] = useState<HkQuote | null>(initialData?.quote ?? null);
  const [history, setHistory] = useState<HkHistory | null>(initialData?.history ?? null);
  const [financials, setFinancials] = useState<HkFinancials | null>(initialData?.financials ?? null);
  const [news, setNews] = useState<HkNewsItem[]>(initialData?.news ?? []);
  const [indicators, setIndicators] = useState<StockIndicators | null>(initialData?.indicators ?? null);
  const [aiThesis, setAiThesis] = useState<AIComment | null>(initialData?.ai ?? null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadData() {
      try {
        const [q, h, f, n, ind] = await Promise.all([
          api.getHkQuote(symbol),
          api.getHkHistory(symbol, 120),
          api.getHkFinancials(symbol),
          api.getHkNews(symbol, 8),
          api.getHkIndicators(symbol, 120),
        ]);
        if (!mounted) return;
        setQuote(q);
        setHistory(h);
        setFinancials(f);
        setNews(n?.news ?? []);
        setIndicators(ind);
      } catch (e) {
        console.error("Failed to load HK stock data", e);
      }
    }



    loadData();
    

    return () => {
      mounted = false;
    };
  }, [symbol, isAuthenticated]);

  const trend = (quote?.change_pct ?? 0) > 0 ? 1 : (quote?.change_pct ?? 0) < 0 ? -1 : 0;
  const metrics = financials?.metrics;

  return (
    <div className="space-y-4">
      {/* 顶部行情 Hero 便当盒 (1:1 镜像 Figma 原版) */}
      <BentoCard className="p-6">
        <div
          className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl transition-opacity duration-700 ${
            trend > 0 ? "bg-red-500/10" : trend < 0 ? "bg-emerald-500/10" : "bg-indigo-500/5"
          }`}
        />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-neutral-100 sm:text-3xl">
                {quote?.name || symbol}
              </h1>
              <span className="inline-flex items-center rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-purple-400">
                {symbol} · 港股
              </span>
              <span className="inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
                {quote?.currency || "HKD"}
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-3.5">
              <span className="font-mono text-4xl font-extrabold tracking-tight text-neutral-100 sm:text-5xl tabular-nums">
                {formatPrice(quote?.last ?? 0)}
              </span>

              <div
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-sm font-bold tracking-tight shadow-sm ${
                  trend > 0
                    ? "bg-red-500/15 text-red-400 border border-red-500/20"
                    : trend < 0
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                }`}
              >
                {trend > 0 ? <TrendingUp className="h-4 w-4" /> : trend < 0 ? <TrendingDown className="h-4 w-4" /> : null}
                <span>{quote?.change ? (quote.change > 0 ? `+${formatPrice(quote.change)}` : formatPrice(quote.change)) : "--"}</span>
                <span>({formatPct(quote?.change_pct ?? 0)})</span>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
              <span>{quote?.source === "unavailable" ? "行情数据不可用" : `实时源：${friendlyDataSource(quote?.source)}`}</span>
              <span className="text-neutral-600">•</span>
              <span>{quote?.date ? `交易日：${quote.date}` : "交易中"}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400">港币结算</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <HkWatchlistButton code={symbol} />
            <Link
              href={`/alerts/?market=hk&code=${encodeURIComponent(symbol)}`}
              onClick={() => reportConversionEvent("feature_use", { source: "alert_entry_stock_hk" })}
              className="neo-chip flex min-h-11 items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium text-neo-primary"
              title="为这只股票创建盯盘提醒"
            >
              <BellRing size={14} />
              盯这只票
            </Link>
          </div>
        </div>

        {/* 底部全宽平滑微光走势 Sparkline */}
        {history?.closes && history.closes.length > 0 && (
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">近 120 日趋势走势 (收盘价波形)</span>
              <span className="font-mono text-[11px] text-neutral-400">
                区间: {formatPrice(Math.min(...history.closes))} - {formatPrice(Math.max(...history.closes))}
              </span>
            </div>
            <div className="h-14 w-full">
              <Sparkline
                data={history.closes}
                trend={trend}
                height={56}
              />
            </div>
          </div>
        )}
      </BentoCard>

      {/* 双列错落便当盒：日内核心盘口 + 深度财务估值 (1:1 镜像 Figma Bento Grid) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 左便当盒：日内核心盘口 3x2 矩阵 */}
        <BentoCard
          title="日内核心盘口"
          icon={<Activity className="h-4 w-4 text-purple-400" />}
          subtitle="实时报价与交易量能"
        >
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <BentoCell label="今开" value={formatPrice(quote?.open ?? 0)} />
            <BentoCell label="最高" value={formatPrice(quote?.high ?? 0)} trend="up" />
            <BentoCell label="最低" value={formatPrice(quote?.low ?? 0)} trend="down" />
            <BentoCell label="昨收" value={formatPrice(quote?.prev_close ?? 0)} />
            <BentoCell label="成交量" value={formatVolume(quote?.volume ?? 0)} />
            <BentoCell label="成交额" value={formatHkMarketCap(quote?.amount)} trend="purple" />
          </div>
        </BentoCard>

        {/* 右便当盒：港股特色高股息与估值矩阵 */}
        <BentoCard
          title="高股息与估值指标"
          icon={<BarChart3 className="h-4 w-4 text-amber-400" />}
          subtitle="港股核心价值红利与回报"
        >
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <BentoCell
              label="股息率 (TTM)"
              value={metrics?.dividend_yield != null ? `${metrics.dividend_yield.toFixed(2)}%` : "--"}
              trend="purple"
              sub="现金分红保障"
            />
            <BentoCell
              label="市盈率 (PE)"
              value={metrics?.pe != null ? `${metrics.pe.toFixed(2)}x` : "--"}
              trend="highlight"
            />
            <BentoCell
              label="市净率 (PB)"
              value={metrics?.pb != null ? `${metrics.pb.toFixed(2)}x` : "--"}
            />
            <BentoCell
              label="每股收益 (EPS)"
              value={metrics?.eps != null ? `HK$${metrics.eps.toFixed(2)}` : "--"}
            />
            <BentoCell
              label="每股净资产 (BPS)"
              value={metrics?.bps != null ? `HK$${metrics.bps.toFixed(2)}` : "--"}
            />
            <BentoCell
              label="日内振幅"
              value={metrics?.amplitude != null ? `${metrics.amplitude.toFixed(2)}%` : "--"}
              trend="amber"
            />
          </div>
        </BentoCard>
      </div>

      {/* 技术指标四联盒 (MACD / KDJ / RSI / BOLL) */}
      {indicators && (
        <BentoCard
          title="量化技术指标诊断"
          icon={<LineChart className="h-4 w-4 text-cyan-400" />}
          subtitle="MACD · KDJ · RSI · BOLL 多周期模型"
        >
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <BentoCell
              label="MACD (12, 26, 9)"
              value={latestValue(indicators.macd?.macd).toFixed(2)}
              trend={latestValue(indicators.macd?.macd) >= 0 ? "up" : "down"}
              sub={`DIF: ${latestValue(indicators.macd?.dif).toFixed(2)} | DEA: ${latestValue(indicators.macd?.dea).toFixed(2)}`}
            />
            <BentoCell
              label="KDJ (9, 3, 3)"
              value={`K:${latestValue(indicators.kdj?.k).toFixed(0)} D:${latestValue(indicators.kdj?.d).toFixed(0)}`}
              trend="amber"
              sub={`J值: ${latestValue(indicators.kdj?.j).toFixed(0)}`}
            />
            <BentoCell
              label="RSI (6, 12, 24)"
              value={latestValue(indicators.rsi).toFixed(1)}
              trend={latestValue(indicators.rsi) > 70 ? "up" : latestValue(indicators.rsi) < 30 ? "down" : "neutral"}
              sub={`RSI12: ${latestValue(indicators.rsi).toFixed(1)}`}
            />
            <BentoCell
              label="BOLL (20, 2)"
              value={latestValue(indicators.boll?.mid).toFixed(2)}
              sub={`上:${latestValue(indicators.boll?.upper).toFixed(2)} 下:${latestValue(indicators.boll?.lower).toFixed(2)}`}
            />
          </div>
        </BentoCard>
      )}

      {/* AI 深度量化诊断面板 */}
      <StockThesisPanel code={symbol} market="hk" />

      {/* 历史复盘研报沉淀 */}
      <AIHistoryPanel code={symbol} kind="hk_stock_ai" />

      {/* 港股关联快讯流 */}
      {news && news.length > 0 && (
        <BentoCard
          title="实时关联资讯"
          icon={<Newspaper className="h-4 w-4 text-neutral-400" />}
          subtitle="港股通与公告动态"
        >
          <div className="space-y-3">
            {news.slice(0, 5).map((item, idx) => (
              <a
                key={idx}
                href={item.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="group flex flex-col justify-between gap-1 rounded-xl border border-white/[0.04] bg-[#0C0E11]/60 p-3.5 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#12151B]"
              >
                <div className="flex items-start justify-between gap-2">
                  <h4 className="text-sm font-medium text-neutral-200 group-hover:text-purple-400 transition-colors line-clamp-1">
                    {item.title}
                  </h4>
                  <ArrowUpRight className="h-4 w-4 text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </div>
                <div className="flex items-center gap-3 text-xs text-neutral-400 font-mono">
                  <span>{item.source || "港股电报"}</span>
                  <span>•</span>
                  <span>{item.time || "刚刚"}</span>
                </div>
              </a>
            ))}
          </div>
        </BentoCard>
      )}

      {/* AI 深度个股智能诊断面板 */}
      <section>
        <StockAIComment code={symbol} market="hk" initialData={initialData?.ai} />
      </section>

      {/* 我的投资观点 */}
      <StockThesisPanel code={symbol} market="hk" />

      {/* 历史复盘研报沉淀 */}
      <AIHistoryPanel code={symbol} kind="hk_stock_ai" />
    </div>
  );
}
