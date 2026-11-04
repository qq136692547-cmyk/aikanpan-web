/**
 * 日报日期窗口裁剪（纯函数，无任何 import）。
 *
 * 单独成文件的原因：`review-dates.ts` 里全是 fetch 与 Next 缓存配置，并且用了 `@/` 路径别名，
 * Node 的原生测试跑不动它。把纯计算抽出来，测试可以直接 import 这个文件，
 * 不必为了测试去搭别名解析器。
 */

/**
 * 把日期列表裁到「最近 days 个自然日（含今天）」窗口内，新的在前。
 *
 * `today` 由调用方传入而不是读系统时钟 —— 否则跨零点跑测试会随机红。
 * 非法格式一律剔除，任何情况下都不抛错（sitemap 500 比少几条 URL 严重得多）。
 */
export function filterDatesInWindow(dates: string[], days: number, today: string): string[] {
  if (!Array.isArray(dates) || dates.length === 0) return [];
  if (!Number.isFinite(days) || days < 1) return [];
  const base = new Date(`${today}T00:00:00`);
  if (Number.isNaN(base.getTime())) return [];
  base.setDate(base.getDate() - (days - 1));
  const start = base.toLocaleDateString("sv");
  return dates
    .filter((d) => typeof d === "string" && /^\d{4}-\d{2}-\d{2}$/.test(d) && d >= start && d <= today)
    .sort()
    .reverse();
}
