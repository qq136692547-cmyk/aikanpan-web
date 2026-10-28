import { AlertTriangle } from "lucide-react";

/**
 * AI 结果区风险提示（F6 补全）。
 *
 * 原文案只有「AI 生成，可能存在错误，不构成投资建议」，缺「延迟」与「盈亏自负」两项。
 * 这里的「延迟」指 AI 结论基于的行情快照可能滞后于最新报价，不是说模型推理慢。
 */
export function AiDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-[10px] leading-relaxed text-neo-dim ${className}`}>
      <AlertTriangle size={12} className="mt-0.5 shrink-0 text-[var(--neo-amber)]" />
      <span>AI 生成，可能存在错误；所用行情可能延迟。不构成投资建议，盈亏自负</span>
    </p>
  );
}
