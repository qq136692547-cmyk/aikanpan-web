import { getRecentReviewDates } from "@/lib/review-seo";

/**
 * 「到底哪几天真有日报快照」的探测模块。
 *
 * 从 `src/app/sitemap.ts` 抽出来的（D13）。抽出来的原因：`/review/` 这个复盘 hub 也要内链
 * 全部真实日报页，如果两份逻辑各写一遍，sitemap 和 hub 迟早会列出不同的日期集合，爬虫在
 * 两边看到的站内图就对不上。
 */

/** 后端 API 根地址。 */
export const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://aikanpan.top/api/v1";

/**
 * 往回看多少个自然日，用来判断「这几天里到底哪几天真有日报」。
 *
 * D13 由 30 调到 100：30 天只覆盖到约 30 条真实日报，sitemap 和 hub 都收不全。
 * 实测 2026-07-19 ~ 2026-10-26 的 100 天窗口里有 68 天有快照，够 hub 凑出 60+ 条内链。
 */
export const REVIEW_LOOKBACK_DAYS = 100;

/** 日报 URL 最多输出多少条（窗口内的 404 天会被探针剔掉，这里只是硬上限）。 */
export const REVIEW_MAX_PAGES = 120;

/** 历史日期探测超时（毫秒）。历史日期只读本地快照，实测约 70ms。 */
export const REVIEW_PROBE_TIMEOUT_MS = 3000;

/**
 * 今天这个日期的探测超时。
 *
 * 接口对「非今天」的日子是读快照文件（~70ms），对「今天」是实时拉一次行情再写快照
 * （实测 2.1s），所以单独给一个更宽的时限，避免把今天的日报误判成「没数据」。
 */
export const REVIEW_PROBE_TODAY_TIMEOUT_MS = 8000;

/**
 * 探测某一天是否真有日报数据。
 *
 * 数据来源：后端 `GET /api/v1/workbench/daily-review?date=YYYY-MM-DD`。
 * 该接口对「这一天没有快照」返回 404，对「有快照」返回 200 —— 只读本地快照文件，是最便宜的
 * 存在性探针，也不需要鉴权。任何异常（超时/DNS/5xx）一律当作「没有」，绝不让调用方抛错。
 *
 * 注意 `next: { revalidate: 3600 }`：探针结果按 URL 进 Next 的数据缓存，1 小时内重复渲染不会
 * 真的再打一遍后端。所以外面不需要再包 `unstable_cache`。
 */
async function hasReviewSnapshot(date: string, timeoutMs = REVIEW_PROBE_TIMEOUT_MS): Promise<boolean> {
  try {
    const res = await fetch(`${API_BASE}/workbench/daily-review?date=${encodeURIComponent(date)}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(timeoutMs),
      next: { revalidate: 3600 },
    });
    return res.status === 200;
  } catch {
    return false;
  }
}

/**
 * 只返回「真实存在日报数据」的日期，新的在前。
 *
 * 旧实现是 getRecentReviewDates() 纯滚动窗口，不判断数据是否存在，于是会把
 * 2026-08-19 ~ 2026-08-30 那段 12 天断档一起列出去 —— 那些页现在是「该日暂无复盘」+
 * `noindex, follow`（D12），把站内链接权重导向 noindex 页是浪费。
 *
 * 兜底两层：
 * 1. 如果所有探测都失败（后端不可达等），退回旧的滚动窗口，宁可列出可能没数据的日期，
 *    也不要让 sitemap 突然少掉一整组 URL。
 * 2. 整个函数不抛错 —— sitemap 500 比少几条 URL 严重得多。
 */
export async function getExistingReviewDates(): Promise<string[]> {
  try {
    const candidates = getRecentReviewDates(REVIEW_LOOKBACK_DAYS);
    if (candidates.length === 0) return [];

    // 今天单独先探一次：它走实时行情拉取（约 2s），和历史日期的快照读取（约 70ms）不是一个量级，
    // 混在并发里会因为抢连接被误判超时。先串行探完今天，再并探历史日期。
    const [latest, ...history] = candidates;
    const latestExists = await hasReviewSnapshot(latest, REVIEW_PROBE_TODAY_TIMEOUT_MS);
    const settled = await Promise.allSettled(history.map((date) => hasReviewSnapshot(date)));

    const existing = history.filter((_, index) => {
      const result = settled[index];
      return result.status === "fulfilled" && result.value === true;
    });
    if (latestExists) existing.unshift(latest);

    if (existing.length > 0) return existing.slice(0, REVIEW_MAX_PAGES);
    return getRecentReviewDates();
  } catch (error) {
    console.error("Failed to probe existing review dates, falling back to calendar window:", error);
    try {
      return getRecentReviewDates();
    } catch {
      return [];
    }
  }
}
