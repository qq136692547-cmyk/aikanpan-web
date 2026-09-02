import type { Metadata } from "next";
import { UpgradePageClient } from "./upgrade-client";

export const metadata: Metadata = {
  title: "升级 Pro",
  description: "爱看盘 Pro 订阅：每日 AI 复盘、个股诊断与盯盘工作流。",
};

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ market?: string }>;
}) {
  const { market: marketParam } = await searchParams;
  const market = marketParam === "us" ? "us" : "cn";

  return <UpgradePageClient market={market} />;
}
