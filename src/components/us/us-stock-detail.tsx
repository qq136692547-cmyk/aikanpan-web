"use client";

import { useEffect, useState } from "react";
import { Bot, ExternalLink, FileText, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sparkline } from "@/components/chart/sparkline";
import { UsWatchlistButton } from "./us-watchlist-button";
import { StockThesisPanel } from "@/components/research/stock-thesis-panel";
import { AIHistoryPanel } from "@/components/ai/ai-history-panel";
import { AIEvidencePanel } from "@/components/ai/ai-evidence-panel";
import { AIComment as StockAIComment } from "@/components/ai/ai-comment";
import { formatPct, formatPrice, formatVolume } from "@/lib/format";
import { usNameZh } from "@/lib/us-stock-names";
import { useAuth } from "@/lib/auth";
import { api, type AIComment, type UsEarnings, type UsFilings, type UsFinancials, type UsHistory, type UsNewsItem, type UsQuote } from "@/lib/api";

export type UsStockDetailInitialData = {
  quote?: UsQuote | null;
  history?: UsHistory | null;
  financials?: UsFinancials | null;
  earnings?: UsEarnings | null;
  news?: UsNewsItem[];
  filings?: UsFilings | null;
};

function formatUsMarketCap(millions?: number) {
  if (millions == null) return "";
  const usd = millions * 1_000_000;
  if (usd >= 1_000_000_000_000) return `${(usd / 1_000_000_000_000).toFixed(2)}万亿美元`;
  if (usd >= 100_000_000) return `${(usd / 100_000_000).toFixed(2)}亿美元`;
  return `$${Math.round(usd).toLocaleString()}`;
}

const FILING_LABELS: Record<string, string> = {
  "10-K": "年报",
  "10-Q": "季报",
  "8-K": "重大事项",
  "DEF 14A": "股东会文件",
  "20-F": "境外年报",
  "40-F": "境外年报",
  "6-K": "境外中期报告",
};

function filingLabel(form: string) {
  const amendment = form.trim().toUpperCase().endsWith("/A");
  const base = form.trim().toUpperCase().replace(/\/A$/, "");
  return `${FILING_LABELS[base] || base}${amendment ? "（修订）" : ""}`;
}

export function UsStockDetail({ symbol, initialData }: { symbol: string; initialData?: UsStockDetailInitialData }) {
  const [quote, setQuote] = useState<UsQuote | null>(initialData?.quote ?? null);
  const [history, setHistory] = useState<UsHistory | null>(initialData?.history ?? null);
  const [financials, setFinancials] = useState<UsFinancials | null>(initialData?.financials ?? null);
  const [earnings, setEarnings] = useState<UsEarnings | null>(initialData?.earnings ?? null);
  const [news, setNews] = useState<UsNewsItem[]>(initialData?.news ?? []);
  const [filings, setFilings] = useState<UsFilings | null>(initialData?.filings ?? null);
  const [ai, setAi] = useState<AIComment | null>(null);
  const [aiLoading, setAiLoading] = useState(true);
  const { isAuthenticated } = useAuth();

  useEffect(() => {
    let cancelled = false;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    // Reset the loading state when the requested symbol changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setAiLoading(true);
    Promise.allSettled([
      api.getUsQuote(symbol),
      api.getUsHistory(symbol, 120),
      api.getUsFinancials(symbol),
      api.getUsNews(symbol, 8),
      isAuthenticated ? api.getUsAI(symbol) : Promise.resolve(null),
      api.getUsEarnings(symbol),
      api.getUsFilings(symbol, 12),
    ]).then(([q, h, f, n, a, e, l]) => {
      if (cancelled) return;
      if (q.status === "fulfilled") setQuote(q.value);
      if (h.status === "fulfilled") setHistory(h.value);
      if (f.status === "fulfilled") setFinancials(f.value);
      if (n.status === "fulfilled") {
        setNews(n.value.news);
        if (n.value.news.slice(0, 6).some((item) => !item.title_zh)) {
          retryTimer = setTimeout(() => {
            api.getUsNews(symbol, 8).then((retry) => {
              if (!cancelled) setNews(retry.news);
            }).catch(() => {});
          }, 8000);
        }
      }
      if (a.status === "fulfilled") setAi(a.value);
      if (e.status === "fulfilled") setEarnings(e.value);
      if (l.status === "fulfilled") setFilings(l.value);
      setAiLoading(false);
    });
    return () => {
      clearTimeout(retryTimer);
      cancelled = true;
    };
  }, [symbol, isAuthenticated]);

  const trend = (quote?.change_pct ?? 0) > 0 ? 1 : (quote?.change_pct ?? 0) < 0 ? -1 : 0;

  return (
    <div className="space-y-4">
      <section className="neo-card p-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-[22px] font-bold tracking-tight text-neo-ink">{usNameZh(quote?.name, symbol)}</h1>
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
          <UsWatchlistButton code={symbol} name={usNameZh(quote?.name, symbol)} />
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
              { label: "市值", value: quote.market_cap ?? 0, fmt: formatUsMarketCap },
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

      {filings?.available && filings.filings.length > 0 && (
        <section className="neo-card p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="text-[14px] font-semibold text-neo-ink">SEC 官方披露</h2>
            <span className="text-[10px] text-neo-dim">最近 {filings.count} 条</span>
          </div>
          <p className="mt-1 text-[10px] text-neo-dim">来源：SEC EDGAR 官方文件，点击可查看原文</p>
          <div className="mt-3 space-y-2">
            {filings.filings.slice(0, 10).map((filing) => (
              <a
                key={filing.id}
                href={filing.document_url}
                target="_blank"
                rel="noopener noreferrer"
                className="neo-inset flex items-start gap-3 rounded-lg px-3 py-2.5 transition-colors hover-neo-inset"
              >
                <div className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-neo-primary-soft text-neo-primary">
                  <FileText size={13} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded bg-neo-primary-soft px-1.5 py-0.5 text-[10px] font-semibold text-neo-primary">{filing.form}</span>
                    <span className="text-[12px] font-medium text-neo-ink">{filingLabel(filing.form)}</span>
                  </div>
                  {(filing.description || filing.items) && (
                    <div className="mt-1 truncate text-[11px] text-neo-mid">
                      {filing.description || `事项代码 ${filing.items}`}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] text-neo-dim">
                    {filing.filing_date}
                    {filing.report_date ? ` · 报告期 ${filing.report_date}` : ""}
                  </div>
                </div>
                <ExternalLink size={12} className="mt-1 shrink-0 text-neo-dim" />
              </a>
            ))}
          </div>
          {filings.source_url && (
            <a
              href={filings.source_url}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex items-center gap-1 text-[11px] text-neo-primary transition-opacity hover:opacity-80"
            >
              在 SEC EDGAR 查看全部披露
              <ExternalLink size={11} />
            </a>
          )}
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

      <StockAIComment code={symbol} market="us" initialData={ai} />

      <AIHistoryPanel code={symbol} kind="us_stock_ai" />
    </div>
  );
}
