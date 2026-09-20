import { MarketPageFrame, MarketPageHeader, MarketPageSection } from "@/components/market/market-page-shell";
import { api } from "@/lib/api";
import { formatPct, formatPrice } from "@/lib/format";
import { GeoArticleSchema, GeoByline, GeoFaqSection, GeoReferences } from "@/components/seo/geo-content";
import type { Metadata } from "next";
import Link from "next/link";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "今日涨停板复盘",
  description: "今日A股涨停板、跌停板、涨跌停家数、强势行业与市场情绪复盘。",
  alternates: { canonical: "/market/limit-up/" },
};

function trendClass(value: number) {
  if (value > 0) return "text-neo-up";
  if (value < 0) return "text-neo-down";
  return "text-neo-mid";
}

export default async function LimitUpPage() {
  const [dashboard, insights] = await Promise.all([
    api.getDashboard(),
    api.getInsights().catch(() => null),
  ]);
  const up = dashboard.limit_up_count;
  const down = dashboard.limit_down_count;
  const total = up + down;
  const ratio = total > 0 ? (up / total) * 100 : 0;
  const updatedAt = new Date().toISOString();
  const sentiment = up > down * 2 ? "多头主导"
    : up > down ? "情绪偏多"
    : down > up * 2 ? "空头主导"
    : down > up ? "情绪偏空"
    : "多空均衡";
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    name: "今日涨停板复盘 · 爱看盘",
    description: `今日A股涨停 ${up} 只、跌停 ${down} 只，市场情绪${sentiment}。`,
    dateModified: dashboard.market_updated_at,
    isPartOf: { "@type": "WebSite", name: "爱看盘", url: "https://aikanpan.top" },
  };

  return (
    <MarketPageFrame
      market="cn"
      scripts={
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
          <GeoArticleSchema
            headline={`${dashboard.index.date} 今日涨停板复盘`}
            description={`今日A股涨停 ${up} 只、跌停 ${down} 只，市场情绪${sentiment}。`}
            url="https://aikanpan.top/market/limit-up/"
            datePublished={`${dashboard.index.date}T15:30:00+08:00`}
            dateModified={updatedAt}
          />
        </>
      }
    >
      <MarketPageHeader
        market="cn"
        title="今日涨停板复盘"
        subtitle={`${dashboard.index.date} · ${dashboard.market_updated_at} · ${sentiment}`}
        image="/images/ai-art/review-decoration-v3.png"
        actions={<Link href={`/review/${dashboard.index.date}/`} className="neo-btn-primary px-3 py-2 text-[11px]">查看完整复盘</Link>}
      />
      <GeoByline updatedAt={updatedAt} />

      <section className="neo-card mt-3 p-4">
        <p className="text-[13px] leading-relaxed text-neo-mid">
          今日A股涨停 {up} 只、跌停 {down} 只，涨停占涨跌停总数的 {ratio.toFixed(1)}%，市场表现{sentiment}。
          {insights?.focus ? ` 当前市场焦点：${insights.focus}` : ""}
        </p>
      </section>

      <MarketPageSection title="涨跌停概览">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="neo-card-sm p-3">
            <div className="text-[11px] text-neo-mid">涨停家数</div>
            <div className="mt-1 text-2xl font-semibold text-neo-up">{up}</div>
          </div>
          <div className="neo-card-sm p-3">
            <div className="text-[11px] text-neo-mid">跌停家数</div>
            <div className="mt-1 text-2xl font-semibold text-neo-down">{down}</div>
          </div>
          <div className="neo-card-sm p-3">
            <div className="text-[11px] text-neo-mid">涨停占比</div>
            <div className="mt-1 text-2xl font-semibold text-neo-ink">{ratio.toFixed(1)}%</div>
          </div>
          <div className="neo-card-sm p-3">
            <div className="text-[11px] text-neo-mid">市场情绪</div>
            <div className="mt-1 text-[18px] font-semibold text-neo-ink">{sentiment}</div>
          </div>
        </div>
      </MarketPageSection>

      <MarketPageSection title="涨停板">
        <div className="neo-card-sm overflow-x-auto">
          <table className="w-full min-w-[560px]">
            <thead className="bg-[var(--neo-surface)]">
              <tr className="text-[10px] text-neo-dim">
                <th className="px-3 py-2 text-left font-normal">名称 / 代码</th>
                <th className="px-3 py-2 text-right font-normal">价格</th>
                <th className="px-3 py-2 text-right font-normal">涨跌幅</th>
                <th className="px-3 py-2 text-right font-normal">类型</th>
              </tr>
            </thead>
            <tbody>
              {dashboard.limit_up.slice(0, 40).map((stock) => (
                <tr key={stock.code} className="border-t border-[var(--neo-edge)]">
                  <td className="px-3 py-2">
                    <Link href={`/stock/${stock.code.replace(/\./, "")}/`} className="flex min-h-11 flex-col justify-center">
                      <span className="text-[13px] font-medium text-neo-ink">{stock.name}</span>
                      <span className="text-[10px] text-neo-dim">{stock.code}</span>
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-right text-[13px] text-neo-ink">{formatPrice(stock.price)}</td>
                  <td className={`px-3 py-2 text-right text-[13px] ${trendClass(stock.pct)}`}>{formatPct(stock.pct)}</td>
                  <td className="px-3 py-2 text-right text-[11px] text-neo-mid">{stock.tag}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </MarketPageSection>

      <MarketPageSection title="强势行业">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5">
          {dashboard.strong_industries.slice(0, 10).map((industry) => (
            <div key={industry.name} className="neo-card-sm flex items-center justify-between gap-2 px-3 py-2">
              <span className="truncate text-[12px] text-neo-ink">{industry.name}</span>
              <span className={`text-[12px] ${trendClass(industry.change_pct)}`}>{formatPct(industry.change_pct)}</span>
            </div>
          ))}
        </div>
      </MarketPageSection>

      <GeoFaqSection
        items={[
          {
            question: "今日涨停板数量代表什么？",
            answer: "涨停家数反映短线资金的风险偏好和赚钱效应。涨停数量增加通常说明市场情绪回暖，但还需要结合跌停数量、封板质量和板块持续性一起判断。",
          },
          {
            question: "涨停复盘应该重点看哪些数据？",
            answer: "重点关注涨停与跌停的比例、连板高度、成交额变化、涨停板块是否集中，以及强势行业能否连续两天以上保持活跃。单一涨停数字不能代表行情会继续上涨。",
          },
          {
            question: "本页数据有哪些限制？",
            answer: "数据来自公开行情接口，可能存在延迟、缺失或口径差异。页面只用于复盘研究，不代表交易所最终结算数据，也不构成投资建议。",
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
