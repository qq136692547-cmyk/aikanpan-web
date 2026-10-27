"use client";

import { useEffect, useState } from "react";
import { Activity, ShieldAlert, Sparkles, TrendingUp } from "lucide-react";
import { formatPct, formatPrice } from "@/lib/format";
import { api, type AIReview, type Dashboard, type HkDashboard, type Insights, type UsDashboard, type UsEarningsCalendarItem } from "@/lib/api";
import { MarketTemperaturePanel } from "@/components/ai/market-temperature-panel";
import { getUsDailyReviewConclusion, getUsDailyReviewTakeaways, useUsDailyReview } from "@/components/us/us-daily-review";
import { getHkDailyReviewConclusion, useHkDailyReview } from "@/components/hk/hk-daily-review";
import { usNameZh } from "@/lib/us-stock-names";

type MarketScope = "all" | "cn" | "hk" | "us";
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
    <section 
      className="relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#101216] p-4 sm:p-5 transition-all duration-300 hover:border-white/[0.14]"
      style={{
        boxShadow: "-6px -6px 16px rgba(255, 255, 255, 0.045), 8px 8px 20px rgba(0, 0, 0, 0.65)"
      }}
    >
      <h2 className="mb-3.5 text-[13px] font-semibold text-[#EDEFF3] flex items-center justify-between">
        <span>{title}</span>
        <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(56,189,248,0.8)]" />
      </h2>
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
    <a 
      href={`/stock/${code}/`} 
      className="group relative flex flex-col justify-between overflow-hidden rounded-[10px] border border-white/[0.05] bg-[#0C0E11] p-3 transition-all duration-200 hover:border-white/[0.14] hover:bg-[#14171D] active:scale-[0.98]"
      style={{
        boxShadow: "inset 3px 3px 7px rgba(0, 0, 0, 0.65), inset -2px -2px 5px rgba(255, 255, 255, 0.045)"
      }}
    >
      <div className="text-[11px] font-medium text-[#9AA3B2] group-hover:text-white transition-colors">{name || code}</div>
      <div className={`mt-1 text-[18px] font-bold tracking-tight ${trendClass(changePct)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
        {formatPrice(last)}
      </div>
      <div className="mt-0.5 flex items-center justify-between">
        <span className={`text-[11px] font-semibold ${trendClass(changePct)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
          {formatPct(changePct)}
        </span>
        <span className="text-[10px] text-[#7C8595] font-mono">{code}</span>
      </div>
    </a>
  );
}

function AiConclusion({ market, focus }: { market: "cn" | "hk" | "us"; focus: string }) {
  const label = market === "cn" ? "A股 AI 结论" : market === "hk" ? "港股 AI 结论" : "美股 AI 结论";
  if (!focus) return null;
  return (
    <div className="neo-ai p-4">
      <div className="flex items-center justify-between">
        <span className="rounded-md bg-neo-primary-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">
          {label}
        </span>
        <a
          href={`/review/?market=${market}`}
          className="inline-flex min-h-11 items-center text-[11px] text-neo-primary"
        >
          完整复盘
        </a>
      </div>
      <p className="mt-2 line-clamp-4 text-[13px] leading-relaxed text-neo-ink">
        {focus}
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

function UsTemperatureCard({
  temperature,
  review,
}: {
  temperature?: UsDashboard["temperature"];
  review?: AIReview | null;
}) {
  if (!temperature) return null;
  const score = Math.max(0, Math.min(100, temperature.score));
  const hasUpRatio = Number.isFinite(temperature.up_ratio);
  const upRatio = hasUpRatio ? Math.max(0, Math.min(100, temperature.up_ratio)) : 0;
  const momentum = temperature.index_momentum ?? 0;
  const vixChange = temperature.vix_change;
  const sectorsUp = temperature.sectors_up ?? 0;
  const sectorsTotal = temperature.sectors_total ?? 0;
  const tone = score >= 65 ? "text-neo-up" : score >= 40 ? "text-neo-primary" : "text-neo-down";
  const widthTone = !hasUpRatio ? "text-neo-dim" : upRatio >= 65 ? "text-neo-up" : upRatio >= 40 ? "text-neo-primary" : "text-neo-down";
  const widthBarTone = !hasUpRatio ? "bg-neo-dim" : upRatio >= 65 ? "bg-neo-up" : upRatio >= 40 ? "bg-neo-primary" : "bg-neo-down";
  const widthLabel = !hasUpRatio ? "市场宽度待确认" : upRatio >= 65 ? "市场宽度偏强" : upRatio >= 40 ? "多空分布均衡" : "市场宽度偏弱";
  const riskLabel = vixChange == null ? "波动待确认" : vixChange > 5 ? "波动升温" : vixChange < -5 ? "波动降温" : "波动平稳";
  const riskTone = vixChange == null ? "text-neo-dim" : vixChange > 5 ? "text-neo-up" : vixChange < -5 ? "text-neo-down" : "text-neo-mid";
  const takeaways = review ? getUsDailyReviewTakeaways(review.content) : [];
  return (
    <div className="neo-card p-4">
      <div className="flex items-center justify-between">
        <h2 className="text-[13px] font-semibold text-neo-ink">市场温度</h2>
        <span className="neo-chip px-2 py-0.5 text-[10px] text-neo-mid">{temperature.label}</span>
      </div>
      <div className="mt-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className={`flex h-14 w-14 items-center justify-center rounded-full border border-current/20 bg-[var(--neo-surface-inset)] ${tone}`}>
            <span className="text-[26px] font-bold leading-none" style={{ fontFamily: "var(--font-inter), system-ui" }}>
              {score}
            </span>
          </div>
          <div>
            <div className="text-[12px] font-medium text-neo-ink">综合温度 / 100</div>
            <div className="mt-0.5 text-[11px] text-neo-dim">{widthLabel}</div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-[10px] uppercase tracking-wider text-neo-dim">风险状态</div>
          <div className={`mt-1 text-[12px] font-semibold ${riskTone}`}>{riskLabel}</div>
        </div>
      </div>
      <div className="mt-4">
        <div className="flex items-center justify-between gap-2 text-[11px]">
          <span className="text-neo-dim">上涨板块</span>
          <span className="text-neo-mid">
            {sectorsUp}/{sectorsTotal} · {hasUpRatio ? `${upRatio.toFixed(0)}%` : "--"}
          </span>
        </div>
        <div className="neo-inset mt-1.5 h-2 overflow-hidden rounded-full">
          <div
            className={`h-full rounded-full ${widthBarTone}`}
            style={{ width: `${upRatio}%` }}
          />
        </div>
      </div>
      <div className="mt-3 grid grid-cols-3 gap-2">
        <div className="neo-inset-sm px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] text-neo-dim">
            <TrendingUp size={11} />
            指数动量
          </div>
          <div className={`mt-1 text-[13px] font-semibold ${momentum >= 0 ? "text-neo-up" : "text-neo-down"}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
            {formatPct(momentum)}
          </div>
        </div>
        <div className="neo-inset-sm px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] text-neo-dim">
            <ShieldAlert size={11} />
            VIX 变动
          </div>
          <div className={`mt-1 text-[13px] font-semibold ${riskTone}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
            {vixChange == null ? "--" : formatPct(vixChange)}
          </div>
        </div>
        <div className="neo-inset-sm px-2.5 py-2">
          <div className="flex items-center gap-1 text-[10px] text-neo-dim">
            <Activity size={11} />
            市场宽度
          </div>
          <div className={`mt-1 text-[13px] font-semibold ${widthTone}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
            {hasUpRatio ? `${upRatio.toFixed(0)}%` : "--"}
          </div>
        </div>
      </div>
      <div className="mt-4 border-t border-[var(--neo-border)] pt-3">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-[12px] font-semibold text-neo-ink">
            <Sparkles size={13} className="text-neo-primary" />
            AI 深度解读
          </div>
          <a href="/review/?market=us" className="inline-flex min-h-11 items-center text-[11px] text-neo-primary">
            查看完整解析
          </a>
        </div>
        {takeaways.length > 0 ? (
          <div className="space-y-2">
            {takeaways.map((item) => (
              <div key={item.label} className="flex gap-2">
                <span className="mt-[7px] h-1.5 w-1.5 shrink-0 rounded-full bg-neo-primary" />
                <p className="line-clamp-2 text-[11px] leading-relaxed text-neo-mid" title={item.text}>
                  <span className="mr-1 font-semibold text-neo-ink">{item.label}</span>
                  {item.text}
                </p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[11px] leading-relaxed text-neo-dim">AI 正在提炼市场驱动、主要风险与关注要点。</p>
        )}
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
              <a key={item.name} href="/market/?market=cn" className="flex min-h-11 items-center justify-between rounded-md px-1 py-1.5 text-[12px] hover-neo-inset">
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

export function UsMarketPanel({ dashboard, initialReview }: { dashboard: UsDashboard; initialReview?: AIReview | null }) {
  const { data: review } = useUsDailyReview();
  const effectiveReview = review ?? initialReview ?? null;
  const conclusion = effectiveReview ? getUsDailyReviewConclusion(effectiveReview.content) : "";

  return (
    <div>
      <PanelLabel label="美股市场" color="var(--neo-amber)" />
      <div className="space-y-3">
        <AiConclusion market="us" focus={conclusion} />
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
              <a key={item.code} href={`/stock/${item.code}/`} className={`neo-chip inline-flex min-h-11 items-center px-3 py-1 text-[11px] ${trendClass(item.change_pct)}`}>
                {item.name}
                <span className="ml-1" style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatPct(item.change_pct ?? 0)}</span>
              </a>
            ))}
          </div>
        </SectionShell>

        <UsTemperatureCard temperature={dashboard.temperature} review={effectiveReview} />

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

export function HkMarketPanel({ dashboard, initialReview }: { dashboard: HkDashboard; initialReview?: AIReview | null }) {
  const { data: review } = useHkDailyReview();
  const effectiveReview = review ?? initialReview ?? null;
  const conclusion = effectiveReview ? getHkDailyReviewConclusion(effectiveReview.content) : "";

  return (
    <div>
      <PanelLabel label="港股市场" color="var(--neo-primary)" />
      <div className="space-y-3">
        <AiConclusion market="hk" focus={conclusion} />
        <section className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dashboard.indices.slice(0, 3).map((idx) => (
            <MetricCard key={idx.code} name={idx.name} code={idx.code} last={idx.last} changePct={idx.change_pct ?? 0} />
          ))}
          <a href="/market/?market=hk" className="neo-card-sm p-3">
            <div className="text-[10px] uppercase tracking-wider text-neo-dim">领涨 / 领跌</div>
            <div className="mt-1 flex items-baseline gap-1.5">
              <span className="text-[18px] font-bold text-neo-up">{dashboard.top_gainers?.length ?? 0}</span>
              <span className="text-[12px] text-neo-dim">/</span>
              <span className="text-[18px] font-bold text-neo-down">{dashboard.top_losers?.length ?? 0}</span>
            </div>
          </a>
        </section>

        <SectionShell title="热门港股">
          <div className="space-y-1">
            {(dashboard.hot_stocks || []).slice(0, 5).map((item) => (
              <a key={item.code} href={`/stock/${item.code}/`} className="flex min-h-11 items-center justify-between rounded-md px-1 py-1.5 text-[12px] hover-neo-inset">
                <span className="truncate text-neo-ink">{item.name || item.code}</span>
                <span className={trendClass(item.change_pct)} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                  {formatPct(item.change_pct ?? 0)}
                </span>
              </a>
            ))}
          </div>
        </SectionShell>
      </div>
    </div>
  );
}


function getHkMarketTemperature(hkDashboard: HkDashboard | null): { score: number; label: string } {
  if (!hkDashboard) return { score: 50, label: "港股中性" };
  const hsi = hkDashboard.indices?.find((i) => i.code === "HSI" || i.name?.includes("恒生指数"));
  const hstech = hkDashboard.indices?.find((i) => i.code === "HSTECH" || i.name?.includes("恒生科技"));
  const gainers = hkDashboard.top_gainers?.length || 0;
  const losers = hkDashboard.top_losers?.length || 0;
  
  let score = 50;
  if (hsi && hsi.change_pct != null) {
    score += Math.max(-25, Math.min(25, hsi.change_pct * 12.5));
  }
  if (hstech && hstech.change_pct != null) {
    score += Math.max(-15, Math.min(15, hstech.change_pct * 7.5));
  }
  const totalGl = gainers + losers;
  if (totalGl > 0) {
    const ratio = gainers / totalGl;
    score += (ratio - 0.5) * 20;
  }
  
  const finalScore = Math.round(Math.max(10, Math.min(95, score)));
  let label = "港股中性";
  if (finalScore >= 75) label = "港股偏强";
  else if (finalScore >= 60) label = "多头回暖";
  else if (finalScore <= 30) label = "空头承压";
  else if (finalScore <= 42) label = "震荡偏弱";
  return { score: finalScore, label };
}

function GlobalMarketPulse({
  dashboard,
  hkDashboard,
  usDashboard,
}: {
  dashboard: Dashboard | null;
  hkDashboard: HkDashboard | null;
  usDashboard: UsDashboard | null;
}) {
  const cnLeader = dashboard?.indices?.[0]; // 上证指数
  const hkLeader = hkDashboard?.indices?.[0]; // 恒生指数
  const usLeader = usDashboard?.indices?.[0]; // 标普500 ETF

  const cards = [
    {
      region: "A股",
      badge: "CN",
      badgeClass: "bg-red-500/10 text-red-600 dark:text-red-400 border-red-500/20",
      name: cnLeader?.name || "上证指数",
      last: cnLeader ? formatPrice(cnLeader.last) : "--",
      pct: cnLeader?.change_pct,
      subInfo: dashboard ? `${dashboard.limit_up_count || 0} 涨停 / ${dashboard.limit_down_count || 0} 跌停` : "沪深京",
      status: dashboard?.market_status || "A股盘口",
      href: "/?market=cn",
    },
    (() => {
      const hkTemp = getHkMarketTemperature(hkDashboard);
      return {
        region: "港股",
        badge: "HK",
        badgeClass: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/20",
        name: hkLeader?.name || "恒生指数",
        last: hkLeader ? formatPrice(hkLeader.last) : "--",
        pct: hkLeader?.change_pct,
        subInfo: hkDashboard ? `市场温度: ${hkTemp.score}分` : "港交所",
        status: hkTemp.label,
        href: "/?market=hk",
      };
    })(),
    {
      region: "美股",
      badge: "US",
      badgeClass: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      name: usLeader?.name || "标普500 ETF",
      last: usLeader ? formatPrice(usLeader.last) : "--",
      pct: usLeader?.change_pct,
      subInfo: usDashboard?.temperature ? `市场温度: ${usDashboard.temperature.score}分` : "纽交所/纳斯达克",
      status: usDashboard?.temperature?.label || "美股交易",
      href: "/?market=us",
    },
  ];

  return (
    <div className="neo-card col-span-full p-4 mb-2">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--neo-surface-inset)] pb-3">
        <div className="flex items-center gap-2">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-[var(--neo-primary-light)] text-neo-primary">
            <TrendingUp size={14} />
          </div>
          <span className="text-[14px] font-bold tracking-tight text-neo-ink">全球市场脉搏看板 (A股 · 港股 · 美股)</span>
        </div>
        <span className="text-[11px] text-neo-dim">点击板块直达对应市场</span>
      </div>

      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
        {cards.map((c) => {
          const isUp = (c.pct || 0) > 0;
          const pctText = c.pct !== undefined ? `${isUp ? "+" : ""}${c.pct.toFixed(2)}%` : "--";
          return (
            <a
              key={c.region}
              href={c.href}
              className="group flex flex-col justify-between rounded-xl border border-[var(--neo-edge)] bg-[var(--neo-surface)] p-3 transition-all hover:border-neo-primary hover:shadow-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold border ${c.badgeClass}`}>
                    {c.badge}
                  </span>
                  <span className="text-[13px] font-bold text-neo-ink group-hover:text-neo-primary transition-colors">
                    {c.name}
                  </span>
                </div>
                <span className="text-[11px] text-neo-dim">{c.subInfo}</span>
              </div>
              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-[18px] font-extrabold tracking-tight text-neo-ink font-mono">
                  {c.last}
                </span>
                <span className={`text-[13px] font-bold font-mono ${trendClass(c.pct)}`}>
                  {pctText}
                </span>
              </div>
              <div className="mt-2 flex items-center justify-between border-t border-[var(--neo-surface-inset)] pt-1.5 text-[11px] text-neo-dim">
                <span>{c.region === "A股" ? "沪深主板/创科" : c.region === "港股" ? "主板/恒生科技" : "美股核心宽基"}</span>
                <span className="font-mono text-neo-ink-mid">{c.status}</span>
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}

export function HomeMarketPanels({
  scope,
  dashboard,
  insights,
  usDashboard,
  hkDashboard,
  usDailyReview,
  hkDailyReview,
}: {
  scope: MarketScope;
  dashboard: Dashboard | null;
  insights: Insights | null;
  usDashboard: UsDashboard | null;
  hkDashboard: HkDashboard | null;
  usDailyReview?: AIReview | null;
  hkDailyReview?: AIReview | null;
}) {
  if (scope === "cn") {
    return dashboard ? <CnMarketPanel dashboard={dashboard} insights={insights} /> : null;
  }
  if (scope === "us") {
    return usDashboard ? <UsMarketPanel dashboard={usDashboard} initialReview={usDailyReview} /> : null;
  }
  if (scope === "hk") {
    return hkDashboard ? <HkMarketPanel dashboard={hkDashboard} initialReview={hkDailyReview} /> : null;
  }

  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      <GlobalMarketPulse
        dashboard={dashboard}
        hkDashboard={hkDashboard}
        usDashboard={usDashboard}
      />
      {dashboard && <CnMarketPanel dashboard={dashboard} insights={insights} />}
      {usDashboard && <UsMarketPanel dashboard={usDashboard} initialReview={usDailyReview} />}
      {hkDashboard && <HkMarketPanel dashboard={hkDashboard} initialReview={hkDailyReview} />}
    </div>
  );
}
