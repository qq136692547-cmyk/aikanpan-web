"use client";

import { useEffect, useState } from "react";
import { formatPct, formatPrice } from "@/lib/format";
import { MarketPageSection } from "@/components/market/market-page-shell";
import { api, type UsDashboard, type UsEarningsCalendarItem } from "@/lib/api";
import { usNameZh } from "@/lib/us-stock-names";
import { UsDailyReview } from "./us-daily-review";
import { UsWatchlistButton } from "./us-watchlist-button";

function trendClass(pct: number) {
  return pct > 0 ? "text-neo-up" : pct < 0 ? "text-neo-down" : "text-neo-mid";
}

function UsSectorBar({ sectors }: { sectors: NonNullable<UsDashboard["sectors"]> }) {
  if (!sectors.length) return null;
  return (
    <div className="flex flex-wrap gap-2">
      {sectors.map((s) => (
        <a key={s.code} href={`/stock/${s.code}/`} className={`neo-chip px-2.5 py-1 text-[12px] font-medium ${trendClass(s.change_pct ?? 0)}`}>
          {s.name}
          <span className="ml-1" style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatPct(s.change_pct ?? 0)}</span>
        </a>
      ))}
    </div>
  );
}

function UsNewsSection({ news }: { news: NonNullable<UsDashboard["market_news"]> }) {
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
            <p className="mt-0.5 line-clamp-1 text-[13px] leading-snug text-neo-ink">{n.title_zh || n.title}</p>
          </a>
        ))}
      </div>
    </section>
  );
}

function UsEarningsCalendar() {
  const [data, setData] = useState<UsEarningsCalendarItem[] | null>(null);
  useEffect(() => {
    api.getUsEarningsCalendar().then((d) => setData(d.calendar)).catch(() => {});
  }, []);
  if (!data?.length) return null;
  return (
    <section className="mt-4 neo-card p-5 neo-fade-up">
      <h2 className="text-[14px] font-semibold text-neo-ink">近期财报</h2>
      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {data.slice(0, 8).map((item) => (
          <a key={item.symbol} href={`/stock/${item.symbol}/`} className="neo-card-sm p-3 transition-all duration-200 hover:-translate-y-0.5">
            <div className="text-[13px] font-semibold text-neo-ink">{item.symbol}</div>
            <div className="mt-0.5 text-[11px] text-neo-mid">{usNameZh(item.name, item.symbol)} · {item.upcoming?.date || "待定"}</div>
            {item.upcoming?.eps_estimate != null && (
              <div className="text-[10px] text-neo-dim">EPS 预估 ${item.upcoming.eps_estimate.toFixed(2)}</div>
            )}
          </a>
        ))}
      </div>
    </section>
  );
}

export function UsDashboardSection({ dashboard, showReview = true }: { dashboard: UsDashboard; showReview?: boolean }) {
  const temp = dashboard.temperature;
  return (
    <div>
      {/* AI 结论 */}
      {showReview && <div className="neo-fade-up"><UsDailyReview /></div>}

      {/* 核心数字 — 和 A 股一致的独立网格 */}
      <MarketPageSection title="市场概览" className="mt-3">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 neo-fade-up">
        {dashboard.indices.map((idx) => (
          <a key={idx.code} href={`/stock/${idx.code}/`} className="neo-card-sm p-4">
            <div className="text-[10px] uppercase tracking-wider text-neo-dim">{idx.name}</div>
            <div className={`mt-1.5 text-[22px] font-bold tracking-tight ${trendClass(idx.change_pct ?? 0)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
              {formatPrice(idx.last)}
            </div>
            <div className={`mt-0.5 text-[12px] font-medium ${trendClass(idx.change_pct ?? 0)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
              {formatPct(idx.change_pct ?? 0)}
            </div>
          </a>
        ))}
        {temp && (
          <div className="neo-card-sm p-4">
            <div className="text-[10px] uppercase tracking-wider text-neo-dim">市场情绪</div>
            <div className={`mt-1.5 text-[22px] font-bold tracking-tight ${temp.score >= 60 ? "text-neo-up" : temp.score >= 35 ? "text-neo-mid" : "text-neo-down"}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
              {temp.score}
            </div>
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-[var(--neo-surface-inset)]">
              <div className={`h-full rounded-full ${temp.score >= 60 ? "bg-neo-up" : temp.score >= 35 ? "bg-neo-primary" : "bg-neo-down"} transition-all duration-500`} style={{ width: `${temp.score}%` }} />
            </div>
            <div className="mt-2 space-y-0.5 text-[10px] text-neo-dim">
              <div>指数动量 {(temp.index_momentum ?? 0) > 0 ? "+" : ""}{(temp.index_momentum ?? 0).toFixed(2)}%</div>
              <div>上涨板块 {temp.sectors_up ?? 0}/{temp.sectors_total ?? 0}</div>
              {(temp.vix_change ?? 0) !== 0 && <div>VIX {(temp.vix_change ?? 0) > 0 ? "+" : ""}{(temp.vix_change ?? 0).toFixed(1)}%</div>}
            </div>
          </div>
        )}
        </div>
      </MarketPageSection>

      {/* 板块表现 — 和 A 股强势行业同款 */}
      {dashboard.sectors && dashboard.sectors.length > 0 && (
        <MarketPageSection title="行业/板块表现">
          <div className="neo-card p-5 neo-fade-up">
            <UsSectorBar sectors={dashboard.sectors} />
          </div>
        </MarketPageSection>
      )}

      {/* 近期财报 */}
      <UsEarningsCalendar />

      {/* 市场资讯 */}
      {dashboard.market_news && dashboard.market_news.length > 0 && (
        <UsNewsSection news={dashboard.market_news_zh ?? dashboard.market_news} />
      )}

      {/* 热门美股 */}
      <section className="mt-4 neo-card p-5 neo-fade-up">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-[14px] font-semibold text-neo-ink">热门美股</h2>
        </div>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {dashboard.stocks.map((s) => (
            <div key={s.code} className="neo-card-sm p-3">
              <div className="flex items-center justify-between gap-2">
                <a href={`/stock/${s.code}/`} className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-neo-ink">{usNameZh(s.name, s.code)}</span>
                  <span className="block text-[10px] text-neo-dim">{s.code}</span>
                </a>
                <UsWatchlistButton code={s.code} name={usNameZh(s.name, s.code)} />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-[18px] font-bold text-neo-ink">{formatPrice(s.last)}</span>
                <span className={`text-[12px] font-semibold ${trendClass(s.change_pct ?? 0)}`}>
                  {formatPct(s.change_pct ?? 0)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

