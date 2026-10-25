"use client";

/**
 * 档位支付按钮（客户端岛）。
 *
 * 依赖 useAuth().isRealUser —— 未绑定邮箱/手机号的账号付款后权益无法绑定到
 * 可恢复的账号，所以下单前就拦住。因此按钮必须留在客户端，价格数字同理。
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

import Link from "next/link";
import { useState } from "react";
import { Loader2, Zap } from "lucide-react";
import { api } from "@/lib/api";
import { reportConversionEvent } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
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

const BIND_REQUIRED =
  "下单前需先绑定邮箱或手机号，否则付款后权益无法绑定到可恢复的账号。请先在用户中心完成绑定。";

export function PlanCta({ plan }: { plan: PricePlan }) {
  const { label, variant } = PLAN_UI[plan];
  const { user, isAuthenticated } = useAuth();
  const isRealUser = isAuthenticated && !!user?.type && user.type !== "guest";
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  // 后端 createAlipayOrder 只认 trial / monthly / quarterly；
  // 「年度时长方案」实际是连下 3 笔季卡，所以这里折回 quarterly。
  const orderPlan = plan === "annual" ? "quarterly" : plan;

  const handlePay = async () => {
    // P0-1: 点击即报（在登录门槛判定之前——点击意愿本身是漏斗信号）
    reportConversionEvent("upgrade_click", { source: orderPlan });
    setError("");
    if (!isRealUser) {
      setError(BIND_REQUIRED);
      return;
    }
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

  const needBind = !isRealUser;

  return (
    <div>
      <button
        type="button"
        onClick={handlePay}
        disabled={paying}
        className={`flex min-h-10 w-full cursor-pointer items-center justify-center gap-1.5 rounded-xl px-3 py-2.5 text-xs font-bold transition active:scale-[0.99] disabled:opacity-50 ${VARIANT_CLASS[variant]}`}
      >
        {paying ? (
          <Loader2 className="h-3.5 w-3.5 animate-spin" />
        ) : (
          <Zap className={`h-3.5 w-3.5 ${ICON_CLASS[variant]}`} />
        )}
        {label}
      </button>

      {error && (
        <div className="mt-2 text-left">
          <p className="text-[11px] leading-relaxed text-rose-300" role="alert">
            {error}
          </p>
          {needBind && (
            <Link
              href="/account"
              className="mt-1.5 inline-flex items-center rounded-md border border-rose-500/40 bg-rose-500/10 px-2.5 py-1 text-[11px] font-medium text-rose-200 transition hover:bg-rose-500/20"
            >
              前往用户中心绑定
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
