import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { api, type Dashboard, type Insights, type Sector } from "@/lib/api";
import { formatPct, formatPrice, trendClass, trendBgClass } from "@/lib/format";

export const revalidate = 60;

export default async function MarketPage() {
  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;
  let sectorsData: { sectors: Sector[]; count: number } | null = null;

  try {
    [dashboard, insights, sectorsData] = await Promise.all([
      api.getDashboard(),
      api.getInsights(),
      api.getSectors(),
    ]);
  } catch (e) {
    console.error("Failed to fetch market data:", e);
  }

  if (!dashboard) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-20 text-center">
          <p className="text-[var(--text-secondary)]">数据加载中</p>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        {/* Header */}
        <section className="animate-fade-up">
          <div className="flex items-center justify-between">
            <h1 className="text-xl font-bold text-[var(--text-primary)]">市场总览</h1>
            <span className="font-num text-xs text-[var(--text-tertiary)]">
              {dashboard.index.date} · {dashboard.market_status === "complete" ? "已收盘" : "交易中"}
            </span>
          </div>
        </section>

        {/* Indices */}
        <section className="mt-4 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">三大指数</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {dashboard.indices.map((idx) => {
              const t = trendClass(idx.change_pct);
              const bgT = trendBgClass(idx.change_pct);
              return (
                <div key={idx.code} className="card-hover rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{idx.name}</span>
                      <span className="font-num text-xs text-[var(--text-tertiary)]">{idx.code}</span>
                    </div>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${bgT} ${t}`}>{formatPct(idx.change_pct)}</span>
                  </div>
                  <div className="mt-3 flex items-baseline gap-3">
                    <span className={`font-num text-3xl font-bold ${t}`}>{formatPrice(idx.last)}</span>
                    <span className={`font-num text-sm ${t}`}>{idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)}</span>
                  </div>
                  <div className="mt-2 text-xs text-[var(--text-tertiary)]">{idx.date} · 数据源 {idx.source}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sectors */}
        {sectorsData && sectorsData.sectors.length > 0 && (
          <section className="mt-6 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">行业板块 ({sectorsData.count})</h2>
            <div className="overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                    <th className="px-4 py-2 text-left font-medium">板块名称</th>
                    <th className="px-4 py-2 text-right font-medium">最新价</th>
                    <th className="px-4 py-2 text-right font-medium">涨跌幅</th>
                    <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">涨跌额</th>
                    <th className="hidden px-4 py-2 text-right font-medium md:table-cell">换手率</th>
                  </tr>
                </thead>
                <tbody>
                  {sectorsData.sectors.map((s) => {
                    const t = trendClass(s.change_pct);
                    return (
                      <tr key={s.code} className="row-hover border-b border-[var(--border-subtle)] last:border-b-0">
                        <td className="px-4 py-2.5 text-sm text-[var(--text-primary)]">
                          <div className="flex items-center gap-2">
                            <span className="font-num text-[10px] text-[var(--text-tertiary)]">{s.code}</span>
                            <span>{s.name}</span>
                          </div>
                        </td>
                        <td className={`font-num px-4 py-2.5 text-right text-sm ${t}`}>{s.price.toFixed(2)}</td>
                        <td className={`font-num px-4 py-2.5 text-right text-sm font-medium ${t}`}>{formatPct(s.change_pct)}</td>
                        <td className={`font-num hidden px-4 py-2.5 text-right text-sm ${t} sm:table-cell`}>
                          {s.change >= 0 ? "+" : ""}{s.change.toFixed(2)}
                        </td>
                        <td className="font-num hidden px-4 py-2.5 text-right text-sm text-[var(--text-secondary)] md:table-cell">
                          {s.turnover_rate.toFixed(2)}%
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* Limit Up / Down Full Lists */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <LimitTable title="涨停板" stocks={dashboard.limit_up} type="up" delay={180} />
          <LimitTable title="跌停板" stocks={dashboard.limit_down} type="down" delay={240} />
        </section>

        {/* Strong Industries + Market Focus */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="animate-fade-up rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5" style={{ animationDelay: "300ms" }}>
            <div className="mb-3 flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-brand pulse-dot" />
              <h3 className="text-sm font-semibold text-[var(--text-primary)]">强势行业 TOP{dashboard.strong_industries.length}</h3>
            </div>
            <div className="space-y-1">
              {dashboard.strong_industries.map((ind, i) => {
                const t = trendClass(ind.change_pct);
                const maxPct = Math.max(...dashboard.strong_industries.map(x => Math.abs(x.change_pct)), 0.1);
                const barWidth = Math.min(Math.abs(ind.change_pct) / maxPct * 100, 100);
                return (
                  <div key={ind.name} className="row-hover flex items-center gap-3 rounded px-2 py-2">
                    <span className="font-num w-6 text-xs text-[var(--text-tertiary)]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 truncate text-sm text-[var(--text-primary)]">{ind.name}</span>
                    <div className="hidden h-1.5 w-20 overflow-hidden rounded-full bg-[var(--bg-elevated)] sm:block">
                      <div className={`h-full rounded-full ${ind.change_pct > 0 ? "bg-up" : "bg-down"}`} style={{ width: `${barWidth}%` }} />
                    </div>
                    <span className={`font-num w-16 text-right text-sm font-medium ${t}`}>{formatPct(ind.change_pct)}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {insights && (
            <div className="animate-fade-up rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5" style={{ animationDelay: "360ms" }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand">市场聚焦</span>
                <span className="font-num text-[11px] text-[var(--text-tertiary)]">{insights.generated_at}</span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-primary)]">{insights.focus}</p>
              <div className="mt-4">
                <div className="mb-2 text-xs text-[var(--text-secondary)]">热门板块</div>
                <div className="flex flex-wrap gap-2">
                  {insights.hot_sectors.map((s) => (
                    <span key={s.name} className={`rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs ${s.change_pct > 0 ? "text-up" : "text-down"}`}>
                      {s.name} <span className="font-num">{formatPct(s.change_pct)}</span>
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

function LimitTable({ title, stocks, type, delay }: { title: string; stocks: any[]; type: "up" | "down"; delay: number }) {
  const headerColor = type === "up" ? "text-up" : "text-down";
  const headerDot = type === "up" ? "bg-up" : "bg-down";

  return (
    <div className="animate-fade-up overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]" style={{ animationDelay: `${delay}ms` }}>
      <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
        <div className="flex items-center gap-2">
          <span className={`h-2 w-2 rounded-full ${headerDot}`} />
          <h3 className="text-sm font-semibold text-[var(--text-primary)]">{title}</h3>
        </div>
        <span className={`text-xs ${headerColor}`}>共 {stocks.length} 只</span>
      </div>
      <div className="max-h-[600px] overflow-y-auto scrollbar-thin">
        <table className="w-full">
          <thead className="sticky top-0 bg-[var(--bg-surface)]">
            <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
              <th className="px-4 py-2 text-left font-medium">名称 / 代码</th>
              <th className="px-4 py-2 text-right font-medium">价格</th>
              <th className="px-4 py-2 text-right font-medium">涨跌幅</th>
              <th className="hidden px-4 py-2 text-right font-medium sm:table-cell">类型</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => {
              const t = trendClass(s.pct);
              const href = `/stock/${s.code.replace(/\./, "")}/`;
              return (
                <tr key={s.code} className="row-hover border-b border-[var(--border-subtle)] last:border-b-0">
                  <td className="px-4 py-2 text-sm">
                    <a href={href} className="flex flex-col">
                      <span className="truncate font-medium text-[var(--text-primary)]">{s.name}</span>
                      <span className="font-num text-[10px] text-[var(--text-tertiary)]">{s.code}</span>
                    </a>
                  </td>
                  <td className={`font-num px-4 py-2 text-right text-sm ${t}`}>{s.price.toFixed(2)}</td>
                  <td className={`font-num px-4 py-2 text-right text-sm font-medium ${t}`}>{formatPct(s.pct)}</td>
                  <td className="hidden px-4 py-2 text-right sm:table-cell">
                    <span className="rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-secondary)]">{s.tag}</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
