import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ResearchWorkspace } from "@/components/research/research-workspace";
import { marketFromSearchParams } from "@/lib/market";
import { api, type Dashboard, type UsDashboard } from "@/lib/api";
import type { Metadata } from "next";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "研究",
  description: "自选股、盘前计划、公司档案与投资论点研究台。",
};

export default async function ResearchPage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const { market } = await searchParams;
  const scope = marketFromSearchParams(market);
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
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
        <ResearchWorkspace dashboard={dashboard} market={scope} />
      </main>
      <Footer />
    </div>
  );
}
