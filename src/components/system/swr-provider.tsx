"use client";

import type { ReactNode } from "react";
import { SWRConfig } from "swr";

/**
 * 全局 SWR 配置：给失败请求设上限。
 *
 * 背景（2026-10-29 实测）：
 * SWR 的 shouldRetryOnError 默认是「无限次指数退避」，而项目里没有任何 SWRConfig 覆盖它。
 * 后果是 —— AI 额度用完后接口持续返回 429，一个挂在后台的标签页会一直重试：
 * 某访客 02:27:55 被卡住，之后 65 分钟里又发了 20 次请求
 * （间隔 6s / 32s / 68s / 144s / 365s / 816s / 1277s / 2473s / 4254s / 5325s）。
 * 每次 429 都会在 lib/api.ts 的传输层记一条 ai_quota_hit，于是「1 个人被卡住」
 * 被放大成「21 次撞墙」，整个漏斗数据失真十倍以上。
 *
 * 规则：
 * - 4xx（429 / 401 / 403 / 404）是确定性失败，重试没有意义，直接停。
 * - 5xx 与网络错误最多再试 2 次，间隔 2s、4s。
 *
 * ⚠️ 这套判定依赖 lib/api.ts 把 HTTP 状态码挂到 err.status 上；
 *    若那边改成只抛 message，这里的 4xx 规则会静默失效（tests/swr-retry.test.mjs 守着）。
 */
const MAX_RETRIES = 2;

export function SwrProvider({ children }: { children: ReactNode }) {
  return (
    <SWRConfig
      value={{
        onErrorRetry: (error, _key, _config, revalidate, opts) => {
          const status = (error as { status?: number } | null)?.status;
          if (typeof status === "number" && status >= 400 && status < 500) return;
          if (opts.retryCount >= MAX_RETRIES) return;
          const delay = 2000 * 2 ** opts.retryCount;
          setTimeout(() => revalidate({ retryCount: opts.retryCount + 1 }), delay);
        },
      }}
    >
      {children}
    </SWRConfig>
  );
}
