"use client";

/**
 * 档位支付按钮（客户端岛）。
 *
 * 2026-10-29：取消「未绑定手机号不许下单」的硬门槛。
 *
 * 原实现在 handlePay 里 `if (!isRealUser) { setError(BIND_REQUIRED); return; }`，
 * 连下单接口都不调，直接弹「请先绑定」。后果：全站 8,417 个游客、仅 92 个
 * 绑定过手机号，等于把 99% 的购买意愿挡在门外。对账结果是订单文件最后一笔
 * 停在 2026-10-08（正是加这条门槛的当天），此后 21 天 0 单，而 10-13 / 10-28
 * 各有真人点「开通 90 天」却没留下任何订单。
 *
 * 而这条路本来就是通的：历史 21 笔订单里 15 笔的 user_id 就是 guest_ 前缀；
 * 后端 record_order_paid_and_grant 全文不含 guest 判断，照常发货；
 * server.py `_merge_user_data` 注释原文「合并 membership 会员权益（游客付款后
 * 登录手机号继承 Pro）」；付款成功页还会当场发恢复码（upgrade-pay-status.tsx）。
 *
 * 现在防刷单改由后端按「同账号 24h 内未支付订单数」限流，前端不再做身份判断。
 * 身份说明统一放在页面顶部那张说明卡里（page.tsx），避免每个档位重复一遍。
 *
 * ⚠️ 按钮文案里**不能带价格**：`<PlanCta label="¥49 开通 90 天" />` 这种写法会把
 * label 作为 prop 序列化进 RSC flight payload，价格照样出现在 HTML 里（实测 3 处）。
 * 所以文案在这里按 plan 内部计算，价格只出现在上方 plan-price 那个水合后才填的岛里。
 *
 * 另外 `"use client"` 组件仍会被服务端渲染，靠它本身挡不住价格 —— 见 plan-price.tsx。
 *
 * 状态是每个按钮各自的：点其中一个会整页跳转到支付宝，不存在同时点两个的场景，
 * 共享一个 paying 只是历史写法。
 */

import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { reportConversionEvent } from "@/lib/analytics";
import type { PricePlan } from "./plan-price";

const VARIANT_CLASS = {
  primary:
    "bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20 hover:brightness-110",
  plain: "bg-neutral-800 text-white hover:bg-neutral-700",
  purple: "border border-purple-500/50 bg-purple-600/30 text-purple-200 hover:bg-purple-600/40",
} as const;

const ICON_CLASS = {
  primary: "fill-black",
  plain: "text-blue-400",
  purple: "text-purple-400",
} as const;

type Variant = keyof typeof VARIANT_CLASS;

const PLAN_UI: Record<PricePlan, { label: string; variant: Variant }> = {
  quarterly: { label: "开通 90 天", variant: "primary" },
  monthly: { label: "开通 30 天", variant: "plain" },
  annual: { label: "开通 90 天", variant: "purple" },
};

export function PlanCta({ plan }: { plan: PricePlan }) {
  const { label, variant } = PLAN_UI[plan];
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // 后端 createAlipayOrder 只认 trial / monthly / quarterly；
  // 「年度时长方案」实际是连下 3 笔季卡，所以这里折回 quarterly。
  const orderPlan = plan === "annual" ? "quarterly" : plan;

  const handlePay = async () => {
    // P0-1: 点击即报（点击意愿本身是漏斗信号）
    reportConversionEvent("upgrade_click", { source: orderPlan });
    setError("");
    setPaying(true);
    try {
      const res = await api.createAlipayOrder(orderPlan);
      if (res && res.data && res.data.pay_url) {
        window.location.href = res.data.pay_url;
      } else {
        setError("创建支付订单失败，请稍后重试");
        setPaying(false);
      }
    } catch (err: unknown) {
      setError(
        err instanceof Error && err.message ? err.message : "支付服务暂时不可用，请稍后重试"
      );
      setPaying(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className={`flex min-h-11 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition active:scale-[0.99] disabled:opacity-50 ${VARIANT_CLASS[variant]}`}
      >
        {paying ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Zap className={`h-3.5 w-3.5 ${ICON_CLASS[variant]}`} />
        )}
        {label}
      </button>

      {error && (
        <p className="mt-2 text-left text-[11px] leading-relaxed text-rose-300" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
