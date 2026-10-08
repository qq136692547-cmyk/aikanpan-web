import { api } from "@/lib/api";
import { formatChineseDate, getRecentReviewDates } from "@/lib/review-seo";

/**
 * 复盘日更 RSS。
 *
 * 数据源与页面保持一致：日期列表取 getRecentReviewDates()（同 src/app/review/[date]/page.tsx、
 * src/app/sitemap.ts），每日内容取 api.getDailyReview()（同 src/app/review/page.tsx）。
 * 后端取不到时退化成只带标题与链接的条目，保证 feed 始终是合法 XML。
 */
const SITE_URL = "https://aikanpan.top";
const FEED_TITLE = "爱看盘 · 每日复盘";
const FEED_LINK = `${SITE_URL}/review/`;
const FEED_DESCRIPTION = "A股每日复盘：涨停跌停、主要指数、强势行业与涨跌停板的归档。";
const FEED_DAYS = 7;

/** 与 /review/[date]/ 页面口径一致：收盘后生成 */
const PUBLISH_TIME = "T15:30:00+08:00";

export const revalidate = 1800;

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function toRfc822(date: string): string {
  return new Date(`${date}${PUBLISH_TIME}`).toUTCString();
}

interface FeedItem {
  title: string;
  link: string;
  pubDate: string;
  description: string;
}

async function buildItem(date: string): Promise<FeedItem> {
  const link = `${SITE_URL}/review/${date}/`;
  const title = `${date} A股复盘`;
  const pubDate = toRfc822(date);

  try {
    const review = await api.getDailyReview(date);
    const up = review.dashboard.limit_up_count;
    const down = review.dashboard.limit_down_count;
    return {
      title,
      link,
      pubDate,
      description: `${formatChineseDate(date)} A股复盘：涨停 ${up} 只、跌停 ${down} 只，包含主要指数、强势行业、涨停板和跌停板数据。`,
    };
  } catch (error) {
    console.error(`Failed to build RSS item for ${date}:`, error);
    return { title, link, pubDate, description: `${formatChineseDate(date)} A股复盘数据。` };
  }
}

export async function GET() {
  const items = await Promise.all(getRecentReviewDates(FEED_DAYS).map((date) => buildItem(date)));

  const body = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">',
    "  <channel>",
    `    <title>${escapeXml(FEED_TITLE)}</title>`,
    `    <link>${escapeXml(FEED_LINK)}</link>`,
    `    <description>${escapeXml(FEED_DESCRIPTION)}</description>`,
    "    <language>zh-CN</language>",
    `    <atom:link href="${escapeXml(`${SITE_URL}/rss.xml`)}" rel="self" type="application/rss+xml" />`,
    `    <lastBuildDate>${toRfc822(getRecentReviewDates(1)[0])}</lastBuildDate>`,
    ...items.flatMap((item) => [
      "    <item>",
      `      <title>${escapeXml(item.title)}</title>`,
      `      <link>${escapeXml(item.link)}</link>`,
      `      <guid isPermaLink="true">${escapeXml(item.link)}</guid>`,
      `      <pubDate>${item.pubDate}</pubDate>`,
      `      <description>${escapeXml(item.description)}</description>`,
      "    </item>",
    ]),
    "  </channel>",
    "</rss>",
  ].join("\n");

  return new Response(body, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Cache-Control": "public, max-age=0, s-maxage=1800, stale-while-revalidate=3600",
    },
  });
}
