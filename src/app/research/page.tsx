import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { ResearchWorkspace } from "@/components/research/research-workspace";
import { marketFromSearchParams } from "@/lib/market";
import { api, type Dashboard, type UsDashboard, type WatchlistItem } from "@/lib/api";
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
  let watchlist: WatchlistItem[] = [];
  let dashboard: Dashboard | UsDashboard | null = null;

  try {
    if (isUs) {
      const [wl, dash] = await Promise.all([
        api.getUsWatchlist().catch(() => ({ watchlist: [], count: 0 })),
        api.getUsDashboard().catch(() => null),
      ]);
      watchlist = (wl?.watchlist || []).map((q) => ({
        code: q.code,
        name: q.name || q.code,
        price: q.last || 0,
        change_pct: q.change_pct || 0,
      }));
      dashboard = dash;
    } else {
      const [wl, dash] = await Promise.all([
        api.getWatchlist().catch(() => ({ watchlist: [], count: 0 })),
        api.getDashboard().catch(() => null),
      ]);
      watchlist = wl?.watchlist || [];
      dashboard = dash;
    }
  } catch (e) {
    console.error("Failed to fetch research data:", e);
  }

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
        <ResearchWorkspace watchlist={watchlist} dashboard={dashboard} market={scope} />
      </main>
      <Footer />
    </div>
  );
}
