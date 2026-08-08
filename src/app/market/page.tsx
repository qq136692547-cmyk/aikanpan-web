import { Navbar } from "@/components/layout/navbar";
import { AutoRefresh } from "@/components/system/auto-refresh";
import { Footer } from "@/components/layout/footer";
import { SortableSectorTable } from "@/components/market/sortable-sector-table";
import { UsDashboardSection } from "@/components/us/us-dashboard-section";
import { api, type Dashboard, type Insights, type LimitStock, type Sector, type UsDashboard } from "@/lib/api";
import { formatPct, formatPrice } from "@/lib/format";
import { marketPhaseText } from "@/lib/market-status";
import { marketFromSearchParams } from "@/lib/market";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "市场总览",
  description: "A股三大指数、行业板块行情、涨停跌停个股一览。",
};

const marketJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "市场总览 · 爱看盘",
  description: "A股三大指数、行业板块行情、涨停跌停个股一览",
  isPartOf: { "@type": "WebSite", name: "爱看盘", url: "https://aikanpan.top" },
  about: ["A股", "股票行情", "行业板块", "涨停跌停"],
};

/** Neomorphism 趋势文字 class */
function neoTrendClass(pct: number) {
  return pct > 0 ? "text-neo-up" : pct < 0 ? "text-neo-down" : "text-neo-mid";
}

/** Neomorphism 趋势背景 class */
function neoTrendBgClass(pct: number) {
  return pct > 0 ? "neo-up-soft" : pct < 0 ? "neo-down-soft" : "neo-inset";
}

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;
  let sectorsData: { sectors: Sector[]; count: number } | null = null;
  let usDashboard: UsDashboard | null = null;

  const { market: marketParam } = await searchParams;
  const scope = marketFromSearchParams(marketParam);
  try {
    [dashboard, insights, sectorsData] = await Promise.all([
      api.getDashboard(),
      api.getInsights(),
      api.getSectors(),
    ]);
  } catch (e) {
    console.error("Failed to fetch market data:", e);
  }
  if (scope !== "cn") {
    try {
      usDashboard = await api.getUsDashboard();
    } catch (e) {
      console.error("Failed to fetch US market data:", e);
    }
  }

  if (scope === "us" && usDashboard) {
    return (
      <div className="neo-page">
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-3 sm:px-6 sm:py-4">
          <AutoRefresh />
          <UsDashboardSection dashboard={usDashboard} />
        </main>
        <Footer />
      </div>
    );
  }

  if (!dashboard) {
    return (
      <div className="neo-page">
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6">
          <div className="neo-skeleton mb-4 h-6 w-32" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="neo-skeleton h-28" />
            <div className="neo-skeleton h-28" />
            <div className="neo-skeleton h-28" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-3 sm:px-6 sm:py-4">
      <AutoRefresh />
        {/* Header */}
        <section className="relative overflow-hidden rounded-xl">
          {/* 市场热力图装饰背景 */}
          <img loading="lazy"
            src="/images/ai-art/market-heatmap.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-30"
          />
          <div className="relative flex items-center justify-between overflow-hidden py-1">
            <h1 className="text-[14px] font-medium text-neo-ink shrink-0">市场总览</h1>
            <span className="text-[11px] text-neo-dim truncate ml-2" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
              {dashboard.index?.date ?? ""} · {marketPhaseText(dashboard.market_phase)}
            </span>
          </div>
        </section>

        {/* Indices */}
        <section className="mt-3">
          <h2 className="mb-2 text-[12px] text-neo-mid">三大指数</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(dashboard.indices || []).map((idx) => {
              const t = neoTrendClass(idx.change_pct);
              const bgT = neoTrendBgClass(idx.change_pct);
              return (
                <div key={idx.code} className="neo-card-sm p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-baseline gap-1.5">
                      <span className="text-[13px] font-medium text-neo-ink">{idx.name}</span>
                      <span className="text-[10px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{idx.code}</span>
                    </div>
                    <span className={`px-1.5 py-0.5 text-[11px] ${bgT} ${t}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPct(idx.change_pct)}</span>
                  </div>
                  <div className="mt-2 flex items-baseline gap-2">
                    <span className={`text-2xl font-semibold ${t}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPrice(idx.last)}</span>
                    <span className={`text-[12px] ${t}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)}</span>
                  </div>
                  <div className="mt-1 text-[10px] text-neo-dim">{idx.date} · {idx.source}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* Sectors */}
        {sectorsData && sectorsData.sectors && sectorsData.sectors.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-2 text-[12px] text-neo-mid">行业板块 ({sectorsData.count ?? 0})</h2>
            <SortableSectorTable sectors={sectorsData.sectors} />
          </section>
        )}

        {/* Limit Up / Down */}
        <section className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
          <LimitTable title="涨停板" stocks={dashboard.limit_up || []} type="up" />
          <LimitTable title="跌停板" stocks={dashboard.limit_down || []} type="down" />
        </section>

        {/* Strong Industries + Market Focus */}
        <section className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
          {dashboard.strong_industries && dashboard.strong_industries.length > 0 && (
            <div className="neo-card p-4">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-[12px] font-medium text-neo-ink">强势行业 TOP{dashboard.strong_industries.length}</h3>
              </div>
              <div className="space-y-0.5">
                {dashboard.strong_industries.map((ind, i) => {
                  const t = neoTrendClass(ind.change_pct);
                  const maxPct = Math.max(...dashboard.strong_industries.map(x => Math.abs(x.change_pct)), 0.1);
                  const barWidth = Math.min(Math.abs(ind.change_pct) / maxPct * 100, 100);
                  return (
                    <div key={ind.name} className="transition-colors hover-neo-inset flex items-center gap-3 px-1 py-1.5">
                      <span className="w-5 text-[11px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{i + 1}</span>
                      <span className="flex-1 truncate text-[13px] text-neo-ink">{ind.name}</span>
                      <div className="hidden h-1 w-16 overflow-hidden neo-inset sm:block">
                        <div className={`h-full ${ind.change_pct > 0 ? "bg-neo-up" : "bg-neo-down"}`} style={{ width: `${barWidth}%` }} />
                      </div>
                      <span className={`w-14 text-right text-[13px] ${t}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPct(ind.change_pct)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {insights && (
            <div className="neo-card p-4">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-medium text-neo-ink">市场聚焦</span>
                <span className="text-[10px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{insights.generated_at}</span>
              </div>
              <p className="text-[13px] leading-relaxed text-neo-mid">{insights.focus}</p>
              {insights.hot_sectors && insights.hot_sectors.length > 0 && (
                <div className="mt-3 pt-2">
                  <div className="mb-1.5 text-[11px] text-neo-dim">热门板块</div>
                  <div className="flex flex-wrap gap-1">
                    {insights.hot_sectors.map((s) => (
                      <span key={s.name} className={`neo-inset px-2 py-0.5 text-[11px] ${s.change_pct > 0 ? "text-neo-up" : "text-neo-down"}`}>
                        {s.name} <span style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPct(s.change_pct)}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </section>
        {scope === "all" && usDashboard && (
          <UsDashboardSection dashboard={usDashboard} />
        )}
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(marketJsonLd) }}
      />
    </div>
  );
}

function LimitTable({ title, stocks = [], type }: { title: string; stocks?: LimitStock[]; type: "up" | "down" }) {
  const headerColor = type === "up" ? "text-neo-up" : "text-neo-down";

  return (
    <div className="neo-card-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-[12px] font-medium text-neo-ink">{title}</h3>
        <span className={`text-[11px] ${headerColor}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{stocks.length} 只</span>
      </div>
      <div className="max-h-[600px] overflow-x-auto overflow-y-auto neo-scrollbar">
        <table className="w-full min-w-[560px]">
          <thead className="sticky top-0 bg-[var(--neo-surface)]">
            <tr className="text-[10px] uppercase tracking-wide text-neo-dim">
              <th className="px-3 py-1.5 text-left font-normal">名称 / 代码</th>
              <th className="px-3 py-1.5 text-right font-normal">价格</th>
              <th className="px-3 py-1.5 text-right font-normal">涨跌幅</th>
              <th className="hidden px-3 py-1.5 text-right font-normal sm:table-cell">类型</th>
            </tr>
          </thead>
          <tbody>
            {stocks.map((s) => {
              const t = neoTrendClass(s.pct);
              const href = `/stock/${s.code.replace(/\./, "")}/`;
              return (
                <tr key={s.code} className="transition-colors hover-neo-inset">
                  <td className="px-3 py-1.5">
                    <a href={href} className="flex flex-col">
                      <span className="truncate text-[13px] font-medium text-neo-ink">{s.name}</span>
                      <span className="text-[10px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{s.code}</span>
                    </a>
                  </td>
                  <td className="px-3 py-1.5 text-right text-[13px]">
                    <span className={t} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{s.price.toFixed(2)}</span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-[13px]">
                    <span className={t} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPct(s.pct)}</span>
                  </td>
                  <td className="hidden px-3 py-1.5 text-right sm:table-cell">
                    <span className="neo-inset px-1 py-0.5 text-[10px] text-neo-mid">{s.tag}</span>
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
