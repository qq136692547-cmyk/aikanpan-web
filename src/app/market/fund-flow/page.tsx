import { MarketPageFrame, MarketPageHeader, MarketPageSection } from "@/components/market/market-page-shell";
import { api } from "@/lib/api";
import { formatAmount, formatPct } from "@/lib/format";
import { GeoArticleSchema, GeoByline, GeoFaqSection, GeoReferences } from "@/components/seo/geo-content";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "板块资金流向",
  description: "A股行业板块主力资金净流入、净流出排行，以及沪股通、深股通和南向资金概览。",
  alternates: { canonical: "/market/fund-flow/" },
};

function trendClass(value: number) {
  if (value > 0) return "text-neo-up";
  if (value < 0) return "text-neo-down";
  return "text-neo-mid";
}

export default async function FundFlowPage() {
  const [sectorsData, northbound] = await Promise.all([
    api.getSectors(),
    api.getNorthbound(),
  ]);
  const sectors = (sectorsData.sectors ?? []).filter((sector) => Number.isFinite(sector.main_net_inflow));
  const inflow = [...sectors].sort((a, b) => (b.main_net_inflow ?? 0) - (a.main_net_inflow ?? 0)).slice(0, 12);
  const outflow = [...sectors].sort((a, b) => (a.main_net_inflow ?? 0) - (b.main_net_inflow ?? 0)).slice(0, 12);
  const updatedAt = new Date().toISOString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "板块资金流向 · 爱看盘",
    description: "A股行业板块主力资金净流入与净流出排行，以及北向资金概览。",
    dateModified: new Date().toISOString(),
    isPartOf: { "@type": "WebSite", name: "爱看盘", url: "https://aikanpan.top" },
  };

  return (
    <MarketPageFrame
      market="cn"
      scripts={
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <GeoArticleSchema
            headline="A股板块资金流向"
            description="A股行业板块主力资金净流入、净流出排行，以及北向与南向资金概览。"
            url="https://aikanpan.top/market/fund-flow/"
            datePublished={`${northbound.date || new Date().toISOString().slice(0, 10)}T15:30:00+08:00`}
            dateModified={updatedAt}
          />
        </>
      }
    >
      <MarketPageHeader
        market="cn"
        title="板块资金流向"
        subtitle={northbound.date ? `${northbound.date} · 东方财富` : "东方财富"}
        image="/images/ai-art/market-heatmap-v3.png"
      />
      <GeoByline updatedAt={updatedAt} />

      <section className="neo-card mt-3 p-4">
        <p className="text-[13px] leading-relaxed text-neo-mid">
          本页按行业板块主力资金净流入排序，同时展示北向资金累计成交与持仓数据。北向资金当日净买入自 2024 年 8 月起不再披露，页面不会把零值当作真实净流入。
        </p>
      </section>

      <MarketPageSection title="主力净流入板块">
        <div className="neo-card-sm overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead className="bg-[var(--neo-surface)]">
              <tr className="text-[10px] text-neo-dim">
                <th className="px-3 py-2 text-left font-normal">板块</th>
                <th className="px-3 py-2 text-right font-normal">涨跌幅</th>
                <th className="px-3 py-2 text-right font-normal">主力净流入</th>
                <th className="px-3 py-2 text-right font-normal">净流入占比</th>
              </tr>
            </thead>
            <tbody>
              {inflow.map((sector) => (
                <tr key={sector.code} className="border-t border-[var(--neo-edge)]">
                  <td className="px-3 py-2 text-[13px] text-neo-ink">{sector.name}</td>
                  <td className={`px-3 py-2 text-right text-[12px] ${trendClass(sector.change_pct)}`}>{formatPct(sector.change_pct)}</td>
                  <td className={`px-3 py-2 text-right text-[12px] ${trendClass(sector.main_net_inflow ?? 0)}`}>{formatAmount(sector.main_net_inflow ?? 0)}</td>
                  <td className={`px-3 py-2 text-right text-[12px] ${trendClass(sector.main_net_inflow_pct ?? 0)}`}>{formatPct(sector.main_net_inflow_pct ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MarketPageSection>

      <MarketPageSection title="主力净流出板块">
        <div className="neo-card-sm overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead className="bg-[var(--neo-surface)]">
              <tr className="text-[10px] text-neo-dim">
                <th className="px-3 py-2 text-left font-normal">板块</th>
                <th className="px-3 py-2 text-right font-normal">涨跌幅</th>
                <th className="px-3 py-2 text-right font-normal">主力净流入</th>
                <th className="px-3 py-2 text-right font-normal">净流入占比</th>
              </tr>
            </thead>
            <tbody>
              {outflow.map((sector) => (
                <tr key={sector.code} className="border-t border-[var(--neo-edge)]">
                  <td className="px-3 py-2 text-[13px] text-neo-ink">{sector.name}</td>
                  <td className={`px-3 py-2 text-right text-[12px] ${trendClass(sector.change_pct)}`}>{formatPct(sector.change_pct)}</td>
                  <td className={`px-3 py-2 text-right text-[12px] ${trendClass(sector.main_net_inflow ?? 0)}`}>{formatAmount(sector.main_net_inflow ?? 0)}</td>
                  <td className={`px-3 py-2 text-right text-[12px] ${trendClass(sector.main_net_inflow_pct ?? 0)}`}>{formatPct(sector.main_net_inflow_pct ?? 0)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MarketPageSection>

      <MarketPageSection title="北向与南向资金">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="neo-card-sm p-3">
            <div className="text-[11px] text-neo-mid">沪股通累计净流入</div>
            <div className="mt-1 text-[18px] font-semibold text-neo-ink">{formatAmount(northbound.sh.total)}</div>
          </div>
          <div className="neo-card-sm p-3">
            <div className="text-[11px] text-neo-mid">深股通累计净流入</div>
            <div className="mt-1 text-[18px] font-semibold text-neo-ink">{formatAmount(northbound.sz.total)}</div>
          </div>
          <div className="neo-card-sm p-3">
            <div className="text-[11px] text-neo-mid">南向沪市净买入</div>
            <div className={`mt-1 text-[18px] font-semibold ${trendClass(northbound.south_sh)}`}>{formatAmount(northbound.south_sh)}</div>
          </div>
          <div className="neo-card-sm p-3">
            <div className="text-[11px] text-neo-mid">南向深市净买入</div>
            <div className={`mt-1 text-[18px] font-semibold ${trendClass(northbound.south_sz)}`}>{formatAmount(northbound.south_sz)}</div>
          </div>
        </div>
        {!northbound.net_disclosed && (
          <p className="mt-2 text-[11px] text-neo-dim">北向资金当日净买入未披露，相关字段不作为投资依据。</p>
        )}
      </MarketPageSection>

      <GeoFaqSection
        items={[
          {
            question: "主力净流入为正一定代表板块会继续上涨吗？",
            answer: "不一定。主力净流入反映大单成交方向，能说明资金当天更偏向哪些板块，但不能单独预测后续走势。还需要结合板块涨幅、成交额、持续性和市场整体风险偏好。",
          },
          {
            question: "为什么北向资金当日净买入显示未披露？",
            answer: "沪深交易所已调整北向资金披露方式，部分当日净买入字段不再公开。本页会保留累计数据和南向资金数据，不会把缺失值或零值当作真实净流入。",
          },
          {
            question: "资金流向数据的口径是什么？",
            answer: "主力净流入和净流入占比来自公开行情接口，统计口径可能与不同行情软件不一致。数据适合用于观察方向，不适合直接作为交易依据。",
          },
        ]}
      />

      <GeoReferences
        items={[
          { label: "上海证券交易所", url: "https://www.sse.com.cn/" },
          { label: "深圳证券交易所", url: "https://www.szse.cn/" },
          { label: "中国证券监督管理委员会", url: "https://www.csrc.gov.cn/" },
        ]}
      />
    </MarketPageFrame>
  );
}
