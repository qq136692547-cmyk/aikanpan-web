import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ResearchWorkspace } from "@/components/research/research-workspace";
import { api, type Dashboard, type WatchlistItem } from "@/lib/api";
import type { Metadata } from "next";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "研究",
  description: "自选股、盘前计划、公司档案与投资论点研究台。",
};

export default async function ResearchPage() {
  let watchlist: WatchlistItem[] = [];
  let dashboard: Dashboard | null = null;

  try {
    const [wl, dash] = await Promise.all([
      api.getWatchlist().catch(() => ({ watchlist: [], count: 0 })),
      api.getDashboard().catch(() => null),
    ]);
    watchlist = wl?.watchlist || [];
    dashboard = dash;
  } catch (e) {
    console.error("Failed to fetch research data:", e);
  }

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
        <ResearchWorkspace watchlist={watchlist} dashboard={dashboard} />
      </main>
      <Footer />
    </div>
  );
}
