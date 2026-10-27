import { MarketPageFrame, MarketPageHeader, MarketPageSection } from "@/components/market/market-page-shell";
import { GeoByline, GeoFaqSection, GeoReferences } from "@/components/seo/geo-content";
import { BreadcrumbSchema } from "@/components/seo/breadcrumb-schema";
import { api, type DailyReview, type LimitStock } from "@/lib/api";
import { formatPct, formatPrice } from "@/lib/format";
import {
  formatChineseDate,
  getRecentReviewDates,
  isReviewDate,
  shiftReviewDate,
} from "@/lib/review-seo";
import { buildOpenGraph } from "@/lib/open-graph";
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

  let review: DailyReview | null = null;
  try {
    review = await api.getDailyReview(date);
  } catch {
    review = null;
  }

  if (!review) {
    // 断档日走 200 的「暂无复盘」说明页（站主决定），200 + 无实质内容属于薄页面，
    // 必须 noindex，否则会被当成低质页面收录；sitemap 那边也已排除这类日期。
    return {
      title: `${date} 暂无复盘数据`,
      description: `${formatChineseDate(date)}（${date}）暂时没有保存的 A 股复盘快照。`,
      robots: { index: false, follow: true },
      openGraph: buildOpenGraph({
        title: `${date} 暂无复盘数据 · 爱看盘`,
        description: `${formatChineseDate(date)}（${date}）暂时没有保存的 A 股复盘快照。`,
        url: `/review/${date}/`,
      }),
    };
  }

  const up = review.dashboard.limit_up_count;
  const down = review.dashboard.limit_down_count;
  const description = `${formatChineseDate(date)} A股复盘：涨停 ${up} 只、跌停 ${down} 只，包含主要指数、强势行业、涨停板和跌停板数据。`;
  return {
    title: `${date} A股复盘`,
    description,
    alternates: { canonical: `/review/${await resolveCanonicalReviewDate(date)}/` },
    // og:url 用本页自身 URL（含具体日期），与 canonical 解耦：
    // 周末页 canonical 归并到周五，但它自己的 URL 仍是这个周末页。
    openGraph: buildOpenGraph({
      title: `${date} A股复盘 · 爱看盘`,
      description,
      url: `/review/${date}/`,
    }),
  };
}

/**
 * 某一天是否真有复盘快照。
 *
 * 复用本页已经在用的 api.getDailyReview：后端对「这一天没有快照」返回 404、
 * 对有快照返回 200（只读本地快照文件，是存在性的最便宜探针）。
 * 请求本身带 Next 数据缓存（revalidate 60），不会每次访问都打后端。
 * 任何异常（超时/5xx）一律当作「不存在」，宁可少一个按钮，也不产生死链。
 */
async function hasDailyReviewSnapshot(date: string): Promise<boolean> {
  try {
    await api.getDailyReview(date);
    return true;
  } catch {
    return false;
  }
}

/**
 * 该日期所属「同一周最后一个工作日」的日期。
 *
 * 周起始约定：**周一为一周的第一天**（ISO-8601），所以周日（getDay() === 0）归入
 * 「上一周」那一组，它的锚点是周日往前数 2 天的周五；周六往前数 1 天。
 * 周一至周五一律返回自身（工作日不做任何 canonical 归并）。
 *
 * 纯日期运算，无网络请求 —— 后端周末照写快照（2026-10-23/24/25 三份 JSON 的
 * index.last、change_pct、limit_up 完全相同），所以周末页是周五的复制品，
 * canonical 要指回周五，让搜索引擎只收一份。
 */
function weekdayAnchorDate(date: string): string {
  const day = new Date(`${date}T12:00:00`).getDay(); // 0=周日, 6=周六
  if (day === 6) return shiftReviewDate(date, -1);
  if (day === 0) return shiftReviewDate(date, -2);
  return date;
}

/**
 * 计算某天页面应声明的 canonical 日期。
 *
 * 工作日 / 无锚点 → 自身；周末 → 同周周五。但如果那个周五本身没有快照
 * （例如落在 2026-08-19~08-30 这种断档区），canonical 必须退回自身，
 * 不能指向一个 noindex 的「暂无复盘」说明页。
 *
 * 注意：这里的一次探测只发生在「周末页且自身有数据」时，走的是 Next 数据缓存
 * （revalidate 60）；周六页的周五恰好等于页面正文里 prev 的那次探测，缓存键相同，
 * 不会重复打后端。
 */
async function resolveCanonicalReviewDate(date: string): Promise<string> {
  const anchor = weekdayAnchorDate(date);
  if (anchor === date) return date;
  const anchorExists = await hasDailyReviewSnapshot(anchor);
  return anchorExists ? anchor : date;
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

/**
 * 断档日的说明页。
 *
 * 站主决定：这类页面返回 200（而不是 404），但必须在 generateMetadata 里声明 noindex，
 * 否则「200 + 没内容」会被当成薄页面收录，反而拖累整站质量分。
 */
function ReviewMissingNotice({ date }: { date: string }) {
  // 与 src/app/review/page.tsx 的 todayLocal() 同口径（sv locale 得到 YYYY-MM-DD）
  const isFuture = date > new Date().toLocaleDateString("sv");
  return (
    <MarketPageFrame market="cn">
      <MarketPageHeader
        market="cn"
        title={`${formatChineseDate(date)} 暂无复盘`}
        subtitle={`${date} · 该日期没有保存的复盘快照`}
        image="/images/ai-art/review-decoration-v3.png"
      />
      <section className="neo-card mt-3 p-4 sm:p-6">
        <p className="text-[13px] leading-relaxed text-neo-mid">
          {isFuture
            ? `${formatChineseDate(date)}（${date}）还没到，复盘通常在当日收盘后生成，可以晚点再来看看。`
            : `${formatChineseDate(date)}（${date}）暂时没有可以展示的 A 股复盘数据。可能是该日期没有生成复盘快照，或者历史快照已经被清理。`}
        </p>
        <p className="mt-2 text-[13px] leading-relaxed text-neo-mid">
          你可以回到每日复盘首页查看最近一个交易日的复盘，也可以在首页用日期选择器换一天。
        </p>
        <Link
          href="/review/"
          className="neo-btn-primary mt-4 inline-flex min-h-11 items-center px-4 py-2 text-[12px]"
        >
          返回每日复盘
        </Link>
      </section>
    </MarketPageFrame>
  );
}

export default async function ReviewDatePage({ params }: { params: Promise<{ date: string }> }) {
  const { date } = await params;
  // 日期格式非法（/review/abc/、/review/2026-13-45/ 之类）仍然走 404
  if (!isReviewDate(date)) notFound();

  // 合法日期但没有快照（如 2026-08-19~08-30 那段断档）：站主决定返回 200 说明页而不是 404。
  // 判据就是「数据是否存在」，不硬编码任何日期。
  let review: DailyReview | null = null;
  try {
    review = await api.getDailyReview(date);
  } catch {
    review = null;
  }
  if (!review) return <ReviewMissingNotice date={date} />;

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
  // 前后一天是否有真实数据：有才渲染按钮，避免指向 404 或出现「有按钮但点开是空页」
  const [hasPrevious, hasNext] = await Promise.all([
    hasDailyReviewSnapshot(previousDate),
    hasDailyReviewSnapshot(nextDate),
  ]);
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
      scripts={
        <>
          <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }} />
          <BreadcrumbSchema
            items={[
              { name: "首页", path: "/" },
              { name: "每日复盘", path: "/review/" },
              { name: `${date} A股复盘`, path: `/review/${date}/` },
            ]}
          />
        </>
      }
    >
      <MarketPageHeader
        market="cn"
        title={`${formatChineseDate(date)} A股复盘`}
        subtitle={`${dashboard.market_updated_at} · ${sentiment}`}
        image="/images/ai-art/review-decoration-v3.png"
        actions={
          <div className="flex items-center gap-2">
            {hasPrevious && (
              <Link href={`/review/${previousDate}/`} className="neo-btn px-3 py-2 text-[11px]">前一天</Link>
            )}
            {hasNext && (
              <Link href={`/review/${nextDate}/`} className="neo-btn px-3 py-2 text-[11px]">后一天</Link>
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
