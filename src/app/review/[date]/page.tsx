import { MarketPageFrame, MarketPageHeader, MarketPageSection } from "@/components/market/market-page-shell";
import { GeoByline, GeoFaqSection, GeoReferences } from "@/components/seo/geo-content";
import { api, type LimitStock } from "@/lib/api";
import { formatPct, formatPrice } from "@/lib/format";
import {
  formatChineseDate,
  getRecentReviewDates,
  isReviewDate,
  shiftReviewDate,
} from "@/lib/review-seo";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

export const revalidate = 3600;
export const dynamicParams = true;

export function generateStaticParams() {
  return getRecentReviewDates().map((date) => ({ date }));
}

export async function generateMetadata({ params }: { params: Promise<{ date: string }> }): Promise<Metadata> {
  const { date } = await params;
  if (!isReviewDate(date)) {
    return { title: "复盘日期不存在", robots: { index: false, follow: false } };
  }

  try {
    const review = await api.getDailyReview(date);
    const up = review.dashboard.limit_up_count;
    const down = review.dashboard.limit_down_count;
    return {
      title: `${date} A股复盘`,
      description: `${formatChineseDate(date)} A股复盘：涨停 ${up} 只、跌停 ${down} 只，包含主要指数、强势行业、涨停板和跌停板数据。`,
      alternates: { canonical: `/review/${date}/` },
    };
  } catch {
    return {
      title: `${date} A股复盘`,
      description: `${formatChineseDate(date)} A股市场复盘数据。`,
      alternates: { canonical: `/review/${date}/` },
    };
  }
}

function trendClass(value: number) {
  if (value > 0) return "text-neo-up";
  if (value < 0) return "text-neo-down";
  return "text-neo-mid";
}

function LimitTable({ title, stocks, type }: { title: string; stocks: LimitStock[]; type: "up" | "down" }) {
  return (
    <div className="neo-card-sm overflow-hidden">
      <div className="flex items-center justify-between px-3 py-2">
        <h3 className="text-[13px] font-medium text-neo-ink">{title}</h3>
        <span className={type === "up" ? "text-[11px] text-neo-up" : "text-[11px] text-neo-down"}>
          {stocks.length} 只
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[520px]">
          <thead className="bg-[var(--neo-surface)]">
            <tr className="text-[10px] text-neo-dim">
              <th className="px-3 py-1.5 text-left font-normal">名称 / 代码</th>
              <th className="px-3 py-1.5 text-right font-normal">价格</th>
              <th className="px-3 py-1.5 text-right font-normal">涨跌幅</th>
              <th className="hidden px-3 py-1.5 text-right font-normal sm:table-cell">类型</th>
            </tr>
          </thead>
          <tbody>
            {stocks.slice(0, 30).map((stock) => (
              <tr key={stock.code} className="transition-colors hover-neo-inset">
                <td className="px-3 py-1.5">
                  <Link href={`/stock/${stock.code.replace(/\./, "")}/`} className="flex min-h-11 flex-col justify-center">
                    <span className="truncate text-[13px] font-medium text-neo-ink">{stock.name}</span>
                    <span className="text-[10px] text-neo-dim">{stock.code}</span>
                  </Link>
                </td>
                <td className="px-3 py-1.5 text-right text-[13px] text-neo-ink">{formatPrice(stock.price)}</td>
                <td className={`px-3 py-1.5 text-right text-[13px] ${trendClass(stock.pct)}`}>{formatPct(stock.pct)}</td>
                <td className="hidden px-3 py-1.5 text-right text-[11px] text-neo-mid sm:table-cell">{stock.tag}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default async function ReviewDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  if (!isReviewDate(date)) notFound();

  let review;
  try {
    review = await api.getDailyReview(date);
  } catch {
    notFound();
  }

  const dashboard = review.dashboard;
  const up = dashboard.limit_up_count;
  const down = dashboard.limit_down_count;
  const total = up + down;
  const upRatio = total > 0 ? (up / total) * 100 : 0;
  const sentiment = up > down * 2 ? "多头主导"
    : up > down ? "情绪偏多"
    : down > up * 2 ? "空头主导"
    : down > up ? "情绪偏空"
    : "多空均衡";
  const previousDate = shiftReviewDate(date, -1);
  const nextDate = shiftReviewDate(date, 1);
  const today = getRecentReviewDates(1)[0];
  const recentDates = getRecentReviewDates(8).filter((item) => item !== date);
  const indexSummary = dashboard.indices
    .slice(0, 3)
    .map((item) => `${item.name}${formatPct(item.change_pct)}`)
    .join("、");

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: `${formatChineseDate(date)} A股复盘`,
    datePublished: `${date}T15:30:00+08:00`,
    dateModified: new Date().toISOString(),
    author: { "@type": "Organization", name: "爱看盘" },
    publisher: { "@type": "Organization", name: "爱看盘", url: "https://aikanpan.top" },
    description: `${date} A股涨停 ${up} 只、跌停 ${down} 只，${sentiment}。`,
    about: ["A股复盘", "涨停板", "市场情绪", "股票行情"],
  };

  return (
    <MarketPageFrame
      market="cn"
      scripts={<script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />}
    >
      <MarketPageHeader
        market="cn"
        title={`${formatChineseDate(date)} A股复盘`}
        subtitle={`${dashboard.market_updated_at} · ${sentiment}`}
        image="/images/ai-art/review-decoration-v3.png"
        actions={
          <div className="flex items-center gap-2">
            {previousDate >= "2026-08-31" && (
              <Link href={`/review/${previousDate}/`} className="neo-btn px-3 py-2 text-[11px]">前一交易日</Link>
            )}
            {nextDate <= today && (
              <Link href={`/review/${nextDate}/`} className="neo-btn px-3 py-2 text-[11px]">后一交易日</Link>
            )}
            <Link href="/review/" className="neo-btn-primary px-3 py-2 text-[11px]">今日复盘</Link>
          </div>
        }
      />
      <GeoByline updatedAt={`${date}T15:30:00+08:00`} />

      <section className="neo-card mt-3 p-4">
        <h2 className="text-[15px] font-semibold text-neo-ink">{date} 市场摘要</h2>
        <p className="mt-2 text-[13px] leading-relaxed text-neo-mid">
          {formatChineseDate(date)}，A股涨停 {up} 只、跌停 {down} 只，涨停占涨跌停总数的 {upRatio.toFixed(1)}%，市场表现{sentiment}。
          {indexSummary ? `主要指数表现为${indexSummary}。` : ""}
          {dashboard.strong_industries.length > 0
            ? `强势行业包括${dashboard.strong_industries.slice(0, 5).map((item) => item.name).join("、")}。`
            : ""}
        </p>
      </section>

      <MarketPageSection title="主要指数">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {dashboard.indices.slice(0, 4).map((index) => (
            <div key={index.code || index.name} className="neo-card-sm p-3">
              <div className="text-[11px] text-neo-mid">{index.name}</div>
              <div className="mt-1 text-[18px] font-semibold text-neo-ink">{formatPrice(index.last)}</div>
              <div className={`mt-0.5 text-[12px] ${trendClass(index.change_pct)}`}>{formatPct(index.change_pct)}</div>
            </div>
          ))}
        </div>
      </MarketPageSection>

      <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-2">
        <LimitTable title="涨停板复盘" stocks={dashboard.limit_up} type="up" />
        <LimitTable title="跌停板复盘" stocks={dashboard.limit_down} type="down" />
      </div>

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

      <MarketPageSection title="近期复盘">
        <div className="flex flex-wrap gap-2">
          {recentDates.map((item) => (
            <Link key={item} href={`/review/${item}/`} className="neo-chip px-3 py-2 text-[11px] text-neo-mid">
              {item}
            </Link>
          ))}
        </div>
      </MarketPageSection>

      <GeoFaqSection
        title={`${date} 复盘常见问题`}
        items={[
          {
            question: `${formatChineseDate(date)}的市场表现说明了什么？`,
            answer: `当日涨停 ${up} 只、跌停 ${down} 只，涨跌停结构表现为${sentiment}。这能反映短线资金偏好，但还需要结合成交额、板块持续性和后续交易日验证。`,
          },
          {
            question: "复盘时为什么要看涨停和跌停比例？",
            answer: "涨停和跌停比例可以快速展示市场风险偏好。涨停明显多于跌停时，短线情绪通常更积极；跌停增加时，则需要关注资金撤退和板块分化风险。",
          },
          {
            question: "历史复盘数据会更新吗？",
            answer: "历史页面用于保留当日复盘结果。行情接口可能出现延迟、修订或口径差异，后续数据变化不会改变历史日期的市场事实，但展示字段可能随数据源调整。",
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
