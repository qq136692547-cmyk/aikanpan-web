import { MarketPageFrame, MarketPageHeader } from "@/components/market/market-page-shell";
import { ResearchWorkspace } from "@/components/research/research-workspace";
import { marketFromSearchParams } from "@/lib/market";
import { api, type Dashboard, type UsDashboard } from "@/lib/api";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "研究",
  description: "自选股、盘前计划、公司档案与投资论点研究台。",
};

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const { market } = await searchParams;
  const scope = marketFromSearchParams(market);
  if (scope === "all") {
    redirect("/research/?market=cn");
  }
  const isUs = scope === "us";
  let dashboard: Dashboard | UsDashboard | null = null;

  try {
    if (isUs) {
      dashboard = await api.getUsDashboard().catch(() => null);
    } else {
      dashboard = await api.getDashboard().catch(() => null);
    }
  } catch (e) {
    console.error("Failed to fetch research data:", e);
  }

  return (
    <MarketPageFrame>
      <MarketPageHeader
        market={scope}
        title="研究"
        subtitle="自选股、盘前计划、公司档案与投资论点"
        image="/images/ai-art/market-overview-decoration.png"
      />
      <ResearchWorkspace dashboard={dashboard} market={scope} />
    </MarketPageFrame>
  );
}
