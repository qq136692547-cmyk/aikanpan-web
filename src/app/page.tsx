import { Navbar } from "@/components/layout/navbar";
import { AutoRefresh } from "@/components/system/auto-refresh";
import { Footer } from "@/components/layout/footer";
import { HomeMarketPanels } from "@/components/home/home-market-panel";
import { DailyWorkflow } from "@/components/workflow/daily-workflow";
import { api, type Dashboard, type Insights, type UsDashboard } from "@/lib/api";
import { marketFromSearchParams } from "@/lib/market";
import type { Metadata } from "next";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "爱看盘 · AI 复盘工作台",
  description: "A股与美股实时行情、市场温度、AI 复盘与财报日历，一屏看懂的市场复盘工作台。",
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const { market: marketParam } = await searchParams;
  const scope = marketFromSearchParams(marketParam);

  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;
  let usDashboard: UsDashboard | null = null;

  try {
    if (scope !== "us") {
      [dashboard, insights] = await Promise.all([
        api.getDashboard(),
        api.getInsights(),
      ]);
    }
    if (scope !== "cn") {
      usDashboard = await api.getUsDashboard();
    }
  } catch (error) {
    console.error("Failed to fetch home data:", error);
  }

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6 sm:py-5">
        <AutoRefresh />
        <section className="mb-3 flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[18px] font-bold tracking-tight text-neo-ink">
              {scope === "all" ? "全部市场" : scope === "cn" ? "A股复盘" : "美股复盘"}
            </h1>
            <p className="mt-0.5 text-[12px] text-neo-dim">
              {scope === "all" ? "左右镜像呈现 A股与美股的每日决策视图" : "AI 结论 · 核心数字 · 板块强度 · 市场温度 · 近期财报"}
            </p>
          </div>
        </section>

        <HomeMarketPanels scope={scope} dashboard={dashboard} insights={insights} usDashboard={usDashboard} />

        {scope !== "all" && <DailyWorkflow className="mt-4" />}
      </main>
      <Footer />
    </div>
  );
}
