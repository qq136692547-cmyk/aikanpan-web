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

/**
 * 常驻余量条的四种生命周期阶段。
 *
 * 背景（10-29 ~ 11-05 实测）：真人曝光 167 次、点击 **0** 次，
 * 其中 89% 落在 `r3/3` —— 访客一次都还没用过 AI，看到「AI 剩余 3/3」。
 * 这个数字是在做「余量管理」，而访客还没进入管理余量的心智，所以做成按钮也没人点；
 * 更糟的是它指向 /upgrade/，一个还没用过 AI 的人直接落到价格页，是断层。
 *
 * 于是分四态各给各的语义：idle 讲价值、mid 报余量、low 催一下、out 给出价格。
 */
export type QuotaStage = "idle" | "mid" | "low" | "out";

/** 后端 AI_DAILY_PRO_LIMIT 的默认值（server.py），文案里要用到 */
export const AI_PRO_DAILY_LIMIT = 500;

/** 四态判定。抽成纯函数是为了能被 tests/ai-quota-stage.test.mjs 直接覆盖。 */
export function quotaStage(remaining: number | undefined, limit: number | undefined): QuotaStage {
  if (typeof remaining !== "number" || typeof limit !== "number" || limit <= 0) return "idle";
  if (remaining <= 0) return "out";
  if (remaining >= limit) return "idle";
  if (remaining <= 1) return "low";
  return "mid";
}

/**
 * 各阶段文案。
 * idle 讲「有多少免费额度」，mid/low 讲「还剩几次」，
 * out 讲「能换到多少」——耗尽时用户关心的是 Pro 值不值，不是还剩 0。
 */
export function quotaLabel(
  stage: QuotaStage,
  remaining: number,
  limit: number,
  proLimit: number = AI_PRO_DAILY_LIMIT
): string {
  if (stage === "idle") return `AI 诊断 · 每天 ${limit} 次免费`;
  if (stage === "out") return `开通 Pro · 每天 ${proLimit} 次`;
  return `AI 剩余 ${remaining}/${limit}`;
}
