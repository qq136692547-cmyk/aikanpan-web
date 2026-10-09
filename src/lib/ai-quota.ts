/**
 * AI 额度事件判定 —— 与传输层限流的区分逻辑。
 *
 * 背景：传输层（按 IP / 按 Key 的滑动窗口配额）与会员 AI 日报额度都可能返回 429。
 * 传输层响应带 `X-Quota-Limit` / `X-Quota-Remaining` 头，不应计入 `ai_quota_hit`，
 * 否则爬虫触发的限流会把转化漏斗的「AI 额度触顶」分母灌水。
 *
 * 当前采用黑名单：只排除携带传输层头部的响应；无该头时维持原行为，
 * 避免真实额度事件漏报（漏报比虚高更危险）。后端给出会员额度耗尽的 detail 原文后，
 * 可在此处补白名单匹配。
 */

export const AI_QUOTA_PATHS = [
  "/ai/", "/us/daily-review", "/hk/daily-review", "/portfolio-review", "/plan-focus", "/news-radar", "/alerts/parse"
];

/** 是否属于会计入 AI 额度的路径 */
export function isAiQuotaPath(path: string): boolean {
  const normalized = path.toLowerCase();
  return (
    AI_QUOTA_PATHS.some((prefix) => normalized.includes(prefix)) ||
    (normalized.startsWith("/workbench/temperature") && normalized.includes("ai=true"))
  );
}

/** 传输层限流响应头（任一存在即判定为传输层，而非会员 AI 额度耗尽） */
function isTransportQuotaResponse(headers: Headers): boolean {
  return headers.has("X-Quota-Limit") || headers.has("X-Quota-Remaining");
}

/**
 * 是否应上报 `ai_quota_hit`。
 * 仅在「AI 路径 + HTTP 429 + 无传输层限流头」时上报；其余情况一律不上报。
 */
export function shouldReportAiQuotaHit(
  status: number,
  headers: Headers,
  path: string
): boolean {
  if (status !== 429) return false;
  if (!isAiQuotaPath(path)) return false;
  return !isTransportQuotaResponse(headers);
}

/** 后端会员 AI 额度耗尽的错误码（经 429 响应头 X-Error-Code 透传，api.ts 挂到 err.code） */
export const AI_QUOTA_EXHAUSTED_CODE = "ai_quota_exhausted";

/**
 * P0-2: 判定前端捕获的 Error 是否为「会员 AI 额度耗尽」，供错误分支渲染升级 CTA。
 * 优先匹配后端错误码（稳定契约），回退匹配 detail 文案（兼容未带码的旧响应）。
 */
export function isAiQuotaExhaustedError(error: unknown): boolean {
  if (!error) return false;
  const code = (error as Error & { code?: string }).code;
  if (code === AI_QUOTA_EXHAUSTED_CODE) return true;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("升级 Pro");
}
