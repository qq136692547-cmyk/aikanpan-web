"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { Sparkles, ChevronRight } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";
import { reportConversionEvent } from "@/lib/analytics";
import { quotaLabel, quotaStage } from "@/lib/ai-quota";

/**
 * AI 额度的**常驻余量条**（不是「用尽才出现」的卡片）。
 *
 * 10 月实测（analytics_shards）：全站 12 万 PV，ai_quota_hit 只有 45 次。
 * 不是额度给少了，是没人知道自己有额度 —— 于是有了这条。
 *
 * 上线后第二次实测（10-29 ~ 11-05）：真人曝光 167 次、点击 **0** 次。
 * 其中 148 次（89%）落在 `r3/3:free` —— 即访客一次都还没用过 AI，
 * 看到的是「AI 剩余 3/3」。问题不在视觉：`3/3` 是在做「余量管理」，
 * 而访客还没进入"管理余量"的心智，这个数字对他是零信息，做成按钮也没人点。
 * 更糟的是它指向 /upgrade/ —— 一个还没用过 AI 的人直接落到价格页，是断层。
 *
 * 所以按生命周期分四态，各给各的语义：
 *   idle (r >= limit)     不可点，讲价值：「AI 诊断 · 每天 3 次免费」
 *   mid  (1 < r < limit)  可点，报余量：「AI 剩余 2/3 ›」
 *   low  (r == 1)         可点，催一下：「AI 剩余 1/3 ›」（amber）
 *   out  (r == 0)         可点，给出口：实心「开通 Pro · 每天 500 次」
 *
 * 先让他用，用完才有付费动机 —— 付费漏斗的入口是"第一次使用"，不是"价格页"。
 *
 * 埋点 label 加了阶段段（`source:stage:rX/Y:plan`），旧数据是三段
 * （`source:rX/Y:plan`），可以直接对比改造前后"非 idle 态占比"。
 *
 * 数据来源：`/membership/status` 已返回 ai_remaining / ai_daily_limit / plan，
 * 走现成的 useMembership()（SWR 5s 去重），前端零新增接口。
 *
 * 语义色分工（globals.css:546 / 728）：余量表达的是「可用性好坏」，
 * 用 success/danger/amber 一族，不是 up/down（那是涨跌方向），两者不可混用。
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
  const stage = quotaStage(remaining, limit);

  // 曝光埋点：拿到真实数字后才记一次。
  // 复用白名单里的 feature_use 会污染「功能使用」口径，所以单独用 ai_quota_view
  // （后端 _ANALYTIC_EVENT_TYPES 已同步新增该事件名）。
  useEffect(() => {
    if (!ready || firedRef.current) return;
    if (!isAuthenticated) return;
    firedRef.current = true;
    reportConversionEvent("ai_quota_view", {
      source: `${source}:${stage}:r${remaining}/${limit}:${plan}`,
    });
  }, [ready, isAuthenticated, remaining, limit, plan, source, stage]);

  if (authLoading || !isAuthenticated || !ready) return null;
  // 类型收窄：ready 是派生布尔，TS 不会据此收窄，这里显式判一次
  if (typeof remaining !== "number" || typeof limit !== "number") return null;

  const text = quotaLabel(stage, remaining, limit);

  // idle：不可点。做成 <span> 而不是 <Link>，是因为这里没有该去的页面——
  // 用户还没用过 AI，把他推到价格页只会断层。
  if (stage === "idle") {
    return (
      <span
        title={`免费版每天 ${limit} 次 AI 诊断与复盘；Pro 每天 500 次`}
        className={`inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full border border-white/[0.08] bg-[var(--neo-surface-inset)] px-2 py-0.5 text-[11px] font-medium tabular-nums text-neo-mid ${className}`}
      >
        <Sparkles size={11} className="shrink-0 text-neo-primary/70" />
        {text}
      </span>
    );
  }

  const exhausted = stage === "out";
  const toneClass = exhausted
    ? "border-transparent bg-neo-primary text-white shadow-sm hover:brightness-110"
    : stage === "low"
      ? "border-neo-amber/40 bg-neo-amber/10 text-neo-amber hover:border-neo-amber/70"
      : "border-white/[0.10] bg-white/[0.03] text-neo-mid hover:border-neo-primary/40 hover:text-neo-primary";

  return (
    <Link
      href="/upgrade/"
      onClick={() =>
        reportConversionEvent("upgrade_click", {
          source: `${source}_quota_bar_${stage}`,
        })
      }
      title={
        exhausted
          ? "今日 AI 额度已用完，开通 Pro 每天 500 次"
          : plan === "pro"
            ? `Pro 会员今日 AI 额度剩余 ${remaining} 次`
            : `免费版今日 AI 额度剩余 ${remaining} 次，Pro 每天 500 次`
      }
      className={`group inline-flex min-h-6 shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-medium tabular-nums transition-colors ${toneClass} ${className}`}
    >
      {text}
      <ChevronRight
        size={12}
        className="shrink-0 opacity-60 transition-transform group-hover:translate-x-0.5"
      />
    </Link>
  );
}
