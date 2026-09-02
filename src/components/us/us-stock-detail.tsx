"use client";

import { useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sparkline } from "@/components/chart/sparkline";
import { UsWatchlistButton } from "./us-watchlist-button";
import { StockThesisPanel } from "@/components/research/stock-thesis-panel";
import { formatPct, formatPrice } from "@/lib/format";
import { api, type AIComment, type UsEarnings, type UsFinancials, type UsHistory, type UsNewsItem, type UsQuote } from "@/lib/api";

function formatUsMarketCap(millions?: number) {
  if (millions == null) return "";
  const usd = millions * 1_000_000;
  if (usd >= 1_000_000_000_000) return `${(usd / 1_000_000_000_000).toFixed(2)}万亿美元`;
  if (usd >= 100_000_000) return `${(usd / 100_000_000).toFixed(2)}亿美元`;
  return `$${Math.round(usd).toLocaleString()}`;
}

export function UsStockDetail({ symbol }: { symbol: string }) {
  const [quote, setQuote] = useState<UsQuote | null>(null);
  const [history, setHistory] = useState<UsHistory | null>(null);
  const [financials, setFinancials] = useState<UsFinancials | null>(null);
  const [earnings, setEarnings] = useState<UsEarnings | null>(null);
  const [news, setNews] = useState<UsNewsItem[]>([]);
  const [ai, setAi] = useState<AIComment | null>(null);
  const [aiLoading, setAiLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Reset the loading state when the requested symbol changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAiLoading(true);
    Promise.allSettled([
      api.getUsQuote(symbol),
      api.getUsHistory(symbol, 120),
      api.getUsFinancials(symbol),
      api.getUsNews(symbol, 8),
      api.getUsAI(symbol),
      api.getUsEarnings(symbol),
    ]).then(([q, h, f, n, a, e]) => {
      if (cancelled) return;
      if (q.status === "fulfilled") setQuote(q.value);
      if (h.status === "fulfilled") setHistory(h.value);
      if (f.status === "fulfilled") setFinancials(f.value);
      if (n.status === "fulfilled") setNews(n.value.news);
      if (a.status === "fulfilled") setAi(a.value);
      if (e.status === "fulfilled") setEarnings(e.value);
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

      {(earnings?.earnings?.length ?? 0) > 0 || earnings?.upcoming ? (
        <section className="neo-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-neo-ink">财报与盈利</h2>
            {quote?.market_cap != null && <span className="text-[10px] text-neo-dim">市值 {formatUsMarketCap(quote.market_cap)}</span>}
          </div>
          <div className="mt-3 space-y-2">
            {(earnings?.earnings || []).slice(0, 4).map((e) => (
              <div key={e.period} className="neo-card-sm flex flex-wrap items-center gap-x-4 gap-y-1 px-3 py-2">
                <span className="text-[11px] font-medium text-neo-ink">{e.period}</span>
                <span className="text-[10px] text-neo-dim">实际 EPS <b className="text-neo-ink">{e.actual ?? "--"}</b></span>
                <span className="text-[10px] text-neo-dim">预期 EPS <b className="text-neo-ink">{e.estimate ?? "--"}</b></span>
                <span className={`text-[10px] ${(e.surprise_percent ?? 0) >= 0 ? "text-neo-up" : "text-neo-down"}`}>超预期 {(e.surprise_percent ?? 0).toFixed(1)}%</span>
              </div>
            ))}
            {earnings?.upcoming && (
              <div className="neo-inset px-3 py-2 text-[11px] text-neo-mid">
                下次财报：{earnings.upcoming.date}（{earnings.upcoming.quarter}Q{earnings.upcoming.year ?? ""}）EPS 预期 {earnings.upcoming.eps_estimate ?? "--"}
              </div>
            )}
            {!financials?.available && (
              <p className="text-[10px] text-neo-dim">财务指标免费档暂不可用，盈利数据来自 Finnhub 免费档</p>
            )}
          </div>
        </section>
      ) : null}

      {news.length > 0 && (
        <section className="neo-card p-5">
          <h2 className="text-[14px] font-semibold text-neo-ink">相关新闻</h2>
          {news.slice(0, 6).some((n) => !n.title_zh) && <p className="mt-1 text-[10px] text-neo-dim">AI 中文标题生成中，稍后刷新后显示中文。</p>}
          <div className="mt-3 space-y-2">
            {news.slice(0, 6).map((n) => (
              <a key={n.id} href={n.url} target="_blank" rel="noopener noreferrer" className="block neo-card-sm p-3 transition-colors hover-neo-inset">
                <div className="text-[12px] font-medium text-neo-ink">{n.title_zh || n.title}</div>
                {n.title_zh && n.title !== n.title_zh && <div className="mt-0.5 text-[10px] text-neo-dim">{n.title}</div>}
                <div className="mt-1 text-[10px] text-neo-dim">{n.source} · {n.time}</div>
              </a>
            ))}
          </div>
        </section>
      )}

      <StockThesisPanel code={symbol} market="us" />

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
