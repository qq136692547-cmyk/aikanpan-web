"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sparkline } from "@/components/chart/sparkline";
import { HkWatchlistButton } from "./hk-watchlist-button";
import { StockThesisPanel } from "@/components/research/stock-thesis-panel";
import { AIHistoryPanel } from "@/components/ai/ai-history-panel";
import { AIEvidencePanel } from "@/components/ai/ai-evidence-panel";
import { formatPct, formatPrice, formatVolume } from "@/lib/format";
import { useAuth } from "@/lib/auth";
import { api, type AIComment, type HkFinancials, type HkHistory, type HkNewsItem, type HkQuote } from "@/lib/api";

export type HkStockDetailInitialData = {
  quote?: HkQuote | null;
  history?: HkHistory | null;
  financials?: HkFinancials | null;
  news?: HkNewsItem[];
};

function formatHkMarketCap(value?: number | null) {
  if (value == null) return "--";
  if (value >= 1_000_000_000_000) return `${(value / 1_000_000_000_000).toFixed(2)}万亿港元`;
  if (value >= 100_000_000) return `${(value / 100_000_000).toFixed(2)}亿港元`;
  return `HK$${Math.round(value).toLocaleString()}`;
}

export function HkStockDetail({ symbol, initialData }: { symbol: string; initialData?: HkStockDetailInitialData }) {
  const [quote, setQuote] = useState<HkQuote | null>(initialData?.quote ?? null);
  const [history, setHistory] = useState<HkHistory | null>(initialData?.history ?? null);
  const [financials, setFinancials] = useState<HkFinancials | null>(initialData?.financials ?? null);
  const [news, setNews] = useState<HkNewsItem[]>(initialData?.news ?? []);
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
      isAuthenticated ? api.getHkAI(symbol) : Promise.resolve(null),
    ]).then(([q, h, f, n, a]) => {
      if (cancelled) return;
      if (q.status === "fulfilled") setQuote(q.value);
      if (h.status === "fulfilled") setHistory(h.value);
      if (f.status === "fulfilled") setFinancials(f.value);
      if (n.status === "fulfilled") setNews(n.value.news);
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
          <h2 className="text-[14px] font-semibold text-neo-ink">关键指标</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">市盈率 PE</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink">{metrics.pe ?? "--"}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">市净率 PB</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink">{metrics.pb ?? "--"}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">52 周最高</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink">{metrics.high_52w != null ? formatPrice(metrics.high_52w) : "--"}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">52 周最低</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink">{metrics.low_52w != null ? formatPrice(metrics.low_52w) : "--"}</div>
            </div>
          </div>
          <p className="mt-2 text-[10px] text-neo-dim">市值 {formatHkMarketCap(metrics.market_cap)} · 来源 腾讯行情</p>
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

      <section className="neo-card p-5">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-neo-ink">AI 解读</h2>
          {ai && (
            <span className="flex items-center gap-1 text-[10px] text-neo-dim">
              <Bot size={12} />
              {ai.model}
            </span>
          )}
        </div>
        {aiLoading && !ai ? (
          <div className="mt-3 space-y-2">
            <div className="neo-skeleton h-3 w-full rounded" />
            <div className="neo-skeleton h-3 w-5/6 rounded" />
            <div className="neo-skeleton h-3 w-3/4 rounded" />
          </div>
        ) : ai ? (
          <>
            <div className="neo-inset mt-3 rounded-lg px-3 py-3">
              <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-neo-ink">
                <ReactMarkdown>{ai.content}</ReactMarkdown>
              </div>
            </div>
            <AIEvidencePanel evidence={ai.evidence} />
          </>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-neo-dim">{isAuthenticated ? "AI 解读暂不可用" : "登录后可查看 AI 解读"}</p>
            {isAuthenticated ? (
              <button
                onClick={() => window.location.reload()}
                className="neo-chip flex items-center gap-1 px-2 py-1 text-[10px] text-neo-mid"
              >
                <RefreshCw size={11} />
                重试
              </button>
            ) : (
              <a href="/account/" className="neo-chip px-2 py-1 text-[10px] text-neo-mid">去登录</a>
            )}
          </div>
        )}
      </section>

      <AIHistoryPanel code={symbol} kind="hk_stock_ai" />
    </div>
  );
}
