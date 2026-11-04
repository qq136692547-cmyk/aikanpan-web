import { getRecentReviewDates } from "@/lib/review-seo";

/**
 * 「到底哪几天真有日报快照」的探测模块。
 *
 * 从 `src/app/sitemap.ts` 抽出来的（D13）。抽出来的原因：`/review/` 这个复盘 hub 也要内链
 * 全部真实日报页，如果两份逻辑各写一遍，sitemap 和 hub 迟早会列出不同的日期集合，爬虫在
 * 两边看到的站内图就对不上。
 *
 * ## 2026-11-05：从「逐日探针」改成「一次拿列表」
 *
 * 旧实现对 100 个候选日期各打一次 `/workbench/daily-review?date=`，命中返回 200、
 * 没快照返回 404。原以为 `next: { revalidate: 3600 }` 能把 404 也缓存住 —— **这个假设是错的**：
 * Next 的 fetch 数据缓存不缓存非 2xx 响应，于是每次页面渲染都会把那 22~33 个空日期全量重探。
 *
 * 实测代价（Caddy access.log 全量）：
 * - `/api/v1/workbench/daily-review` 共 86,257 次请求，其中 **59,269 次是 404（68.7%）**
 * - `/review/` 一天被请求 1,582 次，每次渲染触发 22 个 404（现场实测：2 次页面请求 → 44 个 404）
 * - 每个空日期一天被探 1,084 次，整齐得完全不像真人
 *
 * 而且这些请求的 UA 全是 `node`（SSR 发出），它们把「AI 接口调用量」统计污染成 74% 的假量。
 *
 * 现在改为向后端 `GET /workbench/review-dates` 要一份列表 —— 快照本来就是本地文件，
 * 列一次目录即可，且语义与旧探针**完全等价**（`_daily_review_payload` 对非今天日期
 * 只有一条判定：文件在就 200，不在就 404）。
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

/** 日报 URL 最多输出多少条（窗口内的 404 天会被剔掉，这里只是硬上限）。 */
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

/** 北京时间的「今天」，格式 YYYY-MM-DD。与后端 `_now()[:10]` 同口径。 */
function todayLocal(): string {
  return new Date().toLocaleDateString("sv");
}

// 纯函数单独放 review-window.ts：本文件带 `@/` 别名与 fetch，Node 原生测试跑不动它。
import { filterDatesInWindow } from "@/lib/review-window";
export { filterDatesInWindow };

/**
 * 向后端要「有快照的日期列表」，一次请求。
 *
 * 返回 null 表示**接口不可用**（网络错误 / 非 200 / 结构不对），调用方据此回退到旧探针。
 * 返回空数组表示接口正常但确实没有快照 —— 那是权威答案，不该当成失败再探 100 次。
 */
async function fetchExistingDatesFromApi(): Promise<string[] | null> {
  try {
    const res = await fetch(`${API_BASE}/workbench/review-dates?days=${REVIEW_MAX_PAGES}`, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(REVIEW_PROBE_TIMEOUT_MS),
      // 200 会被缓存；日报一天只多一条，1 小时足够新。
      next: { revalidate: 3600 },
    });
    if (!res.ok) return null;
    const data: unknown = await res.json();
    const list = (data as { dates?: unknown } | null)?.dates;
    if (!Array.isArray(list)) return null;
    return list.filter((d): d is string => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d));
  } catch {
    return null;
  }
}

/**
 * 探测某一天是否真有日报数据（**兜底路径专用**）。
 *
 * 只有新接口不可用时才会跑到这里。注意 `next: { revalidate: 3600 }` 对 **404 无效**，
 * 所以这条路一旦被频繁触发，就会退回到每天 5 万次 404 的老样子 —— 它的存在只是为了
 * 「接口挂了也别让 sitemap 崩」，不是常规路径。
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

/** 兜底：逐日探针。仅当 `/workbench/review-dates` 不可用时使用。 */
async function probeOneByOne(): Promise<string[]> {
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
  return existing;
}

/**
 * 只返回「真实存在日报数据」的日期，新的在前。
 *
 * 三层：
 * 1. 新接口 `/workbench/review-dates` —— 常规路径，1 次请求。
 * 2. 接口不可用 → 退回逐日探针（旧实现，见 `probeOneByOne`）。
 * 3. 探针也全失败 → 退回纯滚动窗口，宁可列出可能没数据的日期，也不要让 sitemap 突然少掉一整组 URL。
 *
 * 整个函数不抛错 —— sitemap 500 比少几条 URL 严重得多。
 */
export async function getExistingReviewDates(): Promise<string[]> {
  try {
    const fromApi = await fetchExistingDatesFromApi();
    if (fromApi !== null) {
      // 按「最近 100 个自然日」原语义裁一次（接口给的是全量，可能早于窗口）。
      const inWindow = filterDatesInWindow(fromApi, REVIEW_LOOKBACK_DAYS, todayLocal());
      if (inWindow.length > 0) return inWindow.slice(0, REVIEW_MAX_PAGES);
      // 接口正常但窗口内确实没快照：交给下面的滚动窗口兜底，与旧行为一致。
      return getRecentReviewDates();
    }

    const existing = await probeOneByOne();
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
