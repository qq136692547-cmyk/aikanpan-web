"use client";

import Link from "next/link";
import { reportConversionEvent } from "@/lib/analytics";

/**
 * AI 额度耗尽时的统一引导卡片。
 *
 * 之前三处（AI 复盘 / 批量评分 / 个股诊断）各写一遍 12px 的文字链「查看 Pro」，
 * 样式不一、几乎看不见。额度用尽恰恰是付费意愿最强的时刻，
 * 应该给「还剩多少 / 多少钱 / 按哪里」，而不是一个灰色下划线。
 *
 * 为什么不给「重试」按钮：额度按自然日 0 点重置，耗尽后重试必然还是 429。
 * 11-03 实测有访客在额度用完后连点「AI 诊断」7 次、间隔 2–6 秒，
 * 每点一次白发一次请求、多记一条 ai_quota_hit，把漏斗数据也搅浑了。
 * 卡片只该给两条真信息：要花多少钱、什么时候恢复。
 *
 * 数字口径：后端 AI_DAILY_FREE_LIMIT=3、AI_DAILY_PRO_LIMIT 默认 500，
 * 额度按自然日 0 点重置。
 */
export function AiQuotaCard({
  source,
  title = "今日 AI 额度已用完",
  compact = false,
}: {
  /** 埋点来源，例如 ai_review / ai_score / ai_comment */
  source: string;
  title?: string;
  compact?: boolean;
}) {
  return (
    <div className={`neo-inset rounded-md ${compact ? "px-3 py-2.5" : "px-3 py-3"}`}>
      <p className="text-xs font-medium text-neo-ink">{title}</p>
      <p className="mt-1 text-[11px] leading-relaxed text-neo-dim">
        免费版每天 3 次，Pro 每天 500 次。¥19.9 / 30 天，季卡 ¥49 / 90 天，均不自动续费；
        额度每天 0 点重置，开通后刷新页面即生效。
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Link
          href="/upgrade/"
          onClick={() => reportConversionEvent("upgrade_click", { source })}
          className="neo-btn-primary inline-flex min-h-9 items-center rounded-md px-3 py-1 text-xs font-medium text-white"
        >
          去开通 Pro
        </Link>
      </div>
    </div>
  );
}
