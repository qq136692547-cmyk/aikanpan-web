/**
 * 爱看盘 — 市场组件库
 * Neomorphism style, neo panel system
 */
import React from "react";
import { formatPrice, formatPct, formatChange, trendClass, trendBgClass, normalizeStockCode } from "@/lib/format";
import type { IndexData, LimitStock, StrongIndustry, NewsItem, AIScoreItem } from "@/lib/api";
import { AIScoreBadge, AIScoreBadgeSkeleton, AIScoreBadgeEmpty } from "@/components/ai/ai-score-badge";

export function IndexCard({ data }: { data: IndexData }) {
  const trend = trendClass(data.change_pct);
  const bgTrend = trendBgClass(data.change_pct);
  return (
    <div className="neo-card-sm p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-[15px] font-semibold text-neo-ink">{data.name}</span>
          <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-[11px] text-neo-dim">{data.code}</span>
        </div>
        <span className={`rounded-md px-2 py-0.5 text-[12px] font-medium ${bgTrend} ${trend}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
          {formatPct(data.change_pct)}
        </span>
      </div>
      <div className="mt-4 flex items-baseline gap-3">
        <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`text-[32px] font-bold tracking-tighter ${trend}`}>{formatPrice(data.last)}</span>
        <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`text-[14px] ${trend}`}>{formatChange(data.change)}</span>
      </div>
      <div className="mt-2 text-[11px] text-neo-dim">{data.date} · {data.source}</div>
    </div>
  );
}

export function LimitStockList({
  title, stocks, type, delay = 0, scores = {}, scoreLoading = false,
  mineCodes = new Set<string>(), badges = {}, emptyText = "",
}: {
  title: string; stocks: LimitStock[]; type: "up" | "down";
  delay?: number; scores?: Record<string, AIScoreItem>; scoreLoading?: boolean;
  mineCodes?: Set<string>; badges?: Record<string, string[]>; emptyText?: string;
}) {
  const headerColor = type === "up" ? "text-neo-up" : "text-neo-down";
  const hasScores = Object.keys(scores).length > 0 || scoreLoading;
  return (
    <div className="neo-card-sm overflow-hidden">
      <div className="flex items-center justify-between px-5 py-2.5">
        <h3 className="text-[13px] font-semibold text-neo-ink">{title}</h3>
        <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`text-[12px] font-medium ${headerColor}`}>{stocks.length}</span>
      </div>
      <div>
        <div className={`grid ${hasScores ? "grid-cols-[1fr_64px_56px_40px_38px] sm:grid-cols-[1fr_80px_64px_48px_40px]" : "grid-cols-[1fr_72px_56px_40px] sm:grid-cols-[1fr_90px_72px_56px]"} gap-2 px-3 py-1.5 text-[10px] uppercase tracking-wider text-neo-dim sm:px-5`}>
          <span>名称 / 代码</span>
          <span className="text-right">价格</span>
          <span className="text-right">涨跌幅</span>
          {!hasScores && <span className="text-right">类型</span>}
          {hasScores && <span className="text-center">AI</span>}
        </div>
        {stocks.map((s) => {
          const t = trendClass(s.pct);
          const normalized = normalizeStockCode(s.code);
          const mine = mineCodes.has(normalized);
          const rowBadges = badges[normalized] || [];
          return (
            <a
              key={s.code}
              href={`/stock/${s.code.replace(/\./, "")}/`}
              className={`transition-colors hover-neo-inset grid ${hasScores ? "grid-cols-[1fr_64px_56px_40px_38px] sm:grid-cols-[1fr_80px_64px_48px_40px]" : "grid-cols-[1fr_72px_56px_40px] sm:grid-cols-[1fr_90px_72px_56px]"} items-center gap-2 px-3 py-2 text-[13px] sm:px-5 ${mine ? "bg-[var(--neo-surface-active)]/60" : ""}`}
            >
              <div className="flex min-w-0 flex-col">
                <div className="flex min-w-0 items-center gap-1.5">
                  <span className="truncate text-[13px] font-medium text-neo-ink">{s.name}</span>
                  {rowBadges.map((b) => (
                    <span key={b} className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold ${b === "持仓" ? "bg-[var(--neo-amber)]/15 text-[var(--neo-amber)]" : "bg-[var(--neo-primary)]/15 text-[var(--neo-primary)]"}`}>{b}</span>
                  ))}
                </div>
                <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-[10px] text-neo-dim">{s.code}</span>
              </div>
              <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`text-right text-[13px] ${t}`}>{formatPrice(s.price)}</span>
              <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`text-right text-[12px] ${t}`}>{formatPct(s.pct)}</span>
              {!hasScores && (
                <span className="text-right">
                  <span className="neo-inset rounded px-1.5 py-0.5 text-[10px] text-neo-mid">{s.tag}</span>
                </span>
              )}
              {hasScores && (
                <span className="flex justify-center">
                  {scoreLoading && !scores[s.code] ? <AIScoreBadgeSkeleton /> : scores[s.code] ? <AIScoreBadge item={scores[s.code]} /> : <AIScoreBadgeEmpty />}
                </span>
              )}
            </a>
          );
        })}
        {stocks.length === 0 && emptyText && (
          <div className="px-5 py-8 text-center text-[12px] text-neo-dim">{emptyText}</div>
        )}
      </div>
    </div>
  );
}

export function IndustryCard({ industries }: { industries: StrongIndustry[]; delay?: number }) {
  const maxPct = Math.max(...industries.map((i) => Math.abs(i.change_pct)), 0.1);
  return (
    <div className="neo-card-sm h-full p-5">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-neo-ink">强势行业</h3>
        <span className="text-[10px] uppercase tracking-wider text-neo-dim">TOP {industries.length}</span>
      </div>
      <div className="space-y-0.5">
        {industries.map((ind, i) => {
          const t = trendClass(ind.change_pct);
          const barWidth = Math.min(Math.abs(ind.change_pct) / maxPct * 100, 100);
          return (
            <div key={ind.name} className="transition-colors hover-neo-inset flex items-center gap-3 rounded-md px-2 py-1.5">
              <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="w-4 text-[11px] text-neo-dim">{i + 1}</span>
              <span className="w-20 truncate text-[13px] text-neo-ink">{ind.name}</span>
              <div className="flex-1 h-1 overflow-hidden rounded-full bg-[var(--neo-surface-inset)]">
                <div
                  className={`bar-grow h-full rounded-full transition-all duration-500 ${ind.change_pct > 0 ? "bg-neo-up" : "bg-neo-down"}`}
                  style={{ width: `${barWidth}%`, animationDelay: `${Math.min(i * 70, 420)}ms` }}
                />
              </div>
              <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`w-14 text-right text-[13px] font-medium ${t}`}>{formatPct(ind.change_pct)}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function NewsCard({ news, featured = false }: { news: NewsItem; featured?: boolean }) {
  return (
    <a
      href={news.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className={`neo-card-sm transition-all duration-200 hover:-translate-y-0.5 group flex h-full flex-col ${featured ? "p-5" : "p-4"}`}
    >
      <div className="flex items-center gap-2 text-[11px]">
        <span className="font-medium text-neo-primary">{news.source}</span>
        <span className="text-neo-dim">·</span>
        <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-neo-dim">{(news.time || "").slice(5, 16)}</span>
      </div>
      <h4 className={`mt-2 ${featured ? "line-clamp-3 text-[15px]" : "line-clamp-2 text-[13px]"} font-medium leading-snug text-neo-ink group-hover:text-neo-primary transition-colors`}>
        {news.title}
      </h4>
      <p className={`mt-1 ${featured ? "line-clamp-3 text-[13px]" : "line-clamp-2 text-[12px]"} leading-relaxed text-neo-mid`}>
        {news.summary || ""}
      </p>
    </a>
  );
}

export function MarketStatCard({
  label, value, sub, trend,
}: {
  label: string; value: React.ReactNode; sub?: string; trend?: number;
}) {
  const trendCls = trend !== undefined ? trendClass(trend) : "";
  return (
    <div className="neo-inset px-4 py-3">
      <div className="text-[10px] uppercase tracking-wider text-neo-dim">{label}</div>
      <div style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`mt-1 text-[26px] font-bold tracking-tighter ${trendCls}`}>{value}</div>
      {sub && <div className="mt-1 text-[10px] text-neo-dim">{sub}</div>}
    </div>
  );
}
