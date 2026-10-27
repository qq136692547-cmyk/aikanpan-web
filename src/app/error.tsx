"use client";

import { useEffect } from "react";
import Link from "next/link";
import { reportClientError } from "@/lib/analytics";

/**
 * 路由级错误边界（App Router）。
 *
 * 为什么必须有：`/stock/[code]` 在后端瞬时故障时改为 `throw`，没有这个文件时
 * 用户看到的是 Next 那套没有样式的默认错误页——没有品牌、没有返回路径、也没有重试。
 *
 * 文案只给「发生了什么 + 该做什么」，不猜原因、不承诺恢复时间：
 * 我们确实不知道原因，写「服务繁忙」就是编。
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    reportClientError({
      scope: "app",
      message: String(error.message || error.name),
      digest: error.digest,
    });
    // 只依赖 digest：同一个错误重渲染时不要重复上报。
    // message 变化不构成新错误（Next 的 digest 才是稳定指纹），故刻意不收进依赖。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error.digest]);

  return (
    <div className="neo-page flex min-h-screen flex-col items-center justify-center px-6 py-10 text-center">
      <div className="neo-card w-full max-w-md p-8">
        <h1 className="text-[20px] font-bold text-neo-ink">这个页面出错了</h1>
        <p className="mt-2 text-[14px] text-neo-dim">数据没有丢，可以重试</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => reset()}
            className="neo-btn-primary inline-flex min-h-11 items-center rounded-xl px-6 py-3 text-[14px] font-semibold"
          >
            重新加载
          </button>
          <Link
            href="/"
            className="neo-btn inline-flex min-h-11 items-center rounded-xl px-6 py-3 text-[14px] font-semibold text-neo-ink"
          >
            回首页
          </Link>
        </div>
      </div>
    </div>
  );
}
