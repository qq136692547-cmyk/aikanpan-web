import { MarketPageFrame } from "@/components/market/market-page-shell";
import { AutoRefresh } from "@/components/system/auto-refresh";
import { MarketOverviewTemplate, type MarketOverviewIndex, type MarketOverviewSection } from "@/components/market/market-overview-template";
import { MarketEarningsCalendar } from "@/components/market/market-earnings-calendar";
import { UsDailyReview } from "@/components/us/us-daily-review";
import { UsWatchlistButton } from "@/components/us/us-watchlist-button";
import { api, type Dashboard, type Insights, type LimitStock, type Sector, type UsDashboard } from "@/lib/api";
import { formatPct, formatPrice } from "@/lib/format";
import { usNameZh } from "@/lib/us-stock-names";
import { marketPhaseText } from "@/lib/market-status";
import { marketFromSearchParams } from "@/lib/market";
import { redirect } from "next/navigation";
import type { MarketSectorRow } from "@/components/market/sortable-sector-table";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "市场总览",
  description: "A股与美股市场总览，统一呈现指数、板块、结构、AI 聚焦与近期财报。",
};

const marketJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebPage",
  name: "市场总览 · 爱看盘",
  description: "A股与美股市场总览，统一呈现指数、板块、结构、AI 聚焦与近期财报",
  isPartOf: { "@type": "WebSite", name: "爱看盘", url: "https://aikanpan.top" },
  about: ["A股", "美股", "股票行情", "行业板块", "AI 聚焦"],
};

function trendClass(pct: number) {
  if (pct > 0) return "text-neo-up";
  if (pct < 0) return "text-neo-down";
  return "text-neo-mid";
}

export default async function MarketPage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const { market: marketParam } = await searchParams;
  const scope = marketFromSearchParams(marketParam);
  if (scope === "all") {
    redirect("/market/?market=cn");
  }

  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;
  let sectorsData: { sectors: Sector[]; count: number } | null = null;
  let usDashboard: UsDashboard | null = null;

  if (scope === "cn") {
    try {
      [dashboard, insights, sectorsData] = await Promise.all([
        api.getDashboard(),
        api.getInsights(),
        api.getSectors(),
      ]);
    } catch (error) {
      console.error("Failed to fetch CN market data:", error);
    }
  } else {
    try {
      usDashboard = await api.getUsDashboard();
    } catch (error) {
      console.error("Failed to fetch US market data:", error);
    }
  }

  const hasData = scope === "cn" ? Boolean(dashboard) : Boolean(usDashboard);

  if (!hasData) {
    return (
      <MarketPageFrame market={scope}>
          <div className="neo-skeleton mb-4 h-6 w-32" />
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <div className="neo-skeleton h-28" />
            <div className="neo-skeleton h-28" />
            <div className="neo-skeleton h-28" />
          </div>
      </MarketPageFrame>
    );
  }

  const indices: MarketOverviewIndex[] =
    scope === "cn"
      ? (dashboard?.indices ?? []).map((idx) => ({
          code: idx.code ?? "",
          name: idx.name,
          last: idx.last,
          change: idx.change,
          change_pct: idx.change_pct,
          date: idx.date,
          source: idx.source,
        }))
      : (usDashboard?.indices ?? []).map((idx) => ({
          code: idx.code,
          name: idx.name,
          last: idx.last,
          change: idx.change,
          change_pct: idx.change_pct,
          date: idx.date,
          source: idx.source,
        }));

  const sectors: MarketSectorRow[] =
    scope === "cn"
      ? (sectorsData?.sectors ?? []).map((sector) => ({
          code: sector.code,
          name: sector.name,
          price: sector.price,
          change: sector.change,
          change_pct: sector.change_pct,
          turnover_rate: sector.turnover_rate,
        }))
      : (usDashboard?.sectors ?? []).map((sector) => ({
          code: sector.code,
          name: sector.name,
          price: sector.last,
          change: sector.change,
          change_pct: sector.change_pct,
          turnover_rate: undefined,
        }));

  const subtitle =
    scope === "cn"
      ? `${dashboard?.index?.date ?? ""} · ${marketPhaseText(dashboard?.market_phase)}`
      : `${usDashboard?.generated_at?.slice(0, 16).replace("T", " ") ?? ""}`;

  const sections: MarketOverviewSection[] = [
    {
      key: "structure",
      title: "市场结构",
      children: (
        <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
          {scope === "cn" ? (
            <>
              <LimitTable title="涨停板" stocks={dashboard?.limit_up ?? []} type="up" />
              <LimitTable title="跌停板" stocks={dashboard?.limit_down ?? []} type="down" />
            </>
          ) : (
            <>
              <UsHotStocksCard dashboard={usDashboard} />
              <UsNewsCard dashboard={usDashboard} />
            </>
          )}
        </div>
      ),
    },
    {
      key: "focus",
      title: "AI 聚焦",
      children:
        scope === "cn" ? (
          <div className="grid grid-cols-1 gap-2 lg:grid-cols-2">
            <StrongIndustriesCard dashboard={dashboard} />
            <MarketFocusCard insights={insights} />
          </div>
        ) : (
          <UsDailyReview />
        ),
    },
    {
      key: "earnings",
      title: "近期财报",
      children: <MarketEarningsCalendar market={scope} />,
    },
  ];

  return (
    <MarketPageFrame
      market={scope}
      scripts={
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(marketJsonLd) }}
        />
      }
    >
        <AutoRefresh />
        <MarketOverviewTemplate
          market={scope}
          title="市场总览"
          subtitle={subtitle}
          indices={indices}
          sectors={sectors}
          sections={sections}
        />
    </MarketPageFrame>
  );
}

function LimitTable({ title, stocks = [], type }: { title: string; stocks?: LimitStock[]; type: "up" | "down" }) {
  const headerColor = type === "up" ? "text-neo-up" : "text-neo-down";

  return (
    <div className="neo-card-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-[12px] font-medium text-neo-ink">{title}</h3>
        <span className={`text-[11px] ${headerColor}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
          {stocks.length} 只
        </span>
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
            {stocks.map((stock) => {
              const color = trendClass(stock.pct);
              return (
                <tr key={stock.code} className="transition-colors hover-neo-inset">
                  <td className="px-3 py-1.5">
                    <a href={`/stock/${stock.code.replace(/\./, "")}/`} className="flex flex-col">
                      <span className="truncate text-[13px] font-medium text-neo-ink">{stock.name}</span>
                      <span className="text-[10px] text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                        {stock.code}
                      </span>
                    </a>
                  </td>
                  <td className="px-3 py-1.5 text-right text-[13px]">
                    <span className={color} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                      {stock.price.toFixed(2)}
                    </span>
                  </td>
                  <td className="px-3 py-1.5 text-right text-[13px]">
                    <span className={color} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                      {formatPct(stock.pct)}
                    </span>
                  </td>
                  <td className="hidden px-3 py-1.5 text-right sm:table-cell">
                    <span className="neo-inset px-1 py-0.5 text-[10px] text-neo-mid">{stock.tag}</span>
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

function StrongIndustriesCard({ dashboard }: { dashboard: Dashboard | null }) {
  const industries = dashboard?.strong_industries ?? [];
  if (!industries.length) {
    return <div className="neo-card p-4 text-[12px] text-neo-mid">暂无强势行业</div>;
  }

  const maxPct = Math.max(...industries.map((item) => Math.abs(item.change_pct)), 0.1);

  return (
    <div className="neo-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-medium text-neo-ink">强势行业 TOP{industries.length}</h3>
      </div>
      <div className="space-y-0.5">
        {industries.map((industry, index) => {
          const color = trendClass(industry.change_pct);
          const width = Math.min((Math.abs(industry.change_pct) / maxPct) * 100, 100);
          return (
            <div key={industry.name} className="flex items-center gap-3 px-1 py-1.5 transition-colors hover-neo-inset">
              <span className="w-5 text-[11px] text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {index + 1}
              </span>
              <span className="flex-1 truncate text-[13px] text-neo-ink">{industry.name}</span>
              <div className="hidden h-1 w-16 overflow-hidden neo-inset sm:block">
                <div
                  className={`h-full ${industry.change_pct > 0 ? "bg-neo-up" : "bg-neo-down"}`}
                  style={{ width: `${width}%` }}
                />
              </div>
              <span className={`w-14 text-right text-[13px] ${color}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {formatPct(industry.change_pct)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function MarketFocusCard({ insights }: { insights: Insights | null }) {
  if (!insights) {
    return <div className="neo-card p-4 text-[12px] text-neo-mid">暂无市场聚焦</div>;
  }

  return (
    <div className="neo-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-[12px] font-medium text-neo-ink">市场聚焦</span>
        <span className="text-[10px] text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>
          {insights.generated_at}
        </span>
      </div>
      <p className="text-[13px] leading-relaxed text-neo-mid">{insights.focus}</p>
      {insights.hot_sectors?.length > 0 && (
        <div className="mt-3 pt-2">
          <div className="mb-1.5 text-[11px] text-neo-dim">热门板块</div>
          <div className="flex flex-wrap gap-1">
            {insights.hot_sectors.map((sector) => (
              <span
                key={sector.name}
                className={`neo-inset px-2 py-0.5 text-[11px] ${sector.change_pct > 0 ? "text-neo-up" : "text-neo-down"}`}
              >
                {sector.name}
                <span className="ml-1" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                  {formatPct(sector.change_pct)}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function UsHotStocksCard({ dashboard }: { dashboard: UsDashboard | null }) {
  const stocks = dashboard?.stocks ?? [];
  if (!stocks.length) {
    return <div className="neo-card p-4 text-[12px] text-neo-mid">暂无热门美股</div>;
  }

  return (
    <div className="neo-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-medium text-neo-ink">热门美股</h3>
      </div>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        {stocks.slice(0, 8).map((stock) => (
          <div key={stock.code} className="neo-card-sm p-3">
            <div className="flex items-center justify-between gap-2">
              <a href={`/stock/${stock.code}/`} className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-neo-ink">{usNameZh(stock.name, stock.code)}</span>
                <span className="block text-[10px] text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                  {stock.code}
                </span>
              </a>
              <UsWatchlistButton code={stock.code} name={usNameZh(stock.name, stock.code)} />
            </div>
            <div className="mt-2 flex items-baseline justify-between gap-2">
              <span className="text-[18px] font-bold text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {formatPrice(stock.last)}
              </span>
              <span className={`text-[12px] font-semibold ${trendClass(stock.change_pct ?? 0)}`}>
                {formatPct(stock.change_pct ?? 0)}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function UsNewsCard({ dashboard }: { dashboard: UsDashboard | null }) {
  const news = dashboard?.market_news_zh ?? dashboard?.market_news ?? [];
  if (!news.length) {
    return <div className="neo-card p-4 text-[12px] text-neo-mid">暂无市场资讯</div>;
  }

  return (
    <div className="neo-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[12px] font-medium text-neo-ink">市场资讯</h3>
      </div>
      <div className="space-y-2">
        {news.slice(0, 6).map((item) => (
          <a
            key={item.id || item.title}
            href={item.url || "#"}
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg px-2 py-1.5 transition-colors hover:bg-[var(--neo-surface-hover)]"
          >
            <div className="flex items-center gap-2 text-[10px] text-neo-dim">
              <span className="font-medium text-neo-primary">{item.source || "资讯"}</span>
              {item.time && <span>{item.time}</span>}
            </div>
            <p className="mt-0.5 line-clamp-1 text-[13px] leading-snug text-neo-ink">{item.title_zh || item.title}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
