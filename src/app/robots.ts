import type { MetadataRoute } from "next";

/**
 * ⚠️ 注意：当前线上**实际生效的是 `public/robots.txt`**
 *（Next 里 public 下的静态文件优先于本路由），本文件是后备。
 * **两份内容必须保持同步** —— 否则将来删掉 public 那份时行为会变。
 *
 * 2026-10-29（P0）：新增 Disallow `/api/` 与 `/admin/`。
 * 理由见 `public/robots.txt` 顶部注释（实测爬虫 48.7% 的请求浪费在接口上）。
 */
const DISALLOW = ["/api/", "/admin/", "/_next/static/"];

/**
 * 2026-11-12（P0）：放行 CSS，其余 `/_next/static/` 全挡。
 *
 * 全站唯一 CSS 是 `/_next/static/chunks/<hash>.css`，hash 每次构建都变，
 * 所以只能按 `*.css` 通配放行 —— 写死文件名下次构建就失效。
 * 挡 JS 不损失收录：页面正文 100% 在 SSR HTML 里（个股页可见文本 517 字，实测）。
 */
const ALLOW = ["/", "/_next/static/chunks/*.css"];

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
      { userAgent: "*", allow: ALLOW, disallow: DISALLOW },
      { userAgent: AI_CRAWLERS, allow: ALLOW, disallow: DISALLOW },
    ],
    sitemap: "https://aikanpan.top/sitemap.xml",
  };
}
