"use client";

import { useCallback, useEffect, useState } from "react";
import { X } from "lucide-react";
import { useAuth } from "@/lib/auth";

/**
 * 首访游客账号告知条（F8）。
 *
 * 背景：`src/lib/auth.tsx` 在 localStorage 没有凭证时会**静默**调 `/auth/guest-login`
 * 创建账号并把自选股等数据同步到服务器。条款/隐私页写了这件事，但首访时零提示——
 * 这是「未经告知即创建账号」，隐私合规上站不住。本组件是首屏可见的那条告知。
 *
 * 三条设计约束（改之前先看完）：
 * 1. **整条必须 ≤ 28px 且单行**。首页 375×667 下第一张行情卡底边目前是 787px，
 *    加任何东西都会把首屏内容往下推。实测：本条 28px + margin 4px，抵掉早报卡副标题
 *    32px 后净 0px（787 → 787），这才是「任何中间态都不能比现状差」。
 *    所以正文 `whitespace-nowrap` + 省略号，宁可截字也不许换行变高。
 * 2. **关闭按钮视觉 20px、触控热区 44px**（G7 标准），靠 `h-11 w-11` + 负 margin
 *    把布局占位收回到 20px，不然这一条立刻被撑到 44px 高。
 * 3. **只在客态显示**。已绑定邮箱/手机号的用户不该看到「游客账号已创建」。
 *
 * 为什么用 localStorage 而不用 cookie：cookie 会让首页从 ISR 退化成动态渲染，
 * 为了一个一次性提示条付这个代价不值。代价是首访会有一帧后插入（一次性 CLS）。
 */
const DISMISS_KEY = "aikanpan.guest-notice-dismissed.v1";

export function GuestNoticeBar() {
  const { user, loading } = useAuth();
  // 初值 true：SSR 与首帧都不渲染，等读完 localStorage 再决定。
  // 反过来（初值 false）会让已关闭过的用户每次都看到一闪。
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(window.localStorage.getItem(DISMISS_KEY) === "1");
    } catch {
      // 隐私模式下 localStorage 可能直接抛错；此时宁可持续显示，也不能悄悄吞掉告知。
      setDismissed(false);
    }
  }, []);

  const dismiss = useCallback(() => {
    try {
      window.localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // 存不进去也没关系：本次会话内 setDismissed 已经生效，只是下次访问会再提示一次。
    }
    setDismissed(true);
  }, []);

  if (dismissed || loading || user?.type !== "guest") return null;

  return (
    <div className="mb-1 flex items-center gap-2 rounded-lg border border-[var(--neo-border)] bg-neo-inset px-2 py-[3px] text-[11px] leading-[1.35] text-neo-dim">
      {/* live region 只包文本：放按钮/链接进去，屏幕阅读器会把交互元素一起念，反而念不清告知本身。 */}
      <span role="status" className="min-w-0 flex-1 truncate">
        游客账号已自动创建 · 数据存于本站
      </span>
      <a
        href="/privacy/"
        className="shrink-0 text-neo-primary underline decoration-dotted underline-offset-2"
      >
        了解
      </a>
      <button
        type="button"
        onClick={dismiss}
        aria-label="关闭游客账号提示"
        className="-my-3 -mr-1 flex h-11 w-11 shrink-0 items-center justify-center rounded text-neo-dim transition-colors hover:text-neo-ink"
      >
        <X size={12} aria-hidden />
      </button>
    </div>
  );
}
