import { MarketPageFrame, MarketPageHeader } from "@/components/market/market-page-shell";
import { AlertInput } from "@/components/alert/alert-input";
import { AlertManager } from "@/components/alert/alert-manager";
import { AlertSettings } from "@/components/alert/alert-settings";
import { marketFromSearchParams } from "@/lib/market";
import { buildOpenGraph } from "@/lib/open-graph";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 15;

export const metadata: Metadata = {
  title: "智能盯盘",
  description: "用自然语言创建盯盘任务，AI 自动解析条件。页面打开时轮询触发记录，并支持浏览器通知与短信提醒。",
  alternates: { canonical: "/alerts/" },
  openGraph: buildOpenGraph({
    title: "智能盯盘 · 爱看盘",
    description: "用自然语言创建盯盘任务，AI 自动解析条件。页面打开时轮询触发记录，并支持浏览器通知与短信提醒。",
    url: "/alerts/",
  }),
};

const alertsJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "智能盯盘 · 爱看盘",
  description: "用自然语言创建盯盘任务，AI 自动解析条件并记录触发历史",
  applicationCategory: "FinanceApplication",
  featureList: ["自然语言创建", "AI 解析", "页面轮询", "浏览器通知", "短信提醒"],
  // 与 src/app/layout.tsx 的 WebApplication 保持一致：真实在售的是月卡 ¥19.9、季卡 ¥49，
  // 不能写 price:"0"（那等于声明免费用不了）。年卡 ¥147 是自动升级结果，不是标价。
  offers: {
    "@type": "AggregateOffer",
    lowPrice: "19.9",
    highPrice: "49",
    priceCurrency: "CNY",
  },
};

export default async function AlertsPage({ searchParams }: { searchParams: Promise<{ market?: string; code?: string }> }) {
  const { market, code } = await searchParams;
  const scope = marketFromSearchParams(market, "cn");
  // fallback 已改为 cn，此处 scope 不可能为 "all"，分支不可达，保留作兜底
  if (scope === "all") {
    // 带上 code，避免从个股页带入的代码在重定向时丢失
    redirect(code ? `/alerts/?market=cn&code=${encodeURIComponent(code)}` : "/alerts/?market=cn");
  }
  return (
    <MarketPageFrame market={scope}>
      <MarketPageHeader
        market={scope}
        title="盯盘"
        subtitle="用自然语言创建盯盘条件，AI 自动解析并记录触发历史"
        image="/images/ai-art/alerts-robot-v3.png"
      />

        <section className="mt-3">
          <AlertInput market={scope} initialCode={code} />
        </section>

        <section className="mt-4">
          <AlertSettings />
        </section>

        <section className="mt-4">
          <AlertManager market={scope} />
        </section>

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
              { "@type": "HowToStep", position: 3, name: "等待触发提醒", text: "页面打开时每 15 秒刷新触发记录；浏览器通知仅在页面打开时发送，绑定手机号后还可开启短信提醒。" },
            ],
          }),
        }}
      />
    </MarketPageFrame>
  );
}
