import { MarketPageFrame, MarketPageHeader } from "@/components/market/market-page-shell";
import { ResearchWorkspace } from "@/components/research/research-workspace";
import { marketFromSearchParams } from "@/lib/market";
import { buildOpenGraph } from "@/lib/open-graph";
import { api, type Dashboard, type HkDashboard, type UsDashboard } from "@/lib/api";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "研究",
  description: "自选股、盘前计划、公司档案与投资论点研究台。",
  alternates: { canonical: "/research/" },
  openGraph: buildOpenGraph({
    title: "研究 · 爱看盘",
    description: "自选股、盘前计划、公司档案与投资论点研究台。",
    url: "/research/",
  }),
};

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const { market } = await searchParams;
  const scope = marketFromSearchParams(market, "cn");
  // fallback 已改为 cn，此处 scope 不可能为 "all"，分支不可达，保留作兜底
  if (scope === "all") {
    redirect("/research/?market=cn");
  }
  const isUs = scope === "us";
  const isHk = scope === "hk";
  let dashboard: Dashboard | UsDashboard | HkDashboard | null = null;

  try {
    if (isUs) {
      dashboard = await api.getUsDashboard().catch(() => null);
    } else if (isHk) {
      dashboard = await api.getHkDashboard().catch(() => null);
    } else {
      dashboard = await api.getDashboard().catch(() => null);
    }
  } catch (e) {
    console.error("Failed to fetch research data:", e);
  }

  return (
    <MarketPageFrame market={scope}>
      <MarketPageHeader
        market={scope}
        title="研究"
        subtitle="自选股、盘前计划、公司档案与投资论点"
        image="/images/ai-art/market-overview-decoration-v3.webp"
      />
      <ResearchWorkspace dashboard={dashboard} market={scope} />
    </MarketPageFrame>
  );
}
