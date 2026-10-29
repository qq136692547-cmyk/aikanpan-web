import type { MetadataRoute } from "next";

/**
 * ⚠️ 注意：当前线上**实际生效的是 `public/robots.txt`**
 *（Next 里 public 下的静态文件优先于本路由），本文件是后备。
 * **两份内容必须保持同步** —— 否则将来删掉 public 那份时行为会变。
 *
 * 2026-10-29（P0）：新增 Disallow `/api/` 与 `/admin/`。
 * 理由见 `public/robots.txt` 顶部注释（实测爬虫 48.7% 的请求浪费在接口上）。
 */
const DISALLOW = ["/api/", "/admin/"];

/** 明确欢迎的 AI 爬虫 —— 与 public/robots.txt 保持同一份清单（20 个）。 */
const AI_CRAWLERS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "CCBot",
  "cohere-ai",
  "DuckAssistBot",
  "AI2Bot",
  "xAI-Bot",
  "YouBot",
  "Bytespider",
  "meta-externalagent",
  "Amazonbot",
  "Applebot-Extended",
  "PetalBot",
];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: "/", disallow: DISALLOW },
    ],
    sitemap: "https://aikanpan.top/sitemap.xml",
  };
}
