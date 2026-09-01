import type { ReactNode } from "react";
import { formatPct, formatPrice } from "@/lib/format";
import { MarketPageHeader, MarketPageSection } from "@/components/market/market-page-shell";
import { SortableSectorTable, type MarketSectorRow } from "@/components/market/sortable-sector-table";

export type MarketOverviewIndex = {
  code: string;
  name?: string;
  last: number;
  change: number;
  change_pct: number;
  date?: string;
  source?: string;
};

export type MarketOverviewSection = {
  key: string;
  title: string;
  subtitle?: string;
  children: ReactNode;
};

export type MarketOverviewTemplateProps = {
  market: "cn" | "us";
  title: string;
  subtitle: string;
  indices: MarketOverviewIndex[];
  sectors: MarketSectorRow[];
  sections: MarketOverviewSection[];
};

function trendClass(pct: number) {
  if (pct > 0) return "text-neo-up";
  if (pct < 0) return "text-neo-down";
  return "text-neo-mid";
}

function trendBgClass(pct: number) {
  if (pct > 0) return "neo-up-soft";
  if (pct < 0) return "neo-down-soft";
  return "neo-inset";
}

export function MarketOverviewTemplate({
  market,
  title,
  subtitle,
  indices,
  sectors,
  sections,
}: MarketOverviewTemplateProps) {
  const hasTurnover = sectors.some((sector) => typeof sector.turnover_rate === "number");

  return (
    <div>
      <MarketPageHeader
        market={market}
        title={title}
        subtitle={subtitle}
        image="/images/ai-art/market-heatmap.png"
      />

      <section className="mt-3">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {indices.map((index) => {
            const color = trendClass(index.change_pct);
            const bg = trendBgClass(index.change_pct);
            return (
              <a key={index.code} href={`/stock/${index.code}/`} className="neo-card-sm p-3 transition-all hover:-translate-y-0.5">
                <div className="flex items-center justify-between">
                  <div className="flex items-baseline gap-1.5">
                    <span className="text-[13px] font-medium text-neo-ink">{index.name ?? index.code}</span>
                    <span
                      className="text-[10px] text-neo-dim"
                      style={{ fontFamily: "var(--font-inter), system-ui" }}
                    >
                      {index.code}
                    </span>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 text-[11px] ${bg} ${color}`}
                    style={{ fontFamily: "var(--font-inter), system-ui" }}
                  >
                    {formatPct(index.change_pct)}
                  </span>
                </div>
                <div className="mt-2 flex items-baseline gap-2">
                  <span className={`text-2xl font-semibold ${color}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                    {formatPrice(index.last)}
                  </span>
                  <span className={`text-[12px] ${color}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                    {index.change >= 0 ? "+" : ""}
                    {index.change.toFixed(2)}
                  </span>
                </div>
                {(index.date || index.source) && (
                  <div className="mt-1 text-[10px] text-neo-dim">
                    {[index.date, index.source].filter(Boolean).join(" · ")}
                  </div>
                )}
              </a>
            );
          })}
        </div>
      </section>

      <MarketPageSection
        title="板块表现"
        action={<span className="text-[11px] text-neo-dim">{sectors.length} 个</span>}
      >
        {sectors.length > 0 ? (
          <SortableSectorTable sectors={sectors} showTurnover={hasTurnover} />
        ) : (
          <div className="neo-card-sm p-5 text-[12px] text-neo-mid">暂无板块数据</div>
        )}
      </MarketPageSection>

      {sections.map((section) => (
        <MarketPageSection
          key={section.key}
          title={section.title}
          action={section.subtitle ? <span className="text-[11px] text-neo-dim">{section.subtitle}</span> : undefined}
        >
          {section.children}
        </MarketPageSection>
      ))}
    </div>
  );
}
