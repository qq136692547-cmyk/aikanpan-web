/**
 * 行情请求失败的归因（N6）。
 *
 * 背景：`/stock/[code]/` 原来把「行情取不到」一律当成「这个代码不存在」→ `notFound()`。
 * 但 `quote` 为 null 有两种完全不同的原因：
 *
 * 1. 后端明确说「这个代码没有行情」→ 应该 404；
 * 2. 后端超时 / 500 / 网络断 → 只是瞬时故障，下一次请求可能就好了。
 *
 * 混成一种的后果：一次后端抖动会让一个有效个股页变成 404，而 `revalidate = 30` 还会把这个
 * 假 404 缓存 30 秒，期间所有爬虫和用户看到的都是「不存在」。
 *
 * 后端语义（server.py 实读）：
 * - `GET /api/v1/stocks/{code}/quote` 只在数据源 `available is False` 时 `raise HTTPException(503)`；
 * - `_cached_fetch` 在数据源抛异常且无 300 秒内旧数据时原样抛出 → FastAPI 返回 500。
 *
 * 所以：503 / 404 = 代码不存在；其余全部 = 瞬时。
 */

export type QuoteFailureKind = "not-found" | "transient";

/** 后端用来表达「这个代码没有行情」的两个状态码。 */
const NOT_FOUND_STATUSES = new Set([404, 503]);

/**
 * 判断一次行情失败到底是「代码不存在」还是「后端瞬时故障」。
 *
 * 默认返回 `"transient"` —— 不确定的时候不许声称「不存在」。误判成 transient 的代价是
 * 多返回一次 500（下次请求自愈）；误判成 not-found 的代价是一个有效页面被缓存成 404。
 */
export function classifyQuoteFailure(err: unknown): QuoteFailureKind {
  if (typeof err !== "object" || err === null) return "transient";
  const status = (err as { status?: unknown }).status;
  if (typeof status === "number" && NOT_FOUND_STATUSES.has(status)) return "not-found";
  return "transient";
}
