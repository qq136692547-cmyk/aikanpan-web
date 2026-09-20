"use client";

import { formatPct, formatPrice } from "@/lib/format";
import { MarketPageSection } from "@/components/market/market-page-shell";
import { type HkDashboard, type HkNewsItem, type HkQuote } from "@/lib/api";
import { HkDailyReview } from "./hk-daily-review";
import { HkWatchlistButton } from "./hk-watchlist-button";

function trendClass(pct: number) {
  return pct > 0 ? "text-neo-up" : pct < 0 ? "text-neo-down" : "text-neo-mid";
}

function HkNewsSection({ news }: { news: HkNewsItem[] }) {
  if (!news.length) return null;
  return (
    <section className="mt-4 neo-card p-5 neo-fade-up">
      <h2 className="text-[14px] font-semibold text-neo-ink">市场资讯</h2>
      <div className="mt-3 space-y-2">
        {news.slice(0, 6).map((n) => (
          <a key={n.id || n.title} href={n.url || "#"} target="_blank" rel="noopener noreferrer" className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--neo-surface-hover)]">
            <div className="flex items-center gap-2 text-[10px] text-neo-dim">
              <span className="font-medium text-neo-primary">{n.source || "资讯"}</span>
              {n.time && <span>{n.time}</span>}
            </div>
            <p className="mt-0.5 line-clamp-1 text-[13px] leading-snug text-neo-ink">{n.title}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function HkMoverList({ title, rows, tone }: { title: string; rows: HkQuote[]; tone: "up" | "down" }) {
  if (!rows.length) return null;
  const color = tone === "up" ? "text-neo-up" : "text-neo-down";
  return (
    <div className="neo-card-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-[12px] font-medium text-neo-ink">{title}</h3>
        <span className={`text-[11px] ${color}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>{rows.length} 只</span>
      </div>
      <div className="divide-y divide-[var(--neo-edge)]">
        {rows.map((stock) => (
          <a key={stock.code} href={`/stock/${stock.code}/`} className="flex min-h-11 items-center gap-2 px-3 py-1.5 transition-colors hover-neo-inset">
            <div className="flex min-w-0 flex-1 flex-col">
              <span className="truncate text-[13px] font-medium text-neo-ink">{stock.name || stock.code}</span>
              <span className="text-[10px] text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>{stock.code}</span>
            </div>
            <span className={`text-[13px] ${color}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatPrice(stock.last)}</span>
            <span className={`w-16 text-right text-[13px] ${color}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatPct(stock.change_pct)}</span>
          </a>
        ))}
      </div>
    </div>
  );
}

export function HkDashboardSection({ dashboard, showReview = true }: { dashboard: HkDashboard; showReview?: boolean }) {
  return (
    <div>
      {showReview && <div className="neo-fade-up"><HkDailyReview /></div>}

      <MarketPageSection title="市场概览" className="mt-3">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3 neo-fade-up">
          {dashboard.indices.map((idx) => (
            <a key={idx.code} href={`/stock/${idx.code}/`} className="neo-card-sm p-4">
              <div className="text-[10px] uppercase tracking-wider text-neo-dim">{idx.name}</div>
              <div className={`mt-1.5 text-[22px] font-bold tracking-tight ${trendClass(idx.change_pct)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {formatPrice(idx.last)}
              </div>
              <div className={`mt-0.5 text-[12px] font-medium ${trendClass(idx.change_pct)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {formatPct(idx.change_pct)}
              </div>
            </a>
          ))}
        </div>
      </MarketPageSection>

      <MarketPageSection title="涨跌排行">
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          <HkMoverList title="领涨" rows={dashboard.top_gainers || []} tone="up" />
          <HkMoverList title="领跌" rows={dashboard.top_losers || []} tone="down" />
        </div>
      </MarketPageSection>

      {dashboard.market_news && dashboard.market_news.length > 0 && (
        <HkNewsSection news={dashboard.market_news} />
      )}

      <section className="mt-4 neo-card p-5 neo-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-neo-ink">热门港股</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {(dashboard.hot_stocks || []).map((s) => (
            <div key={s.code} className="neo-card-sm p-3">
              <div className="flex items-center justify-between gap-2">
                <a href={`/stock/${s.code}/`} className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-neo-ink">{s.name || s.code}</span>
                  <span className="block text-[10px] text-neo-dim">{s.code}</span>
                </a>
                <HkWatchlistButton code={s.code} name={s.name || s.code} />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-[18px] font-bold text-neo-ink">{formatPrice(s.last)}</span>
                <span className={`text-[12px] font-semibold ${trendClass(s.change_pct)}`}>
                  {formatPct(s.change_pct)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
