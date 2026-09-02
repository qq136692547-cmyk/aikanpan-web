"use client";

import { useEffect, useState } from "react";
import { formatPct, formatPrice } from "@/lib/format";
import { api, type Dashboard, type Insights, type UsDashboard, type UsEarningsCalendarItem } from "@/lib/api";
import { MarketTemperaturePanel } from "@/components/ai/market-temperature-panel";
import { getUsDailyReviewExcerpt, useUsDailyReview } from "@/components/us/us-daily-review";
import { usNameZh } from "@/lib/us-stock-names";

type MarketScope = "all" | "cn" | "us";
type EarningsCalendarItem = UsEarningsCalendarItem;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://aikanpan.top/api/v1";

function trendClass(pct?: number) {
  if (!pct) return "text-neo-mid";
  return pct > 0 ? "text-neo-up" : pct < 0 ? "text-neo-down" : "text-neo-mid";
}

function PanelLabel({ label, color }: { label: string; color: string }) {
  return (
    <div className="mb-2 flex items-center gap-2">
      <span className="h-4 w-1 rounded-full" style={{ background: color }} aria-hidden />
      <span className="text-[13px] font-bold text-neo-ink">{label}</span>
      <span className="h-px flex-1 bg-[var(--neo-surface-active)]" aria-hidden />
    </div>
  );
}

function SectionShell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="neo-card p-4">
      <h3 className="mb-3 text-[13px] font-semibold text-neo-ink">{title}</h3>
      {children}
    </section>
  );
}

function MetricCard({ name, code, last, changePct }: {
  name?: string;
  code: string;
  last: number;
  changePct: number;
}) {
  return (
    <a href={`/stock/${code}/`} className="neo-card-sm p-3">
      <div className="text-[10px] uppercase tracking-wider text-neo-dim">{name || code}</div>
      <div className={`mt-1 text-[18px] font-bold ${trendClass(changePct)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
        {formatPrice(last)}
      </div>
      <div className={`text-[11px] ${trendClass(changePct)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
        {formatPct(changePct)}
      </div>
    </a>
  );
}

function AiConclusion({ market, focus }: { market: "cn" | "us"; focus: string }) {
  return (
    <div className="neo-ai p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-neo-primary-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">
          {market === "cn" ? "A股 AI 结论" : "美股 AI 结论"}
        </span>
        <a href={market === "cn" ? "/review/?market=cn" : "/review/?market=us"} className="text-[11px] text-neo-primary">
          完整复盘
        </a>
      </div>
      <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-neo-ink">
        {focus || "AI 结论生成中，请稍后刷新。"}
      </p>
    </div>
  );
}

function cnStockRoute(symbol: string) {
  const normalized = symbol.trim().toLowerCase();
  const match = normalized.match(/^(\d{6})\.(sh|sz|bj)$/);
  if (match) return `${match[2]}${match[1]}`;
  return normalized.replace(/\./g, "");
}

function CnEarningsCalendar() {
  const [items, setItems] = useState<EarningsCalendarItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${API_BASE}/cn/earnings-calendar`, { next: { revalidate: 3600 } })
      .then(async (res) => {
        if (!res.ok) throw new Error(String(res.status));
        const data = await res.json() as { calendar?: EarningsCalendarItem[] };
        if (!cancelled) setItems(data.calendar || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items?.length) return null;

  return (
    <SectionShell title="近期财报">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
        {items.slice(0, 6).map((item) => (
          <a key={item.symbol} href={`/stock/${cnStockRoute(item.symbol)}/`} className="neo-card-sm p-3">
            <div className="truncate text-[12px] font-semibold text-neo-ink">{item.name || item.symbol}</div>
            <div className="mt-0.5 text-[10px] text-neo-mid">{item.upcoming?.date || "待定"}</div>
          </a>
        ))}
      </div>
    </SectionShell>
  );
}

function UsTemperatureCard({ temperature }: { temperature?: UsDashboard["temperature"] }) {
  if (!temperature) return null;
  return (
    <div className="neo-card p-4">
      <div className="flex items-center justify-between">
        <h3 className="text-[13px] font-semibold text-neo-ink">市场温度</h3>
        <span className="neo-chip px-2 py-0.5 text-[10px] text-neo-mid">{temperature.label}</span>
      </div>
      <div className="mt-3 flex items-center gap-3">
        <div className="text-[28px] font-bold leading-none" style={{ fontFamily: "var(--font-inter), system-ui" }}>
          {temperature.score}
        </div>
        <div className="flex-1">
          <div className="neo-inset h-1.5 overflow-hidden rounded-full">
            <div
              className={`h-full rounded-full ${temperature.score >= 60 ? "bg-neo-up" : temperature.score >= 35 ? "bg-neo-primary" : "bg-neo-down"}`}
              style={{ width: `${Math.max(0, Math.min(100, temperature.score))}%` }}
            />
          </div>
          <div className="mt-2 space-y-0.5 text-[10px] text-neo-dim">
            <div>指数动量 {(temperature.index_momentum ?? 0) > 0 ? "+" : ""}{(temperature.index_momentum ?? 0).toFixed(2)}%</div>
            <div>上涨板块 {temperature.sectors_up ?? 0}/{temperature.sectors_total ?? 0}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CnMarketPanel({ dashboard, insights }: { dashboard: Dashboard; insights: Insights | null }) {
  return (
    <div>
      <PanelLabel label="A股市场" color="var(--neo-primary)" />
      <div className="space-y-3">
        <AiConclusion market="cn" focus={insights?.focus || ""} />
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dashboard.indices.slice(0, 3).map((idx) => (
            <MetricCard key={idx.code} name={idx.name} code={idx.code || ""} last={idx.last} changePct={idx.change_pct} />
          ))}
          <a href="/market/?market=cn" className="neo-card-sm p-3">
            <div className="text-[10px] uppercase tracking-wider text-neo-dim">涨停 / 跌停</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-neo-up">{dashboard.limit_up_count}</span>
              <span className="text-[12px] text-neo-dim">/</span>
              <span className="text-[18px] font-bold text-neo-down">{dashboard.limit_down_count}</span>
            </div>
          </a>
        </section>

        <SectionShell title="行业强度">
          <div className="space-y-1">
            {dashboard.strong_industries.slice(0, 5).map((item) => (
              <a key={item.name} href="/market/?market=cn" className="flex items-center justify-between rounded-md px-1 py-1.5 text-[12px] hover-neo-inset">
                <span className="truncate text-neo-ink">{item.name}</span>
                <span className={trendClass(item.change_pct)} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                  {formatPct(item.change_pct)}
                </span>
              </a>
            ))}
          </div>
        </SectionShell>

        <section className="neo-card p-4">
          <MarketTemperaturePanel upCount={dashboard.limit_up_count} downCount={dashboard.limit_down_count} />
        </section>

        <CnEarningsCalendar />
      </div>
    </div>
  );
}

export function UsMarketPanel({ dashboard }: { dashboard: UsDashboard }) {
  const { data: review } = useUsDailyReview();

  return (
    <div>
      <PanelLabel label="美股市场" color="var(--neo-amber)" />
      <div className="space-y-3">
        <AiConclusion market="us" focus={review ? getUsDailyReviewExcerpt(review.content) : ""} />
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dashboard.indices.slice(0, 3).map((idx) => (
            <MetricCard key={idx.code} name={idx.name} code={idx.code} last={idx.last} changePct={idx.change_pct ?? 0} />
          ))}
          <a href="/market/?market=us" className="neo-card-sm p-3">
            <div className="text-[10px] uppercase tracking-wider text-neo-dim">VIX 变动</div>
            <div className="mt-1 text-[18px] font-bold text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>
              {dashboard.temperature?.vix_change != null ? formatPct(dashboard.temperature.vix_change) : "-"}
            </div>
            <div className="text-[10px] text-neo-dim">风险情绪</div>
          </a>
        </section>

        <SectionShell title="板块表现">
          <div className="flex flex-wrap gap-1.5">
            {(dashboard.sectors || []).slice(0, 8).map((item) => (
              <a key={item.code} href={`/stock/${item.code}/`} className={`neo-chip px-2.5 py-1 text-[11px] ${trendClass(item.change_pct)}`}>
                {item.name}
                <span className="ml-1" style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatPct(item.change_pct ?? 0)}</span>
              </a>
            ))}
          </div>
        </SectionShell>

        <UsTemperatureCard temperature={dashboard.temperature} />

        <UsEarningsCalendar />
      </div>
    </div>
  );
}

function UsEarningsCalendar() {
  const [items, setItems] = useState<EarningsCalendarItem[] | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getUsEarningsCalendar()
      .then((data) => {
        if (!cancelled) setItems(data.calendar || []);
      })
      .catch(() => {
        if (!cancelled) setItems([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  if (!items?.length) return null;

  return (
    <SectionShell title="近期财报">
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-2">
        {items.slice(0, 6).map((item) => (
          <a key={item.symbol} href={`/stock/${item.symbol}/`} className="neo-card-sm p-3">
            <div className="truncate text-[12px] font-semibold text-neo-ink">{item.symbol}</div>
            <div className="truncate text-[12px] font-semibold text-neo-ink">{usNameZh(item.name, item.symbol)}</div>
            <div className="mt-0.5 text-[10px] text-neo-mid">{item.upcoming?.date || "待定"}</div>
          </a>
        ))}
      </div>
    </SectionShell>
  );
}

export function HomeMarketPanels({
  scope,
  dashboard,
  insights,
  usDashboard,
}: {
  scope: MarketScope;
  dashboard: Dashboard | null;
  insights: Insights | null;
  usDashboard: UsDashboard | null;
}) {
  if (scope === "cn") {
    return dashboard ? <CnMarketPanel dashboard={dashboard} insights={insights} /> : null;
  }
  if (scope === "us") {
    return usDashboard ? <UsMarketPanel dashboard={usDashboard} /> : null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {dashboard && <CnMarketPanel dashboard={dashboard} insights={insights} />}
      {usDashboard && <UsMarketPanel dashboard={usDashboard} />}
    </div>
  );
}
