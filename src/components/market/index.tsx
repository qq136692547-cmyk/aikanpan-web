/**
 * 爱看盘 — 市场组件库
 * Dial: DENSITY 7 / VARIANCE 5 / MOTION 4
 */
import { formatPrice, formatPct, formatChange, trendClass, trendBgClass } from "@/lib/format";
import type { IndexData, LimitStock, StrongIndustry, NewsItem } from "@/lib/api";

/** 指数卡片 — 三大指数 */
export function IndexCard({ data }: { data: IndexData }) {
  const trend = trendClass(data.change_pct);
  const bgTrend = trendBgClass(data.change_pct);

  return (
    <div className="card-hover rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center justify-between">
        <div className="flex items-baseline gap-2">
          <span className="text-sm font-medium text-[var(--text-primary)]">{data.name}</span>
          <span className="font-num text-xs text-[var(--text-tertiary)]">{data.code}</span>
        </div>
        <span className={`rounded px-2 py-0.5 text-xs font-medium ${bgTrend} ${trend}`}>
          {formatPct(data.change_pct)}
        </span>
      </div>
      <div className="mt-3 flex items-baseline gap-3">
        <span className={`font-num text-3xl font-bold ${trend}`}>
          {formatPrice(data.last)}
        </span>
        <span className={`font-num text-sm ${trend}`}>
          {formatChange(data.change)}
        </span>
      </div>
      <div className="mt-2 flex items-center gap-2 text-xs">
        <span className="text-[var(--text-tertiary)]">{data.date}</span>
        <span className="text-[var(--border-default)]">|</span>
        <span className="text-[var(--text-tertiary)]">数据源 {data.source}</span>
      </div>
    </div>
  );
}

/** 涨跌停列表 */
export function LimitStockList({
  title,
  stocks,
  type,
  delay = 0,
}: {
  title: string;
  stocks: LimitStock[];
  type: "up" | "down";
  delay?: number;
}) {
  const headerColor = type === "up" ? "text-up" : "text-down";
  const headerDot = type === "up" ? "bg-up" : "bg-down";

  return (
    <div
      className="animate-fade-up overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${headerDot}`} />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        <span className={`text-xs ${headerColor}`}>
          共 {stocks.length} 只
        </span>
      </div>
      <div>
        <div className="grid grid-cols-[1fr_90px_72px_56px] gap-2 border-b border-[var(--border-subtle)] px-4 py-2 text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
          <span>名称 / 代码</span>
          <span className="text-right">价格</span>
          <span className="text-right">涨跌幅</span>
          <span className="text-right">类型</span>
        </div>
        {stocks.map((s) => {
          const t = trendClass(s.pct);
          return (
            <a
              key={s.code}
              href={`/stock/${s.code.replace(/\./, "")}/`}
              className="row-hover grid grid-cols-[1fr_90px_72px_56px] items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2 text-sm last:border-b-0"
            >
              <div className="flex flex-col">
                <span className="truncate text-sm font-medium text-[var(--text-primary)]">{s.name}</span>
                <span className="font-num text-[10px] text-[var(--text-tertiary)]">{s.code}</span>
              </div>
              <span className={`font-num text-right font-medium ${t}`}>{formatPrice(s.price)}</span>
              <span className={`font-num text-right ${t}`}>{formatPct(s.pct)}</span>
              <span className="text-right">
                <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">
                  {s.tag}
                </span>
              </span>
            </a>
          );
        })}
      </div>
    </div>
  );
}

/** 强势行业卡片 */
export function IndustryCard({
  industries,
  delay = 0,
}: {
  industries: StrongIndustry[];
  delay?: number;
}) {
  const maxPct = Math.max(...industries.map((i) => Math.abs(i.change_pct)), 0.1);

  return (
    <div
      className="animate-fade-up rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
      style={{ animationDelay: `${delay}ms` }}
    >
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-brand pulse-dot" />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">强势行业</h3>
        </div>
        <span className="text-xs text-[var(--text-tertiary)]">TOP {industries.length}</span>
      </div>
      <div className="space-y-1">
        {industries.map((ind, i) => {
          const t = trendClass(ind.change_pct);
          const barWidth = Math.min(Math.abs(ind.change_pct) / maxPct * 100, 100);
          const barColor = ind.change_pct > 0 ? "bg-up" : "bg-down";
          return (
            <div
              key={ind.name}
              className="row-hover flex items-center gap-3 rounded px-2 py-2"
            >
              <span className="font-num w-6 text-xs text-[var(--text-tertiary)]">
                {String(i + 1).padStart(2, "0")}
              </span>
              <span className="flex-1 truncate text-sm text-[var(--text-primary)]">{ind.name}</span>
              <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[var(--bg-elevated)] sm:block">
                <div
                  className={`h-full rounded-full ${barColor} transition-base`}
                  style={{ width: `${barWidth}%` }}
                />
              </div>
              <span className={`font-num w-16 text-right text-sm font-medium ${t}`}>
                {formatPct(ind.change_pct)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** 新闻卡片 */
export function NewsCard({ news }: { news: NewsItem }) {
  return (
    <a
      href={news.url || "#"}
      target="_blank"
      rel="noopener noreferrer"
      className="card-hover group flex flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
    >
      <div className="flex items-center gap-2 text-[11px]">
        <span className="text-[var(--text-secondary)]">{news.source}</span>
        <span className="text-[var(--border-default)]">|</span>
        <span className="font-num text-[var(--text-tertiary)]">{(news.time || "").slice(5, 16)}</span>
      </div>
      <h4 className="mt-2 line-clamp-2 text-sm font-medium text-[var(--text-primary)] transition-fast group-hover:text-brand">
        {news.title}
      </h4>
      <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">
        {news.summary || ""}
      </p>
      <div className="mt-auto pt-2">
        <span className="text-[11px] text-[var(--text-tertiary)] transition-fast group-hover:text-brand">
          阅读全文 →
        </span>
      </div>
    </a>
  );
}

/** 市场统计卡片 */
export function MarketStatCard({
  label,
  value,
  sub,
  trend,
}: {
  label: string;
  value: string | number;
  sub?: string;
  trend?: number;
}) {
  const trendCls = trend !== undefined ? trendClass(trend) : "";
  const dotColor = trend !== undefined
    ? trend > 0 ? "bg-up" : trend < 0 ? "bg-down" : "bg-flat"
    : "";

  return (
    <div className="card-hover rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
      <div className="flex items-center gap-2">
        {trend !== undefined && (
          <span className={`h-1.5 w-1.5 rounded-full ${dotColor}`} />
        )}
        <span className="text-xs text-[var(--text-secondary)]">{label}</span>
      </div>
      <div className={`mt-2 font-num text-2xl font-bold ${trendCls}`}>
        {value}
      </div>
      {sub && <div className="mt-1 text-xs text-[var(--text-tertiary)]">{sub}</div>}
    </div>
  );
}
