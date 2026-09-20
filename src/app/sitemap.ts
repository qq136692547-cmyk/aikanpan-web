import type { MetadataRoute } from "next";
import { getRecentReviewDates } from "@/lib/review-seo";
import { INDEXABLE_STOCK_CODES } from "@/lib/stock-seo";

const SITE_URL = "https://aikanpan.top";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();

  const staticPages: MetadataRoute.Sitemap = [
    {
      url: SITE_URL + "/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: SITE_URL + "/market/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: SITE_URL + "/market/temperature/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: SITE_URL + "/market/limit-up/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: SITE_URL + "/market/fund-flow/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: SITE_URL + "/review/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: SITE_URL + "/research/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: SITE_URL + "/portfolio/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: SITE_URL + "/alerts/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: SITE_URL + "/stocks/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: SITE_URL + "/about/",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.5,
    },
    {
      url: SITE_URL + "/api-docs/",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.4,
    },
    {
      url: SITE_URL + "/privacy/",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: SITE_URL + "/terms/",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
  ];

  const stockPages: MetadataRoute.Sitemap = INDEXABLE_STOCK_CODES.map((code) => ({
    url: `${SITE_URL}/stock/${code}/`,
    lastModified: now,
    changeFrequency: "daily",
    priority: 0.7,
  }));

  const reviewPages: MetadataRoute.Sitemap = getRecentReviewDates().map((date) => ({
    url: `${SITE_URL}/review/${date}/`,
    lastModified: new Date(`${date}T15:30:00+08:00`),
    changeFrequency: "weekly",
    priority: 0.7,
  }));

  return [...staticPages, ...reviewPages, ...stockPages];
}
