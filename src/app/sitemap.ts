import type { MetadataRoute } from "next";
import { getExistingReviewDates } from "@/lib/review-dates";
import { INDEXABLE_STOCK_CODES } from "@/lib/stock-seo";

/**
 * sitemap 每小时重建一次。
 *
 * 不写这一行的后果：Next 在 `next build` 时把结果固化成 `.next/server/app/sitemap.xml.body`，
 * 之后无论过多少天都输出同一份 URL 列表（lastmod 也停在构建那一刻）。日报这类每天新增
 * 一页的内容就会永远进不了 sitemap。
 */
export const revalidate = 3600;

const SITE_URL = "https://aikanpan.top";

const CST_OFFSET_MS = 8 * 60 * 60 * 1000;

/**
 * 返回「北京时间今天 00:00」对应的时间点。
 *
 * 用途：给每天都会变的数据页做 lastModified。它一天只跳一次，而不是每小时都变成 now——
 * 一个永远等于 now 的 lastmod，搜索引擎学几次之后就会整体忽略。
 */
function cstDayStart(now = new Date()): Date {
  const shifted = new Date(now.getTime() + CST_OFFSET_MS);
  return new Date(
    Date.UTC(shifted.getUTCFullYear(), shifted.getUTCMonth(), shifted.getUTCDate()) - CST_OFFSET_MS
  );
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const dataUpdated = cstDayStart();

  // 日报页的「哪些天真的有快照」由 src/lib/review-dates.ts 统一探（/review/ hub 用同一份）。
  const reviewDates = await getExistingReviewDates();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL + "/",
      lastModified: dataUpdated,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      // D2 已落地（2026-10-26）：裸 /market/ 不再 307，fallback 直接渲染 A股，返回 200。
      url: SITE_URL + "/market/",
      lastModified: dataUpdated,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: SITE_URL + "/market/temperature/",
      lastModified: dataUpdated,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: SITE_URL + "/market/limit-up/",
      lastModified: dataUpdated,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: SITE_URL + "/market/fund-flow/",
      lastModified: dataUpdated,
      changeFrequency: "daily",
      priority: 0.8,
    },
    // D2 已落地（2026-10-26）：下面三个裸 URL 不再 307，返回 200，因此收回 sitemap。
    // 判据：marketFromSearchParams 的 fallback 在这三个页面被显式传为 "cn"（src/lib/market.ts）。
    // /search/ 仍然不收 —— 搜索结果页无收录价值。
    {
      url: SITE_URL + "/review/",
      lastModified: dataUpdated,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: SITE_URL + "/research/",
      lastModified: dataUpdated,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: SITE_URL + "/alerts/",
      lastModified: dataUpdated,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: SITE_URL + "/stocks/",
      lastModified: dataUpdated,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      // 内容型页面：月更，用实际最后改动日，不用 now。
      url: SITE_URL + "/portfolio/",
      lastModified: new Date("2026-09-21T10:00:00+08:00"),
      changeFrequency: "monthly",
      priority: 0.6,
    },
    {
      url: SITE_URL + "/about/",
      lastModified: new Date("2026-10-10T10:00:00+08:00"),
      changeFrequency: "monthly",
      priority: 0.5,
    },
    // G10（2026-10-27）：/api-docs/ 已加 noindex 并移出 sitemap，故意不收录。
    {
      url: SITE_URL + "/privacy/",
      lastModified: new Date("2026-10-08T10:00:00+08:00"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: SITE_URL + "/terms/",
      lastModified: new Date("2026-10-08T10:00:00+08:00"),
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  const stockPages: MetadataRoute.Sitemap = INDEXABLE_STOCK_CODES.map((code) => ({
    url: `${SITE_URL}/stock/${code}/`,
    lastModified: dataUpdated,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const reviewPages: MetadataRoute.Sitemap = reviewDates.map((date) => ({
    url: `${SITE_URL}/review/${date}/`,
    // 日报在每日 15:30（收盘后）生成，用这个时间点做 lastmod 比用 now 准确。
    lastModified: new Date(`${date}T15:30:00+08:00`),
    changeFrequency: "weekly",
    priority: date === reviewDates[0] ? 0.8 : 0.7,
  }));

  return [...staticPages, ...reviewPages, ...stockPages];
}
