import { Navbar } from "@/components/layout/navbar";
import { AutoRefresh } from "@/components/system/auto-refresh";
import { Footer } from "@/components/layout/footer";
import { LimitListWithScore } from "@/components/ai/limit-list-with-score";
import { LimitStatsPersonalized } from "@/components/ai/limit-stats-personalized";
import { AIReview } from "@/components/ai/ai-review";
import { AIQuickDiagnosis } from "@/components/ai/ai-quick-diagnosis";
import { MarketSentiment } from "@/components/ai/market-sentiment";
import { Sparkline } from "@/components/chart/sparkline";
import { api, type Dashboard, type Insights } from "@/lib/api";
import { formatPct, formatPrice, formatChange } from "@/lib/format";
import type { Metadata } from "next";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "仪表盘",
  description: "A股实时行情仪表盘 — 三大指数、涨跌停、AI 复盘、智能盯盘",
};

function neoTrendClass(pct: number) {
  return pct > 0 ? "text-neo-up" : pct < 0 ? "text-neo-down" : "text-neo-mid";
}

export default async function DashboardPage() {
  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;

  try {
    [dashboard, insights] = await Promise.all([
      api.getDashboard(),
      api.getInsights(),
    ]);
  } catch (e) {
    console.error("Failed to fetch dashboard data:", e);
  }

  if (!dashboard) {
    return (
      <div className="neo-page">
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-8">
          <div className="neo-skeleton mb-6 h-8 w-40" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="neo-skeleton h-40" />
            <div className="neo-skeleton h-40" />
            <div className="neo-skeleton h-40" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  const upCount = dashboard.limit_up_count;

  const indexHistories: Record<string, number[]> = {};
  try {
    const indexCodes = dashboard.indices.map((idx) => idx.code).filter((c): c is string => Boolean(c));
    const settled = await Promise.allSettled(indexCodes.map((c) => api.getStockHistory(c)));
    dashboard.indices.forEach((idx, i) => {
      const result = settled[i];
      if (result.status === "fulfilled" && result.value.closes && result.value.closes.length >= 2) {
        if (idx.code) indexHistories[idx.code] = result.value.closes;
      }
    });
  } catch (e) {
    console.error("Failed to fetch index histories:", e);
  }
  const downCount = dashboard.limit_down_count;
  const idx0 = dashboard.indices[0];
  const otherIndices = dashboard.indices.slice(1);

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
      <AutoRefresh />
        {/* Hero — 主指数 */}
        <section className="neo-fade-up">
          <div className="relative overflow-hidden rounded-2xl">
            <img loading="lazy"
              src="/images/ai-art/dashboard-banner-v2.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--neo-bg)]/60 via-[var(--neo-bg)]/40 to-[var(--neo-bg)]/80" />
            <div className="relative mb-4 flex items-end justify-between">
            <div>
              <h2 className="text-[18px] font-bold tracking-tight text-neo-ink">市场总览</h2>
              <p className="mt-0.5 text-[12px] text-neo-dim">
                {dashboard.market_status === "complete" ? "已收盘" : "交易中"} · {dashboard.index.date} {dashboard.market_updated_at}
              </p>
            </div>
            <span className="flex items-center gap-1.5 text-[11px] font-medium text-neo-dim">
              {dashboard.market_status !== "complete" && <span className="h-1.5 w-1.5 rounded-full bg-[var(--neo-up)] neo-pulse" />}
              {dashboard.market_status === "complete" ? "CLOSED" : "LIVE"}
            </span>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {/* 主指数大卡片 */}
            <div className="neo-card p-6 sm:col-span-2 lg:row-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[15px] font-semibold text-neo-ink">{idx0.name}</span>
                  <span className="ml-2 text-[11px] text-neo-dim">{idx0.code}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${idx0.change_pct > 0 ? "neo-up-soft text-neo-up" : "neo-down-soft text-neo-down"}`}>
                  {formatPct(idx0.change_pct)}
                </span>
              </div>
              <div className={`mt-4 text-[32px] font-bold tracking-tight ${neoTrendClass(idx0.change_pct)}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                {formatPrice(idx0.last)}
              </div>
              <div className={`mt-1 text-[14px] ${neoTrendClass(idx0.change_pct)}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                {formatChange(idx0.change)}
              </div>
              <Sparkline data={indexHistories[idx0.code || ""] || []} trend={idx0.change_pct} height={40} className="mt-3 w-full" />
              {/* 迷你涨跌条 */}
              <div className="neo-inset-sm mt-3 h-1.5 overflow-hidden rounded-full">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${idx0.change_pct > 0 ? 'bg-[var(--neo-up)]' : 'bg-[var(--neo-down)]'}`}
                  style={{ width: `${Math.min(Math.abs(idx0.change_pct) * 10, 100)}%` }}
                />
              </div>
            </div>

            {/* 其他指数小卡片 */}
            {otherIndices.map((idx) => (
              <div key={idx.code} className="neo-card-sm p-4">
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-medium text-neo-mid">{idx.name}</span>
                  <span className={`text-[12px] font-semibold ${neoTrendClass(idx.change_pct)}`}>{formatPct(idx.change_pct)}</span>
                </div>
                <div className={`mt-2 text-[22px] font-bold tracking-tight ${neoTrendClass(idx.change_pct)}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                  {formatPrice(idx.last)}
                </div>
                <Sparkline data={indexHistories[idx.code || ""] || []} trend={idx.change_pct} height={28} className="mt-2 w-full" />
                {/* 迷你涨跌条 */}
                <div className="neo-inset-sm mt-2 h-1 overflow-hidden rounded-full">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${idx.change_pct > 0 ? 'bg-[var(--neo-up)]' : 'bg-[var(--neo-down)]'}`}
                    style={{ width: `${Math.min(Math.abs(idx.change_pct) * 10, 100)}%` }}
                  />
                </div>
              </div>
            ))}

            {/* 市场情绪 */}
            <div className="neo-card-sm p-4">
              <MarketSentiment upCount={upCount} downCount={downCount} />
            </div>
          </div>
          </div>
        </section>

        {/* 涨跌停统计 — 凹陷数字格 */}
        <section className="mt-4 neo-fade-up" style={{ animationDelay: "60ms" }}>
          <LimitStatsPersonalized
            upStocks={dashboard.limit_up}
            downStocks={dashboard.limit_down}
            upCount={upCount}
            downCount={downCount}
            sparkData={indexHistories[idx0.code || ""] || []}
          />
        </section>

        {/* 板块速览 */}
        {dashboard.strong_industries && dashboard.strong_industries.length > 0 && (
          <section className="mt-4 neo-fade-up" style={{ animationDelay: "80ms" }}>
            <h3 className="mb-2 text-[14px] font-semibold text-neo-ink">板块速览</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              {dashboard.strong_industries.slice(0, 6).map((ind, i) => (
                <div key={ind.name} className="neo-card-sm p-3">
                  <div className="truncate text-[12px] font-medium text-neo-ink">{ind.name}</div>
                  <div className={`mt-1 text-[14px] font-semibold ${neoTrendClass(ind.change_pct)}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                    {formatPct(ind.change_pct)}
                  </div>
                  <div className="neo-inset-sm mt-2 h-1 overflow-hidden rounded-full">
                    <div
                      className={`bar-grow h-full rounded-full transition-all duration-500 ${ind.change_pct > 0 ? 'bg-[var(--neo-up)]' : 'bg-[var(--neo-down)]'}`}
                      style={{ width: `${Math.min(Math.abs(ind.change_pct) * 10, 100)}%`, animationDelay: `${Math.min(i * 70, 420)}ms` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI 每日复盘 */}
        <section className="relative mt-6 neo-fade-up" style={{ animationDelay: "100ms" }}>
          <img loading="lazy"
            src="/images/ai-art/ai-neural-bg.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-cover opacity-5"
          />
          <div className="relative">
            <AIReview />
          </div>
        </section>

        {/* AI 功能入口卡片 */}
        <section className="mt-4 neo-fade-up" style={{ animationDelay: "120ms" }}>
          <h3 className="mb-2 text-[14px] font-semibold text-neo-ink">AI 功能</h3>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <a href="/review/" className="group neo-card-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
              <img loading="lazy"
                src="/images/ai-art/ai-review-illustration-dark.png"
                alt="AI 每日复盘"
                className="h-32 w-full object-cover opacity-90"
              />
              <div className="p-4">
                <div className="text-[14px] font-semibold text-neo-ink">AI 每日复盘</div>
                <div className="mt-1 text-[12px] text-neo-dim">AI 自动生成市场复盘报告</div>
                <span className="mt-2 inline-block text-[12px] text-neo-primary group-hover:underline">查看复盘 →</span>
              </div>
            </a>
            <a href="/search" className="group neo-card-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
              <img loading="lazy"
                src="/images/ai-art/ai-diagnosis-illustration-dark.png"
                alt="AI 个股诊断"
                className="h-32 w-full object-cover opacity-90"
              />
              <div className="p-4">
                <div className="text-[14px] font-semibold text-neo-ink">AI 个股诊断</div>
                <div className="mt-1 text-[12px] text-neo-dim">输入代码，AI 秒出诊断报告</div>
                <span className="mt-2 inline-block text-[12px] text-neo-primary group-hover:underline">开始诊断 →</span>
              </div>
            </a>
            <a href="/alerts" className="group neo-card-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
              <img loading="lazy"
                src="/images/ai-art/ai-alert-illustration-dark.png"
                alt="AI 智能盯盘"
                className="h-32 w-full object-cover opacity-90"
              />
              <div className="p-4">
                <div className="text-[14px] font-semibold text-neo-ink">AI 智能盯盘</div>
                <div className="mt-1 text-[12px] text-neo-dim">自然语言创建盯盘任务</div>
                <span className="mt-2 inline-block text-[12px] text-neo-primary group-hover:underline">设置提醒 →</span>
              </div>
            </a>
            <a href="/search" className="group neo-card-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
              <img loading="lazy"
                src="/images/ai-art/ai-quick-check-illustration-dark.png"
                alt="AI 快速诊断"
                className="h-32 w-full object-cover opacity-90"
              />
              <div className="p-4">
                <div className="text-[14px] font-semibold text-neo-ink">AI 快速诊断</div>
                <div className="mt-1 text-[12px] text-neo-dim">快速获取个股诊断信号</div>
                <span className="mt-2 inline-block text-[12px] text-neo-primary group-hover:underline">快速诊断 →</span>
              </div>
            </a>
          </div>
        </section>

        {/* 涨跌停列表 + AI 评分 */}
        <section className="mt-4 neo-fade-up" style={{ animationDelay: "140ms" }}>
          <LimitListWithScore
            upStocks={dashboard.limit_up}
            downStocks={dashboard.limit_down}
          />
        </section>

        {/* 强势行业 + AI 快速诊断 */}
        {dashboard.strong_industries && dashboard.strong_industries.length > 0 && (
          <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5 neo-fade-up" style={{ animationDelay: "180ms" }}>
            <div className="lg:col-span-3 neo-card p-5">
              <h3 className="mb-3 text-[14px] font-semibold text-neo-ink">强势行业</h3>
              <div className="space-y-2">
                {dashboard.strong_industries.slice(0, 8).map((ind) => (
                  <div key={ind.name} className="flex items-center justify-between rounded-lg px-3 py-2 transition-colors hover-neo-inset">
                    <span className="text-[13px] font-medium text-neo-ink">{ind.name}</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[13px] font-semibold ${neoTrendClass(ind.change_pct)}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                        {formatPct(ind.change_pct)}
                      </span>

                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:col-span-2">
              <AIQuickDiagnosis />
            </div>
          </section>
        )}

        {/* 市场快讯 */}
        {insights && insights.news && insights.news.length > 0 && (
          <section className="mt-4 neo-fade-up" style={{ animationDelay: "200ms" }}>
            <h3 className="mb-2 text-[14px] font-semibold text-neo-ink">市场快讯</h3>
            <div className="flex gap-3 overflow-x-auto scrollbar-thin pb-2">
              {insights.news.slice(0, 3).map((n) => (
                <a
                  key={n.id}
                  href={n.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="neo-card-sm block min-w-[280px] flex-shrink-0 p-4 transition-all duration-200 hover:-translate-y-0.5"
                >
                  <div className="flex items-center gap-2 text-[10px] text-neo-dim">
                    <span className="font-medium text-neo-primary">{n.source}</span>
                    <span>·</span>
                    <span style={{ fontFamily: 'var(--font-inter), system-ui' }}>{(n.time || "").slice(5, 16)}</span>
                  </div>
                  <h4 className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-neo-ink">{n.title}</h4>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* AI 聚焦 */}
        {insights && (
          <section className="mt-6 neo-fade-up" style={{ animationDelay: "220ms" }}>
            <div className="neo-ai p-6">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-neo-primary-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">
                  AI 聚焦
                </span>
                <span className="text-[11px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{insights.generated_at}</span>
              </div>
              <p className="text-[14px] leading-relaxed text-neo-mid">{insights.focus}</p>

              {insights.hot_sectors && insights.hot_sectors.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-2">
                  {insights.hot_sectors.map((s) => (
                    <a
                      key={s.name}
                      href="/market/"
                      className={`neo-chip px-3 py-1 text-[12px] font-medium ${s.change_pct > 0 ? "text-neo-up" : "text-neo-down"}`}
                    >
                      {s.name} <span className="ml-1" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPct(s.change_pct)}</span>
                    </a>
                  ))}
                </div>
              )}

              {insights.reports && insights.reports.length > 0 && (
                <div className="mt-4 pt-3" style={{ borderTop: '1px solid var(--neo-surface-active)' }}>
                  <div className="mb-1.5 text-[10px] uppercase tracking-wider text-neo-dim">研报</div>
                  <div className="space-y-1">
                    {insights.reports.slice(0, 4).map((r) => (
                      <a
                        key={r.id}
                        href={r.url || "#"}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover-neo-inset"
                      >
                        <span className="text-[11px] font-medium text-neo-primary">{r.source}</span>
                        <span className="truncate text-[13px] text-neo-mid">{r.title}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </section>
        )}

        {/* 资讯 */}
        {insights && insights.news.length > 0 && (
          <section className="mt-4 neo-fade-up" style={{ animationDelay: "260ms" }}>
            <div className="mb-2.5 flex items-center justify-between">
              <h3 className="text-[16px] font-bold tracking-tight text-neo-ink">资讯</h3>
              <span className="text-[11px] text-neo-dim">{insights.news.length} 条</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              {insights.news.slice(0, 6).map((n, i) => (
                <a
                  key={n.id}
                  href={n.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`neo-card-sm p-4 transition-all duration-200 hover:-translate-y-0.5 ${i === 0 ? "md:col-span-2" : ""}`}
                >
                  <div className="flex items-center gap-2 text-[10px] text-neo-dim">
                    <span className="font-medium text-neo-primary">{n.source}</span>
                    <span>·</span>
                    <span>{n.time || ""}</span>
                  </div>
                  <h4 className={`mt-1.5 text-[13px] font-medium leading-snug text-neo-ink ${i === 0 ? "line-clamp-2" : "line-clamp-1"}`}>
                    {n.title}
                  </h4>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* CTA */}
        <section className="mt-8 neo-fade-up" style={{ animationDelay: "300ms" }}>
          <div className="neo-card flex items-center justify-between px-6 py-4">
            <div>
              <h3 className="text-[14px] font-semibold text-neo-ink">AI 复盘 · 智能盯盘</h3>
              <p className="mt-0.5 text-[12px] text-neo-dim">
                {insights?.focus ? "查看完整复盘报告" : "市场数据已更新"}
              </p>
            </div>
            <div className="flex gap-2">
              <a href="/review/" className="neo-btn-primary px-4 py-1.5 text-[12px]">
                复盘报告
              </a>
              <a href="/alerts" className="neo-btn px-4 py-1.5 text-[12px]">
                智能盯盘
              </a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
