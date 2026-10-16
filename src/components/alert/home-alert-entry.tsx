"use client";

import Link from "next/link";
import { BellRing } from "lucide-react";
import { reportConversionEvent } from "@/lib/analytics";
import { type MarketScope } from "@/lib/market";

const EXAMPLE: Record<"cn" | "hk" | "us", string> = {
  cn: "茅台跌破 1500 提醒我",
  hk: "腾讯跌破 380 提醒我",
  us: "苹果跌到 180 提醒我",
};

const MARKET_LABEL: Record<"cn" | "hk" | "us", string> = {
  cn: "A股",
  hk: "港股",
  us: "美股",
};

/**
 * 首页「智能盯盘」常驻入口 —— 把 /alerts 从导航第 5 位提到首屏可见。
 * 纯展示 + 跳转，埋点用 feature_use + source 区分来源（后端白名单已含该事件）。
 */
export function HomeAlertEntry({ market, className = "" }: { market: MarketScope; className?: string }) {
  const scope: "cn" | "hk" | "us" = market === "hk" ? "hk" : market === "us" ? "us" : "cn";

  return (
    <section className={`neo-card-sm flex flex-wrap items-center justify-between gap-3 p-4 ${className}`} aria-label="智能盯盘入口">
      <div className="flex min-w-0 items-start gap-3">
        <span className="neo-card-sm flex h-9 w-9 shrink-0 items-center justify-center" style={{ borderRadius: 10 }}>
          <BellRing size={16} style={{ color: "var(--neo-primary)" }} />
        </span>
        <div className="min-w-0">
          <h2 className="text-[13px] font-semibold text-neo-ink">
            {market === "all" ? "智能盯盘" : `智能盯盘 · ${MARKET_LABEL[scope]}`}
          </h2>
          <p className="mt-0.5 text-[11px] leading-relaxed text-neo-dim">
            用自然语言设条件，如「{EXAMPLE[scope]}」。服务端持续监控，绑定邮箱或手机号后关闭页面也能收到提醒；免费可建 1 条。
          </p>
        </div>
      </div>
      <Link
        href={`/alerts/?market=${scope}`}
        onClick={() => reportConversionEvent("feature_use", { source: "alert_entry_home" })}
        className="neo-btn-primary inline-flex min-h-11 shrink-0 items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium text-white"
      >
        <BellRing size={13} />
        去设置盯盘
      </Link>
    </section>
  );
}
