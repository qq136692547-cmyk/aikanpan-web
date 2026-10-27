"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/** 隐藏不到这个时长就切回来，不算「离开过」，不值得重新取数。 */
const RESUME_MIN_HIDDEN_MS = 5000;

/**
 * 定时重渲染当前页，把最新行情拉下来。
 *
 * 只在标签页可见时刷新。隐藏的标签页里照样每 30 秒打一次 RSC 请求：
 * 用户看不到，服务端却要为它把首页完整渲染一遍（首页最多 4 个后端请求）。
 * 实测（无头 Chrome 后台标签，75 秒窗口）：隐藏期间仍精确刷新 2 次，落在 29.4s / 59.4s，
 * 即每小时 120 次 —— 浏览器的后台节流并没有削掉 30 秒定时器。
 * 手机端代价更大：后台页会一直被唤醒。
 *
 * 切回可见时补刷一次，把隐藏期间跳过的那些补上，用户不用再等一个周期才看到新数据。
 */
export function AutoRefresh({ interval = 30000 }: { interval?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => router.refresh();

    const tick = () => {
      // 隐藏时不刷新：主动跳过，不是靠浏览器节流。
      if (document.hidden) return;
      refresh();
    };
    const id = setInterval(tick, interval);

    /**
     * 用「隐藏了多久」判断要不要补刷，而不是「距上次刷新多久」：
     * 后者在长时间隐藏后仍可能因为刚刷新过而跳过，让用户白等一个周期。
     */
    let hiddenSince = document.hidden ? Date.now() : 0;
    const onVisibilityChange = () => {
      if (document.hidden) {
        hiddenSince = Date.now();
        return;
      }
      const away = hiddenSince ? Date.now() - hiddenSince : 0;
      hiddenSince = 0;
      if (away < RESUME_MIN_HIDDEN_MS) return;
      refresh();
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [router, interval]);

  return null;
}
