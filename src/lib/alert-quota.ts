/**
 * 盯盘条数配额判定。
 *
 * 后端「免费 1 条 / Pro 10 条」的额度用的是 403（不是 429），
 * 与 AI 额度是两套口径，不能复用 isAiQuotaExhaustedError ——
 * 那个函数会退回匹配「升级 Pro」文案，而盯盘的 403 文案里也有「升级 Pro」，
 * 混用会把两种配额算到同一个漏斗里。
 *
 * 优先匹配后端错误码（`X-Error-Code: alert_quota_exhausted`），
 * 回退匹配文案以兼容未带码的旧响应。
 */

export const ALERT_QUOTA_EXHAUSTED_CODE = "alert_quota_exhausted";

export function isAlertQuotaError(error: unknown): boolean {
  if (!error) return false;
  const code = (error as Error & { code?: string }).code;
  if (code === ALERT_QUOTA_EXHAUSTED_CODE) return true;
  const message = error instanceof Error ? error.message : String(error);
  return message.includes("盯盘") && (message.includes("最多") || message.includes("升级 Pro"));
}
