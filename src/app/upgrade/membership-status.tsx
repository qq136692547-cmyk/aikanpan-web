"use client";

/**
 * 「当前账户状态」卡片（客户端岛）。
 *
 * 会员状态与今日剩余次数都来自 useMembership()，只能客户端取；
 * 而这张卡在整页里的位置固定在最上面，所以抽象成一个岛嵌进服务端页面即可。
 * 游客登录失败时（user 恒为 null、loading 变 false），原来的写法会让「刷新」
 * 与「绑定手机号」都失去意义，这里改挂统一的 AuthRetryNotice。
 */

import Link from "next/link";
import { Crown, RefreshCw, Zap } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { AuthRetryNotice } from "@/components/system/auth-retry-notice";

export function MembershipStatus() {
  const { user, isAuthenticated, loading, error: authError, retry } = useAuth();
  const { membership, refresh } = useMembership();

  const isRealUser = isAuthenticated && !!user?.type && user.type !== "guest";
  const isPro = membership?.plan === "pro";
  const freeDailyLimit = membership?.ai_daily_limit ?? 5;
  const freeRemaining = Math.max(0, freeDailyLimit - (membership?.ai_used_today ?? 0));

  if (loading) {
    return (
      <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-5">
        <div className="h-14" aria-hidden="true" />
      </div>
    );
  }

  if (authError) {
    return (
      <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-5">
        <AuthRetryNotice onRetry={retry} />
      </div>
    );
  }

  return (
    <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-5">
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-white">当前：</span>
              {isPro ? (
                <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                  <Crown className="h-3 w-3" /> Pro 会员 (有效)
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-400">
                  免费版 · 今日剩余 {freeRemaining} 次
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-neutral-400">
              {isPro && membership?.expires_at
                ? `会员有效期至：${membership.expires_at.replace("T", " ").slice(0, 16)} · 每日可反复使用 AI 分析（上限 500 次）`
                : "每日 3 次 AI 分析，可用于复盘、个股诊断与批量评分"}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => refresh()}
            className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 transition hover:border-neutral-700 hover:text-white"
            title="刷新状态"
          >
            <RefreshCw className="h-3.5 w-3.5" />
            刷新
          </button>
          {!isRealUser && (
            <Link
              href="/account"
              className="inline-flex items-center gap-1 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-neutral-700"
            >
              绑定手机号
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
