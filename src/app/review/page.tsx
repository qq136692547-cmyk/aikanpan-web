import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { api, type Dashboard, type Insights } from "@/lib/api";
import { formatPct, formatPrice, trendClass, trendBgClass } from "@/lib/format";

export const revalidate = 60;

export default async function ReviewPage() {
  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;

  try {
    [dashboard, insights] = await Promise.all([
      api.getDashboard(),
      api.getInsights(),
    ]);
  } catch (e) {
    console.error("Failed to fetch review data:", e);
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
        {/* Header */}
        <section className="animate-fade-up">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold text-[var(--text-primary)]">每日复盘</h1>
              <p className="mt-1 text-xs text-[var(--text-tertiary)]">{dashboard.index.date} · 更新于 {dashboard.market_updated_at}</p>
            </div>
            <span className={`rounded px-3 py-1 text-sm font-medium ${dashboard.market_status === "complete" ? "bg-[var(--bg-elevated)] text-[var(--text-tertiary)]" : "bg-up-soft text-up"}`}>
              {dashboard.market_status === "complete" ? "已收盘" : "交易中"}
            </span>
          </div>
        </section>

        {/* AI Summary */}
        {insights && (
          <section className="mt-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
            <div className="relative overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6">
              <div className="absolute right-0 top-0 h-full w-1/3 bg-gradient-to-l from-brand-soft to-transparent" />
              <div className="relative">
                <div className="flex items-center gap-2">
                  <span className="rounded bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand">AI 复盘</span>
                  <span className="font-num text-[11px] text-[var(--text-tertiary)]">{insights.generated_at}</span>
                </div>
                <p className="mt-4 text-base leading-relaxed text-[var(--text-primary)]">{insights.focus}</p>
              </div>
            </div>
          </section>
        )}

        {/* Market Overview */}
        <section className="mt-6 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">市场概览</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-up" />
                <span className="text-xs text-[var(--text-secondary)]">涨停</span>
              </div>
              <div className="font-num mt-2 text-2xl font-bold text-up">{upCount}</div>
              <div className="mt-1 text-xs text-[var(--text-tertiary)]">占比 {upRatio}%</div>
            </div>
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="flex items-center gap-2">
                <span className="h-1.5 w-1.5 rounded-full bg-down" />
                <span className="text-xs text-[var(--text-secondary)]">跌停</span>
              </div>
              <div className="font-num mt-2 text-2xl font-bold text-down">{downCount}</div>
              <div className="mt-1 text-xs text-[var(--text-tertiary)]">占比 {(100 - parseFloat(upRatio)).toFixed(1)}%</div>
            </div>
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs text-[var(--text-secondary)]">涨跌比</div>
              <div className="font-num mt-2 text-2xl font-bold text-[var(--text-primary)]">
                {upCount > 0 && downCount > 0 ? (upCount / downCount).toFixed(2) : "-"}
              </div>
              <div className="mt-1 text-xs text-[var(--text-tertiary)]">{upCount > downCount ? "多头占优" : "空头占优"}</div>
            </div>
            <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
              <div className="text-xs text-[var(--text-secondary)]">市场情绪</div>
              <div className="mt-2 text-2xl font-bold text-[var(--text-primary)]">{sentiment}</div>
              <div className="mt-1 text-xs text-[var(--text-tertiary)]">{upCount > downCount ? "偏多" : "偏空"}</div>
            </div>
          </div>
        </section>

        {/* Indices */}
        <section className="mt-6 animate-fade-up" style={{ animationDelay: "180ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">指数表现</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {dashboard.indices.map((idx) => {
              const t = trendClass(idx.change_pct);
              const bgT = trendBgClass(idx.change_pct);
              return (
                <div key={idx.code} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{idx.name}</span>
                    <span className={`rounded px-2 py-0.5 text-xs font-medium ${bgT} ${t}`}>{formatPct(idx.change_pct)}</span>
                  </div>
                  <div className={`font-num mt-2 text-2xl font-bold ${t}`}>{formatPrice(idx.last)}</div>
                  <div className={`font-num mt-1 text-sm ${t}`}>{idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Strong Industries */}
        <section className="mt-6 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">强势行业</h2>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5">
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dashboard.strong_industries.map((ind, i) => {
                const t = trendClass(ind.change_pct);
                return (
                  <div key={ind.name} className="row-hover flex items-center gap-3 rounded px-2 py-2">
                    <span className="font-num w-6 text-xs text-[var(--text-tertiary)]">{String(i + 1).padStart(2, "0")}</span>
                    <span className="flex-1 truncate text-sm text-[var(--text-primary)]">{ind.name}</span>
                    <span className={`font-num text-sm font-medium ${t}`}>{formatPct(ind.change_pct)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* News */}
        {insights && insights.news.length > 0 && (
          <section className="mt-6 animate-fade-up" style={{ animationDelay: "300ms" }}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">市场资讯 ({insights.news.length})</h2>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {insights.news.map((n) => (
                <a
                  key={n.id}
                  href={n.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-hover group flex flex-col rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                >
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-[var(--text-secondary)]">{n.source}</span>
                    <span className="text-[var(--border-default)]">|</span>
                    <span className="font-num text-[var(--text-tertiary)]">{(n.time || "").slice(5, 16)}</span>
                  </div>
                  <h4 className="mt-2 line-clamp-2 text-sm font-medium text-[var(--text-primary)] transition-fast group-hover:text-brand">{n.title}</h4>
                  <p className="mt-1.5 line-clamp-3 text-xs leading-relaxed text-[var(--text-secondary)]">{n.summary}</p>
                  <div className="mt-auto pt-2">
                    <span className="text-[11px] text-[var(--text-tertiary)] transition-fast group-hover:text-brand">阅读全文 →</span>
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Reports */}
        {insights && insights.reports && insights.reports.length > 0 && (
          <section className="mt-6 animate-fade-up" style={{ animationDelay: "360ms" }}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">研报精选 ({insights.reports.length})</h2>
            <div className="space-y-2">
              {insights.reports.map((r) => (
                <a
                  key={r.id}
                  href={r.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="card-hover group flex items-start gap-4 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 text-[11px]">
                      <span className="text-[var(--text-secondary)]">{r.source}</span>
                      <span className="text-[var(--border-default)]">|</span>
                      <span className="font-num text-[var(--text-tertiary)]">{(r.publish_at || r.time || "").slice(0, 10)}</span>
                    </div>
                    <h4 className="mt-1.5 text-sm font-medium text-[var(--text-primary)] transition-fast group-hover:text-brand">{r.title}</h4>
                    {r.summary && <p className="mt-1 line-clamp-2 text-xs text-[var(--text-secondary)]">{r.summary}</p>}
                  </div>
                </a>
              ))}
            </div>
          </section>
        )}

        {/* Limit Lists */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="animate-fade-up overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]" style={{ animationDelay: "420ms" }}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-up" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">涨停板</h3>
              </div>
              <span className="text-xs text-up">共 {dashboard.limit_up.length} 只</span>
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {dashboard.limit_up.map((s) => (
                <a key={s.code} href={`/stock/${s.code.replace(/\./, "")}/`} className="row-hover flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2 text-sm last:border-b-0">
                  <div className="flex flex-1 flex-col">
                    <span className="truncate font-medium text-[var(--text-primary)]">{s.name}</span>
                    <span className="font-num text-[10px] text-[var(--text-tertiary)]">{s.code}</span>
                  </div>
                  <span className="font-num text-right text-up">{s.price.toFixed(2)}</span>
                  <span className="font-num w-20 text-right font-medium text-up">{formatPct(s.pct)}</span>
                </a>
              ))}
            </div>
          </div>
          <div className="animate-fade-up overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]" style={{ animationDelay: "480ms" }}>
            <div className="flex items-center justify-between border-b border-[var(--border-subtle)] px-4 py-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-down" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">跌停板</h3>
              </div>
              <span className="text-xs text-down">共 {dashboard.limit_down.length} 只</span>
            </div>
            <div className="max-h-96 overflow-y-auto scrollbar-thin">
              {dashboard.limit_down.map((s) => (
                <a key={s.code} href={`/stock/${s.code.replace(/\./, "")}/`} className="row-hover flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-2 text-sm last:border-b-0">
                  <div className="flex flex-1 flex-col">
                    <span className="truncate font-medium text-[var(--text-primary)]">{s.name}</span>
                    <span className="font-num text-[10px] text-[var(--text-tertiary)]">{s.code}</span>
                  </div>
                  <span className="font-num text-right text-down">{s.price.toFixed(2)}</span>
                  <span className="font-num w-20 text-right font-medium text-down">{formatPct(s.pct)}</span>
                </a>
              ))}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
