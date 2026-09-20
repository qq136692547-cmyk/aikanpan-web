import { MarketPageFrame, MarketPageHeader, MarketPageSection } from "@/components/market/market-page-shell";
import { api } from "@/lib/api";
import { formatPct } from "@/lib/format";
import { GeoArticleSchema, GeoByline, GeoFaqSection, GeoReferences } from "@/components/seo/geo-content";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "A股市场温度",
  description: "A股市场温度、指数强度、板块热度、涨停效应与热点行业分析。",
  alternates: { canonical: "/market/temperature/" },
};

function scoreColor(score: number) {
  if (score >= 70) return "text-neo-up";
  if (score >= 45) return "text-neo-primary";
  return "text-neo-down";
}

function trendClass(value: number) {
  if (value > 0) return "text-neo-up";
  if (value < 0) return "text-neo-down";
  return "text-neo-mid";
}

export default async function MarketTemperaturePage() {
  const temperature = await api.getMarketTemperature(false);
  const dimensions = Object.values(temperature.dimensions);
  const updatedAt = new Date().toISOString();
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "A股市场温度 · 爱看盘",
    description: `当前A股市场温度 ${temperature.score}，状态为${temperature.label}。`,
    dateModified: temperature.generated_at,
    isPartOf: { "@type": "WebSite", name: "爱看盘", url: "https://aikanpan.top" },
  };

  return (
    <MarketPageFrame
      market="cn"
      scripts={
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <GeoArticleSchema
            headline="A股市场温度分析"
            description={`当前A股市场温度 ${temperature.score}，状态为${temperature.label}。`}
            url="https://aikanpan.top/market/temperature/"
            datePublished={`${new Date().toISOString().slice(0, 10)}T09:30:00+08:00`}
            dateModified={updatedAt}
          />
        </>
      }
    >
      <MarketPageHeader
        market="cn"
        title="A股市场温度"
        subtitle={`${temperature.market_updated_at} · ${temperature.market_status}`}
        image="/images/ai-art/market-heatmap-v3.png"
        actions={<Link href="/review/" className="neo-btn-primary px-3 py-2 text-[11px]">查看每日复盘</Link>}
      />
      <GeoByline updatedAt={updatedAt} />

      <section className="neo-card mt-3 p-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <div className="text-[12px] text-neo-mid">综合温度</div>
            <div className={`mt-1 text-4xl font-bold ${scoreColor(temperature.score)}`}>{temperature.score}</div>
          </div>
          <span className="neo-chip px-3 py-1 text-[12px] font-medium text-neo-mid">{temperature.label}</span>
        </div>
        <p className="mt-4 text-[13px] leading-relaxed text-neo-mid">{temperature.focus}</p>
      </section>

      <MarketPageSection title="温度构成">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {dimensions.map((dimension) => (
            <div key={dimension.label} className="neo-card-sm p-4">
              <div className="flex items-center justify-between gap-3">
                <span className="text-[13px] font-medium text-neo-ink">{dimension.label}</span>
                <span className={`text-[16px] font-semibold ${scoreColor(dimension.score)}`}>{dimension.score}</span>
              </div>
              <div className="neo-inset-sm mt-2 h-1.5 overflow-hidden rounded-full">
                <div className="h-full rounded-full bg-neo-primary" style={{ width: `${dimension.score}%` }} />
              </div>
              <p className="mt-2 text-[12px] leading-relaxed text-neo-mid">{dimension.detail}</p>
            </div>
          ))}
        </div>
      </MarketPageSection>

      <MarketPageSection title="热点行业">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {temperature.hot_sectors.slice(0, 10).map((sector) => (
            <div key={sector.name} className="neo-card-sm flex items-center justify-between gap-2 px-3 py-2">
              <span className="truncate text-[12px] text-neo-ink">{sector.name}</span>
              <span className={`text-[12px] ${trendClass(sector.change_pct)}`}>{formatPct(sector.change_pct)}</span>
            </div>
          ))}
        </div>
      </MarketPageSection>

      <GeoFaqSection
        items={[
          {
            question: "A股市场温度是什么？",
            answer: "市场温度是综合指数强度、板块热度、涨停效应和AI市场焦点计算的观察指标，用于快速判断市场处于偏强、中性还是偏弱状态。",
          },
          {
            question: "市场温度越高越适合买入吗？",
            answer: "不是。温度高只说明当前市场活跃度和风险偏好较高，也可能伴随追高风险。需要结合成交额、板块轮动、个股位置和自身风险承受能力判断。",
          },
          {
            question: "市场温度有哪些局限性？",
            answer: "温度模型基于公开行情和当日数据，无法覆盖突发消息、政策变化和个股基本面。它是复盘辅助工具，不是交易信号，也不构成投资建议。",
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
