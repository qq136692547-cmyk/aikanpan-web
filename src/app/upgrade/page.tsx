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
    market?: string;
    pay_success?: string;
    out_trade_no?: string;
  }>;
}) {
  const {
    market: marketParam,
    pay_success: paySuccessParam,
    out_trade_no: outTradeNoParam,
  } = await searchParams;
  const market = marketParam === "us" ? "us" : "cn";

  return (
    <UpgradeGate
      market={market}
      paySuccess={paySuccessParam === "1"}
      outTradeNo={outTradeNoParam || ""}
    />
  );
}
