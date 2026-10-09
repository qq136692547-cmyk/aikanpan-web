import type { Metadata } from "next";
import UpgradeGate from "./upgrade-gate";

export const metadata: Metadata = {
  title: "升级 Pro",
  description: "爱看盘 Pro 时长卡：跨设备研究记录、AI 复盘与研究流程。",
  robots: { index: false, follow: true },
  alternates: { canonical: "/upgrade/" },
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{
    market?: string | string[];
    pay_success?: string | string[];
    out_trade_no?: string | string[];
  }>;
}) {
  const params = await searchParams;
  // P0-4: 支付宝回跳会自带 out_trade_no，与我们 return_url 里的重复，
  // Next.js App Router 对重复 key 解析为 string[]。若数组被透传进
  // order-status 请求 URL 会被逗号拼成 "X,X"，后端查无此单必 404。
  // 这里统一取最后一个值归一化为 string（重复时两值相同，取哪个都对）。
  const lastValue = (v: string | string[] | undefined): string =>
    Array.isArray(v) ? (v[v.length - 1] ?? "") : (v ?? "");
  const marketParam = lastValue(params.market);
  const paySuccessParam = lastValue(params.pay_success);
  const outTradeNoParam = lastValue(params.out_trade_no);
  const market = marketParam === "us" ? "us" : "cn";

  return (
    <UpgradeGate
      market={market}
      paySuccess={paySuccessParam === "1"}
      outTradeNo={outTradeNoParam}
    />
  );
}
