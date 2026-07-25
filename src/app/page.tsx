import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { IndexCard, LimitStockList, IndustryCard, NewsCard, MarketStatCard } from "@/components/market";
import { api, type Dashboard, type Insights } from "@/lib/api";
import { formatPct } from "@/lib/format";

export const revalidate = 30;

export default async function HomePage() {
  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;

  try {
    [dashboard, insights] = await Promise.all([
      api.getDashboard(),
      api.getInsights(),
    ]);
  } catch (e) {
    console.error("Failed to fetch homepage data:", e);
  }

  if (!dashboard) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-20 text-center">
          <p className="text-[var(--text-secondary)]">数据加载中</p>
          <p className="mt-2 text-xs text-[var(--text-tertiary)]">
            如果持续无数据，请检查后端服务是否正常
          </p>
        </main>
        <Footer />
      </>
    );
  }

  const upCount = dashboard.limit_up_count;
  const downCount = dashboard.limit_down_count;
  const upRatio = upCount + downCount > 0 ? (upCount / (upCount + downCount) * 100).toFixed(1) : "0";
  const sentiment = upCount > downCount * 2 ? "多头主导"
    : upCount > downCount ? "偏多"
    : downCount > upCount * 2 ? "空头主导"
    : downCount > upCount ? "偏空"
    : "多空均衡";

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        {/* === 三大指数 === */}
        <section className="animate-fade-up">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h2 className="text-base font-semibold text-[var(--text-primary)]">市场总览</h2>
              {dashboard.market_status === "complete" ? (
                <span className="flex items-center gap-1 rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-[11px] text-[var(--text-tertiary)]">
                  <span className="h-1.5 w-1.5 rounded-full bg-[var(--text-tertiary)]" />
                  已收盘
                </span>
              ) : (
                <span className="flex items-center gap-1 rounded bg-up-soft px-2 py-0.5 text-[11px] text-up">
                  <span className="h-1.5 w-1.5 rounded-full bg-up pulse-dot" />
                  交易中
                </span>
              )}
            </div>
            <span className="font-num text-xs text-[var(--text-tertiary)]">
              {dashboard.index.date} · 更新于 {dashboard.market_updated_at}
            </span>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard.indices.map((idx) => (
              <IndexCard key={idx.code} data={idx} />
            ))}
          </div>
        </section>

        {/* === 市场情绪统计 === */}
        <section className="mt-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            <MarketStatCard
              label="涨停"
              value={upCount}
              trend={1}
              sub={`占比 ${upRatio}%`}
            />
            <MarketStatCard
              label="跌停"
              value={downCount}
              trend={-1}
              sub={`占比 ${(100 - parseFloat(upRatio)).toFixed(1)}%`}
            />
            <MarketStatCard
              label="涨跌比"
              value={upCount > 0 && downCount > 0 ? (upCount / downCount).toFixed(2) : "-"}
              sub={upCount > downCount ? "多头占优" : "空头占优"}
            />
            <MarketStatCard
              label="市场情绪"
              value={sentiment}
              sub={upCount > downCount ? "偏多" : "偏空"}
            />
          </div>
        </section>

        {/* === 涨停板 + 跌停板 === */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LimitStockList
            title="涨停板"
            stocks={dashboard.limit_up.slice(0, 10)}
            type="up"
            delay={120}
          />
          <LimitStockList
            title="跌停板"
            stocks={dashboard.limit_down.slice(0, 10)}
            type="down"
            delay={180}
          />
        </section>

        {/* === 强势行业 + 市场聚焦 === */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <IndustryCard
            industries={dashboard.strong_industries}
            delay={240}
          />
          {insights && (
            <div
              className="animate-fade-up flex flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5"
              style={{ animationDelay: "300ms" }}
            >
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand">
                  市场聚焦
                </span>
                <span className="font-num text-[11px] text-[var(--text-tertiary)]">
                  {insights.generated_at}
                </span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-primary)]">
                {insights.focus}
              </p>
              <div className="mt-4">
                <div className="mb-2 text-xs text-[var(--text-secondary)]">热门板块</div>
                <div className="flex flex-wrap gap-2">
                  {insights.hot_sectors.map((s) => (
                    <a
                      key={s.name}
                      href={`/market/`}
                      className={`row-hover rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs transition-fast ${s.change_pct > 0 ? "text-up" : "text-down"}`}
                    >
                      {s.name} <span className="font-num">{formatPct(s.change_pct)}</span>
                    </a>
                  ))}
                </div>
              </div>
              {insights.reports && insights.reports.length > 0 && (
                <div className="mt-4 pt-3 border-t border-[var(--border-subtle)]">
                  <div className="mb-2 text-xs text-[var(--text-secondary)]">研报</div>
                  <div className="space-y-1.5">
                    {insights.reports.slice(0, 3).map((r) => (
                      <a
                        key={r.id}
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="row-hover block rounded px-2 py-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-[var(--text-tertiary)]">{r.source}</span>
                          <span className="truncate text-xs text-[var(--text-secondary)]">{r.title}</span>
                        </div>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>

        {/* === 新闻资讯 === */}
        {insights && insights.news.length > 0 && (
          <section className="mt-6 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-base font-semibold text-[var(--text-primary)]">市场资讯</h3>
              <span className="text-xs text-[var(--text-tertiary)]">{insights.news.length} 条</span>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
              {insights.news.slice(0, 6).map((n) => (
                <NewsCard key={n.id} news={n} />
              ))}
            </div>
          </section>
        )}

        {/* === AI 复盘入口 === */}
        <section className="mt-6 animate-fade-up" style={{ animationDelay: "420ms" }}>
          <div className="relative overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
            {/* 装饰渐变 */}
            <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-brand-soft to-transparent" />
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand">
                    AI 复盘
                  </span>
                  <h3 className="text-base font-semibold text-[var(--text-primary)]">今日市场复盘</h3>
                </div>
                <p className="mt-3 max-w-[600px] text-sm leading-relaxed text-[var(--text-secondary)]">
                  {insights?.focus || "市场数据已更新，AI 复盘分析正在生成中"}
                </p>
              </div>
              <div className="flex shrink-0 gap-3">
                <a
                  href="/review/"
                  className="rounded-md bg-brand px-4 py-2 text-sm font-medium text-white transition-fast hover:bg-[var(--brand-hover)] active:translate-y-px"
                >
                  查看完整复盘
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
