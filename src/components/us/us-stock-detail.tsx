"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sparkline } from "@/components/chart/sparkline";
import { UsWatchlistButton } from "./us-watchlist-button";
import { formatPct, formatPrice } from "@/lib/format";
import { api, type AIComment, type UsFinancials, type UsHistory, type UsNewsItem, type UsQuote } from "@/lib/api";

export function UsStockDetail({ symbol }: { symbol: string }) {
  const [quote, setQuote] = useState<UsQuote | null>(null);
  const [history, setHistory] = useState<UsHistory | null>(null);
  const [financials, setFinancials] = useState<UsFinancials | null>(null);
  const [news, setNews] = useState<UsNewsItem[]>([]);
  const [ai, setAi] = useState<AIComment | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    Promise.allSettled([
      api.getUsQuote(symbol),
      api.getUsHistory(symbol, 120),
      api.getUsFinancials(symbol),
      api.getUsNews(symbol, 8),
      api.getUsAI(symbol),
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
  }, [symbol]);

  const trend = (quote?.change_pct ?? 0) > 0 ? 1 : (quote?.change_pct ?? 0) < 0 ? -1 : 0;

  return (
    <div className="space-y-4">
      <section className="neo-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-tight text-neo-ink">{quote?.name ?? symbol}</h1>
              <span className="text-[11px] text-neo-dim">{symbol} · USD</span>
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
              {quote?.source === "unavailable" ? "数据暂不可用" : `${quote?.source ?? ""} · ${quote?.date ?? ""}`}
            </div>
          </div>
          <UsWatchlistButton code={symbol} name={quote?.name} />
        </div>
        <Sparkline data={history?.closes ?? []} trend={trend} height={48} className="mt-3 w-full" />
      </section>

      {financials?.available && (
        <section className="neo-card p-5">
          <h2 className="text-[14px] font-semibold text-neo-ink">关键指标</h2>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">市盈率 PE</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink">{financials.metrics?.pe_ratio ?? "--"}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">市净率 PB</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink">{financials.metrics?.pb_ratio ?? "--"}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">ROE</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink">
                {financials.metrics?.roe_pct != null ? `${(financials.metrics.roe_pct * 100).toFixed(2)}%` : "--"}
              </div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[10px] text-neo-dim">毛利率</div>
              <div className="mt-1 text-[15px] font-semibold text-neo-ink">
                {financials.metrics?.gross_margin_pct != null ? `${(financials.metrics.gross_margin_pct * 100).toFixed(2)}%` : "--"}
              </div>
            </div>
          </div>
        </section>
      )}

      {news.length > 0 && (
        <section className="neo-card p-5">
          <h2 className="text-[14px] font-semibold text-neo-ink">相关新闻</h2>
          <div className="mt-3 space-y-2">
            {news.slice(0, 6).map((n) => (
              <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block neo-card-sm p-3 transition-colors hover-neo-inset">
                <div className="text-[12px] font-medium text-neo-ink">{n.title}</div>
                <div className="mt-1 text-[10px] text-neo-dim">{n.source} · {n.time}</div>
              </a>
            ))}
          </div>
        </section>
      )}

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
          <div className="neo-inset mt-3 rounded-lg px-3 py-3">
            <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-neo-ink">
              <ReactMarkdown>{ai.content}</ReactMarkdown>
            </div>
          </div>
        ) : (
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-[11px] text-neo-dim">AI 解读暂不可用</p>
            <button
              onClick={() => window.location.reload()}
              className="neo-chip flex items-center gap-1 px-2 py-1 text-[10px] text-neo-mid"
            >
              <RefreshCw size={11} />
              重试
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
