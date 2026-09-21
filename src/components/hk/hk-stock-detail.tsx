"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sparkline } from "@/components/chart/sparkline";
import { HkWatchlistButton } from "./hk-watchlist-button";
import { StockThesisPanel } from "@/components/research/stock-thesis-panel";
import { AIHistoryPanel } from "@/components/ai/ai-history-panel";
import { AIEvidencePanel } from "@/components/ai/ai-evidence-panel";
import { AIComment as StockAIComment } from "@/components/ai/ai-comment";
import { formatPct, formatPrice, formatVolume } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { api, type AIComment, type HkFinancials, type HkHistory, type HkNewsItem, type HkQuote, type StockIndicators } from "@/lib/api";

export type HkStockDetailInitialData = {
  quote?: HkQuote | null;
  history?: HkHistory | null;
  financials?: HkFinancials | null;
  news?: HkNewsItem[];
  indicators?: StockIndicators | null;
};

function formatHkMarketCap(value?: number | null) {
  if (value == null) return "--";
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}万亿港元`;
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}亿港元`;
  return `HK$${Math.round(value).toLocaleString()}`;
}

function latestValue(value: number | number[] | null | undefined): number {
  if (value == null) return 0;
  if (Array.isArray(value)) {
    const vals = value.filter((v) => typeof v === "number" && Number.isFinite(v));
    return vals.length ? vals[vals.length - 1] : 0;
  }
  return Number.isFinite(value) ? value : 0;
}

export function HkStockDetail({ symbol, initialData }: { symbol: string; initialData?: HkStockDetailInitialData }) {
  const [quote, setQuote] = useState<HkQuote | null>(initialData?.quote ?? null);
  const [history, setHistory] = useState<HkHistory | null>(initialData?.history ?? null);
  const [financials, setFinancials] = useState<HkFinancials | null>(initialData?.financials ?? null);
  const [news, setNews] = useState<HkNewsItem[]>(initialData?.news ?? []);
  const [indicators, setIndicators] = useState<StockIndicators | null>(initialData?.indicators ?? null);
  const [ai, setAi] = useState<AIComment | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let cancelled = false;
    // Reset the loading state when the requested symbol changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAiLoading(true);
    Promise.allSettled([
      api.getHkQuote(symbol),
      api.getHkHistory(symbol, 120),
      api.getHkFinancials(symbol),
      api.getHkNews(symbol, 8),
      api.getHkIndicators(symbol, 120),
      isAuthenticated ? api.getHkAI(symbol) : Promise.resolve(null),
    ]).then(([q, h, f, n, ind, a]) => {
      if (cancelled) return;
      if (q.status === "fulfilled") setQuote(q.value);
      if (h.status === "fulfilled") setHistory(h.value);
      if (f.status === "fulfilled") setFinancials(f.value);
      if (n.status === "fulfilled") setNews(n.value.news);
      if (ind.status === "fulfilled") setIndicators(ind.value);
      if (a.status === "fulfilled") setAi(a.value);
      setAiLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol, isAuthenticated]);

  const trend = (quote?.change_pct ?? 0) > 0 ? 1 : (quote?.change_pct ?? 0) < 0 ? -1 : 0;
  const metrics = financials?.metrics;

  return (
    <div className="space-y-4">
      <section className="neo-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-tight text-neo-ink">{quote?.name || symbol}</h1>
              <span className="text-[11px] text-neo-dim">{symbol} · HKD</span>
            </div>
            <div className="mt-2 flex flex-wrap items-baseline gap-3">
              <span className={`text-[32px] font-bold ${trend > 0 ? "text-neo-up" : trend < 0 ? "text-neo-down" : "text-neo-ink"}`}>
                {formatPrice(quote?.last ?? 0)}
              </span>
              <span className={`text-[14px] font-semibold ${trend > 0 ? "text-neo-up" : trend < 0 ? "text-neo-down" : "text-neo-mid"}`}>
                {formatPct(quote?.change_pct ?? 0)}
              </span>
            </div>
            <div className="mt-1 text-[11px] text-neo-dim">
              {quote?.source === "unavailable" ? "数据暂不可用" : `${quote?.source ?? ""} · ${quote?.currency ?? "HKD"}`}
            </div>
          </div>
          <HkWatchlistButton code={symbol} name={quote?.name || symbol} />
        </div>
        <Sparkline data={history?.closes ?? []} trend={trend} height={48} className="mt-3 w-full" />
      </section>

      {quote && (
        <section className="neo-card p-5">
          <h2 className="text-[14px] font-semibold text-neo-ink">行情数据</h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: "今开", value: quote.open ?? 0, fmt: formatPrice },
              { label: "最高", value: quote.high ?? 0, fmt: formatPrice, color: "text-neo-up" },
              { label: "最低", value: quote.low ?? 0, fmt: formatPrice, color: "text-neo-down" },
              { label: "昨收", value: quote.prev_close ?? 0, fmt: formatPrice },
              { label: "成交量", value: quote.volume ?? 0, fmt: formatVolume },
              { label: "成交额", value: quote.amount ?? 0, fmt: formatHkMarketCap },
            ].map((item) => (
              <div key={item.label} className="neo-inset-sm px-3 py-2.5">
                <div className="text-[10px] uppercase tracking-wider text-neo-dim">{item.label}</div>
                <div className={`mt-1 text-[14px] font-semibold ${item.color || "text-neo-ink"}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                  {item.fmt(item.value)}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {financials?.available && metrics && (
        <section className="neo-card p-5">
          <h2 className="text-[14px] font-semibold text-neo-ink">关键估值与财务</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">市盈率 PE</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink font-mono">{metrics.pe ?? "--"}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">市净率 PB</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink font-mono">{metrics.pb ?? "--"}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">股息率</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-up font-mono">{metrics.dividend_yield != null ? `${metrics.dividend_yield.toFixed(2)}%` : (quote?.dividend_yield != null ? `${quote.dividend_yield.toFixed(2)}%` : "--")}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">每股收益 EPS</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink font-mono">{metrics.eps != null ? `HK$${metrics.eps.toFixed(3)}` : (quote?.eps != null ? `HK$${quote.eps.toFixed(3)}` : "--")}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">每股净资产 BPS</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink font-mono">{metrics.bps != null ? `HK$${metrics.bps.toFixed(3)}` : (quote?.bps != null ? `HK$${quote.bps.toFixed(3)}` : "--")}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">日振幅</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-amber font-mono">{metrics.amplitude != null ? `${metrics.amplitude.toFixed(2)}%` : (quote?.amplitude != null ? `${quote.amplitude.toFixed(2)}%` : "--")}</div>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[10px] text-neo-dim">
            <span>52周范围: {metrics.low_52w != null ? formatPrice(metrics.low_52w) : "--"} ~ {metrics.high_52w != null ? formatPrice(metrics.high_52w) : "--"}</span>
            <span>市值 {formatHkMarketCap(metrics.market_cap)} · 来源 腾讯行情</span>
          </div>
        </section>
      )}

      {/* 港股技术指标网格 */}
      {indicators && (
        <section className="neo-card p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-[14px] font-semibold text-neo-ink">技术指标分析</h2>
            <span className="text-[11px] text-neo-dim">日线级别 · 120日K线测算</span>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {indicators.macd && (
              <div className="neo-card-sm p-3">
                <div className="text-[10px] font-semibold text-neo-dim">MACD (12, 26, 9)</div>
                <div className="mt-1 space-y-0.5 text-[12px] font-mono">
                  <div className="flex justify-between"><span className="text-neo-dim">DIF</span><span>{latestValue(indicators.macd.dif).toFixed(3)}</span></div>
                  <div className="flex justify-between"><span className="text-neo-dim">DEA</span><span>{latestValue(indicators.macd.dea).toFixed(3)}</span></div>
                  <div className="flex justify-between"><span className="text-neo-dim">柱</span><span className={latestValue(indicators.macd.macd) >= 0 ? "text-neo-up" : "text-neo-down"}>{latestValue(indicators.macd.macd).toFixed(3)}</span></div>
                </div>
              </div>
            )}
            {indicators.kdj && (
              <div className="neo-card-sm p-3">
                <div className="text-[10px] font-semibold text-neo-dim">KDJ (9, 3, 3)</div>
                <div className="mt-1 space-y-0.5 text-[12px] font-mono">
                  <div className="flex justify-between"><span className="text-neo-dim">K</span><span>{latestValue(indicators.kdj.k).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-neo-dim">D</span><span>{latestValue(indicators.kdj.d).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-neo-dim">J</span><span className={latestValue(indicators.kdj.j) >= 0 ? "text-neo-up" : "text-neo-down"}>{latestValue(indicators.kdj.j).toFixed(2)}</span></div>
                </div>
              </div>
            )}
            {indicators.rsi != null && (
              <div className="neo-card-sm p-3">
                <div className="text-[10px] font-semibold text-neo-dim">RSI 强弱指标 (14)</div>
                <div className="mt-2 text-[18px] font-extrabold text-neo-ink font-mono">{latestValue(indicators.rsi).toFixed(2)}</div>
                <div className="mt-1 text-[10px] text-neo-dim">
                  {latestValue(indicators.rsi) >= 80 ? "严重超买" : latestValue(indicators.rsi) <= 20 ? "严重超卖" : "中性震荡区间"}
                </div>
              </div>
            )}
            {indicators.boll && (
              <div className="neo-card-sm p-3">
                <div className="text-[10px] font-semibold text-neo-dim">BOLL 布林带 (20, 2)</div>
                <div className="mt-1 space-y-0.5 text-[11px] font-mono">
                  <div className="flex justify-between"><span className="text-neo-dim">上轨</span><span>{latestValue(indicators.boll.upper).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-neo-dim">中轨</span><span>{latestValue(indicators.boll.mid).toFixed(2)}</span></div>
                  <div className="flex justify-between"><span className="text-neo-dim">下轨</span><span>{latestValue(indicators.boll.lower).toFixed(2)}</span></div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {news.length > 0 && (
        <section className="neo-card p-5">
          <h2 className="text-[14px] font-semibold text-neo-ink">相关新闻</h2>
          <div className="mt-3 space-y-2">
            {news.slice(0, 6).map((n) => (
              <a key={n.id || n.title} href={n.url || "#"} target="_blank" rel="noopener noreferrer" className="block neo-card-sm p-3 transition-colors hover-neo-inset">
                <div className="text-[12px] font-medium text-neo-ink">{n.title}</div>
                {n.summary && <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-neo-mid">{n.summary}</p>}
                <div className="mt-1 text-[10px] text-neo-dim">{n.source} · {n.time}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      <StockThesisPanel code={symbol} market="hk" />

      <StockAIComment code={symbol} market="hk" initialData={ai} />

      <AIHistoryPanel code={symbol} kind="hk_stock_ai" />
    </div>
  );
}
