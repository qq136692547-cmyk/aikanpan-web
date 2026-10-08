import { api, type AIReview } from "@/lib/api";

/**
 * 首屏用的每日复盘结论（预生成 + 进程内缓存）。
 *
 * 后端 /us|hk/daily-review 是"生成并缓存"语义：冷缓存时单次要 6~9 秒，
 * 直接同步等待会把首页 TTFB 拉爆。这里做两件事：
 * 1. 进程内缓存 10 分钟，命中时首屏 HTML 直接带出结论（不请求后端）；
 * 2. 未命中时只等 1.2 秒：拿到就渲染，拿不到就让后台请求继续跑，
 *    本次先渲染"不含占位文案"的完整面板，客户端 SWR 到达后补齐。
 * 这样爬虫/低峰请求也只会触发有上限的后端调用（每市场最多每 10 分钟一次）。
 */

const TTL_MS = 10 * 60 * 1000;
const WAIT_MS = 1200;

type Market = "us" | "hk";

const cache: Record<Market, { at: number; data: AIReview | null; pending: Promise<void> | null }> = {
  us: { at: 0, data: null, pending: null },
  hk: { at: 0, data: null, pending: null },
};

function refresh(market: Market): Promise<void> {
  const entry = cache[market];
  if (entry.pending) return entry.pending;
  entry.pending = (async () => {
    try {
      entry.data = market === "us" ? await api.getUsDailyReview() : await api.getHkDailyReview();
    } catch {
      // 失败时保留上一次结论，并等待一个 TTL 再重试，避免错误放大成请求风暴
    } finally {
      entry.at = Date.now();
      entry.pending = null;
    }
  })();
  return entry.pending;
}

export async function getDailyReviewForSSR(market: Market): Promise<AIReview | null> {
  const entry = cache[market];
  if (Date.now() - entry.at < TTL_MS) return entry.data;

  const pending = refresh(market);
  const timedOut = Symbol("timeout");
  const result = await Promise.race([
    pending.then(() => cache[market].data),
    new Promise<typeof timedOut>((resolve) => setTimeout(() => resolve(timedOut), WAIT_MS)),
  ]);
  return result === timedOut ? null : result;
}
