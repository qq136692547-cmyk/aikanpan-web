"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { reportConversionEvent } from "@/lib/analytics";

/**
 * AI 额度的**常驻余量条**（不是「用尽才出现」的卡片）。
 *
 * 为什么加这个：原来整站只有 `ai-quota-card.tsx`，而它只在额度耗尽时才渲染。
 * 于是用户在耗尽之前，既不知道自己每天有 3 次额度，也不知道 Pro 有 500 次——
 * 「有这个额度」这件事从头到尾没有被看见过。
 *
 * 10 月实测（analytics_shards/2026-10.jsonl）：全站 12 万 PV，
 * ai_quota_hit 只有 45 次。不是额度给少了，是没人知道自己有额度。
 * 付费动机的第一步是「意识到余量在减少」，而不是「突然被告知用完了」。
 *
 * 数据来源：`/membership/status` 已返回 ai_remaining / ai_daily_limit / plan，
 * 走现成的 useMembership()（SWR 5s 去重），前端零新增接口。
 *
 * 语义色分工（globals.css:546 / 728）：
 *   - 余量 > 1 → text-neo-dim（中性，不打扰）
 *   - 余量 = 1 → text-neo-amber（该注意了）
 *   - 余量 = 0 → text-neo-danger（用不了了）
 * 这里表达的是「可用性好坏」，所以用 success/danger/amber 一族，
 * 不是 up/down（那是涨跌方向），两者不可混用。
 */
export function AiQuotaBar({
  source,
  className = "",
}: {
  /** 埋点来源，例如 home_premarket / ai_review */
  source: string;
  className?: string;
}) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { membership, loading } = useMembership();
  const firedRef = useRef(false);

  const remaining = membership?.ai_remaining;
  const limit = membership?.ai_daily_limit;
  const plan = membership?.plan ?? "free";
  const ready = !loading && typeof remaining === "number" && typeof limit === "number";

  // 曝光埋点：拿到真实数字后才记一次。
  // 复用白名单里的 feature_use 会污染「功能使用」口径，所以单独用 ai_quota_view
  // （后端 _ANALYTIC_EVENT_TYPES 已同步新增该事件名）。
  useEffect(() => {
    if (!ready || firedRef.current) return;
    if (!isAuthenticated) return;
    firedRef.current = true;
    reportConversionEvent("ai_quota_view", {
      source: `${source}:r${remaining}/${limit}:${plan}`,
    });
  }, [ready, isAuthenticated, remaining, limit, plan, source]);

  if (authLoading || !isAuthenticated || !ready) return null;

  const exhausted = remaining <= 0;
  const tight = !exhausted && remaining <= 1;
  const toneClass = exhausted ? "text-neo-danger" : tight ? "text-neo-amber" : "text-neo-dim";

  return (
    <Link
      href="/upgrade/"
      onClick={() =>
        reportConversionEvent("upgrade_click", {
          source: `${source}_quota_bar${exhausted ? "_exhausted" : ""}`,
        })
      }
      title={
        exhausted
          ? "今日 AI 额度已用完，开通 Pro 每天 500 次"
          : plan === "pro"
            ? `Pro 会员今日 AI 额度剩余 ${remaining} 次`
            : `免费版今日 AI 额度剩余 ${remaining} 次，Pro 每天 500 次`
      }
      className={`inline-flex min-h-6 shrink-0 items-center gap-1 rounded px-1.5 py-0.5 text-[11px] font-medium tabular-nums transition-colors hover-neo-inset ${toneClass} ${className}`}
    >
      {exhausted ? (
        <>AI 已用完 · 开通 Pro</>
      ) : (
        <>
          AI 剩余 <span className="font-semibold">{remaining}</span>/{limit}
        </>
      )}
    </Link>
  );
}
