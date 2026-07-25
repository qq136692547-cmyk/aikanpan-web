import type { MetadataRoute } from "next";

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
      url: SITE_URL + "/review/",
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: SITE_URL + "/etf/",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
    },
    {
      url: SITE_URL + "/fund/",
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.3,
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
  ];

  return staticPages;
}
