import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { PortfolioWorkspace } from "@/components/portfolio/portfolio-workspace";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "持仓组合",
  description: "爱看盘持仓管理：盈亏汇总、仓位占比、持仓明细。",
};

export default function PortfolioPage() {
  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
        <PortfolioWorkspace />
      </main>
      <Footer />
    </div>
  );
}
