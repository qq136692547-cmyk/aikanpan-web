import { ShieldAlert } from "lucide-react";

/**
 * 个股页常驻四要素提示（F6）。
 *
 * 四要素必须同时在场，缺一条合规告知就打折：
 *   无资质   —— 不具备证券投资咨询资格
 *   延迟     —— 行情取自第三方公开接口，可能延迟
 *   幻觉     —— AI 内容可能出错
 *   盈亏自负 —— 不构成投资建议，盈亏自负
 *
 * 为什么不靠页脚那条：页脚提示在 375×667 下要滚四屏才看得到，工单判据是「首屏可见」。
 * 为什么不做成可关闭：这是常驻风险告知，不是一次性通知。一次性那条是游客账号告知（GuestNoticeBar）。
 */
export function MarketDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p
      className={`mb-3 flex items-start gap-1.5 text-[10px] leading-relaxed text-neo-dim ${className}`}
    >
      <ShieldAlert size={12} className="mt-0.5 shrink-0 text-[var(--neo-amber)]" aria-hidden />
      <span>
        本站不具备证券投资咨询资格；行情取自第三方公开接口，可能延迟或有误，AI 内容可能出错。仅供参考，不构成投资建议，盈亏自负。
      </span>
    </p>
  );
}
