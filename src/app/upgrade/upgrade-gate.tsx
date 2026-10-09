"use client";

// P0-0（2026-10-09）：/upgrade 页面内容分层网关。
// 背景：游客 SSR HTML 曾包含全部档位价格与计费规则（49,466 B，可被镜像站 curl 直接拿走）。
// 方案：用 next/dynamic 的 ssr:false 在客户端水合时才加载真正的付费页组件，
// 服务端只输出骨架占位，价格与计费文案不再进入任何 SSR 响应。
// 注意：metadata 仍由 server page.tsx 提供（export const metadata 只能在 server component 使用）。

import dynamic from "next/dynamic";

const UpgradePageClient = dynamic(
  () => import("./upgrade-client").then((m) => ({ default: m.UpgradePageClient })),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "60vh",
          color: "var(--muted, #888)",
          fontSize: 14,
        }}
      >
        正在加载会员方案…
      </div>
    ),
  }
);

export default function UpgradeGate(props: {
  market?: "cn" | "us";
  paySuccess?: boolean;
  outTradeNo?: string;
}) {
  return <UpgradePageClient {...props} />;
}
