"use client";

/**
 * 档位价格数字（客户端岛，水合后才填）。
 *
 * ⚠️ 这里有个必须记住的点：`"use client"` 组件**仍然会被服务端渲染**，
 * 只有 next/dynamic 的 `ssr:false` 才跳 SSR。所以光把价格搬进 "use client"
 * 文件是没用的 —— 实测 SSR HTML 里照样出现 ¥49 / ¥19.9 / ¥57（含 RSC payload 共 6+3+1 处）。
 * 真正挡住它的机制是下面这个「是否已水合」判定：服务端一律输出等宽占位，
 * 客户端水合完成后才换成数字。
 *
 * 为什么用 useSyncExternalStore 而不是 useState+useEffect：
 * 本项目 eslint 开了 react-hooks/set-state-in-effect（error），在 effect 里
 * 同步 setState 会直接报错；而 useSyncExternalStore 的 server snapshot 机制
 * 天然表达「服务端看到 A、客户端看到 B」，也不会产生 hydration mismatch。
 *
 * 为什么要挡：/upgrade 的档位价格与计费规则曾被镜像站用 curl 从游客 SSR HTML
 * 整段拿走。此前的做法是整页 ssr:false，价格是挡住了，但备案号、资质边界、
 * 权益列表、售后说明一起被挡在 SSR 之外 —— 首屏只剩 21 个可见字符，
 * 慢网 LCP 2,988ms（首页 692ms）。现在只挡价格这一小块（改后首屏 1,213 字符）。
 *
 * 代价是无 JS 时价格不显示。可接受：这一页的支付按钮本身就依赖 JS。
 * **不要**为此加 <noscript> 价格表 —— 那等于把洞重新打开。
 * 本文件以外（尤其 page.tsx）不要再写任何价格数字。
 */

import { useSyncExternalStore } from "react";

export type PricePlan = "quarterly" | "monthly" | "annual";

/** 占位块宽度，按各档位价格行的实际宽度预留，避免水合时抖动 */
const PLACEHOLDER_WIDTH: Record<PricePlan, string> = {
  quarterly: "w-[172px]",
  monthly: "w-[158px]",
  annual: "w-[196px]",
};

/** 取值只取决于「服务端还是客户端」，在同一环境内恒定，因此不需要通知变化 */
const subscribe = () => () => {};
const getClientSnapshot = () => true;
const getServerSnapshot = () => false;

export function PlanPrice({ plan }: { plan: PricePlan }) {
  const hydrated = useSyncExternalStore(subscribe, getClientSnapshot, getServerSnapshot);

  if (!hydrated) {
    return <span aria-hidden="true" className={`inline-block h-8 ${PLACEHOLDER_WIDTH[plan]}`} />;
  }

  if (plan === "monthly") {
    return (
      <>
        <span className="text-2xl font-extrabold text-white font-mono">¥19.9</span>
        <span className="text-xs text-neutral-400">/ 月</span>
        <span className="ml-1 text-[11px] text-neutral-500 font-mono">约 0.66 元/天</span>
      </>
    );
  }

  if (plan === "annual") {
    return (
      <>
        <span className="text-2xl font-extrabold text-white font-mono">¥49</span>
        <span className="text-xs text-neutral-400">× 3 笔</span>
        <span className="ml-1 text-[11px] font-medium text-purple-400 font-mono">折合约 12.3 元/月</span>
      </>
    );
  }

  return (
    <>
      <span className="text-3xl font-extrabold text-amber-400 font-mono">¥49</span>
      <span className="text-xs text-neutral-400">/ 季 (90 天)</span>
      <span className="ml-1 text-[11px] text-neutral-500 font-mono line-through">¥57</span>
    </>
  );
}
