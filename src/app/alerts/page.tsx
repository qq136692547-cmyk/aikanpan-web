import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AlertInput } from "@/components/alert/alert-input";
import { AlertManager } from "@/components/alert/alert-manager";
import { AlertSettings } from "@/components/alert/alert-settings";
import { marketFromSearchParams } from "@/lib/market";
import type { Metadata } from "next";

export const revalidate = 15;

export const metadata: Metadata = {
  title: "智能盯盘",
  description: "用自然语言创建盯盘任务，AI 自动解析条件并实时监控。支持价格突破、涨跌幅监控，到价自动提醒。",
};

const alertsJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "智能盯盘 · 爱看盘",
  description: "用自然语言创建盯盘任务，AI 自动解析条件并实时监控",
  applicationCategory: "FinanceApplication",
  featureList: ["自然语言创建", "AI 解析", "实时监控", "到价提醒"],
  offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
};

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const { market } = await searchParams;
  const scope = marketFromSearchParams(market);
  const isUs = scope === "us";
  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-3 sm:px-6 sm:py-4">
        <section>
          <div className="relative overflow-hidden rounded-2xl">
            <img loading="lazy"
              src="/images/ai-art/alerts-robot-v2.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--neo-bg)]/70 via-[var(--neo-bg)]/50 to-[var(--neo-bg)]/70" />
            <div className="relative">
            <h1 className="text-[14px] font-medium text-neo-ink">{isUs ? "智能盯盘 · 美股" : "智能盯盘"}</h1>
            <p className="mt-0.5 text-[12px] text-neo-mid">
              {isUs ? "用自然语言描述美股盯盘条件，AI 自动解析并持续监控" : "用自然语言描述盯盘条件，AI 自动解析并持续监控"}
            </p>
            </div>
          </div>
        </section>

        <section className="mt-3">
          <AlertInput market={scope} />
        </section>

        <section className="mt-4">
          <AlertSettings />
        </section>

        <section className="mt-4">
          <AlertManager market={scope} />
        </section>

      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(alertsJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "如何创建智能盯盘任务",
            step: [
              { "@type": "HowToStep", position: 1, name: "输入盯盘条件", text: "输入自然语言，如「苹果跌到180提醒我」，或手动组合价格、涨跌幅、成交量条件。" },
              { "@type": "HowToStep", position: 2, name: "确认股票与条件", text: "AI 解析后确认股票代码和阈值，可继续添加或删除条件。" },
              { "@type": "HowToStep", position: 3, name: "等待触发提醒", text: "后端持续轮询行情，条件满足后触发浏览器通知并记录触发历史。" },
            ],
          }),
        }}
      />
    </div>
  );
}
