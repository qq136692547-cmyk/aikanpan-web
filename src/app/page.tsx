import { Navbar } from "@/components/layout/navbar";
import { AutoRefresh } from "@/components/system/auto-refresh";
import { Footer } from "@/components/layout/footer";
import { PremarketBriefingCard } from "@/components/ai/premarket-briefing-card";
import { HomeMarketPanels } from "@/components/home/home-market-panel";
import { HomeContent } from "@/components/home/home-content";
import { HomeAlertEntry } from "@/components/alert/home-alert-entry";
import { DailyWorkflow } from "@/components/workflow/daily-workflow";
import { api, type AIReview, type Dashboard, type HkDashboard, type Insights, type UsDashboard } from "@/lib/api";
import { getDailyReviewForSSR } from "@/lib/daily-review-ssr";
import { marketFromSearchParams } from "@/lib/market";
import { buildOpenGraph } from "@/lib/open-graph";
import type { Metadata } from "next";

export const revalidate = 30;

export const metadata: Metadata = {
  // 用 absolute 绕开 layout 的 "%s · 爱看盘" 模板，避免品牌词重复出现，
  // 保证 <title>、og:title、twitter:title、og:image:alt 与首页 h1 完全一致。
  title: { absolute: "爱看盘 · A股/港股/美股 AI 复盘工作台" },
  description: "A股、港股与美股实时行情、市场温度、AI 复盘与财报日历，一屏看懂的市场复盘工作台。",
  alternates: {
    canonical: "/",
    types: { "application/rss+xml": "https://aikanpan.top/rss.xml" },
  },
  // 首页是唯一允许继承根 layout 默认 og 的页面，但仍然显式声明，
  // 这样 og:url 指向首页而不是「未声明」（此前首页 og:url 靠 layout 兜底，值恰好也对）。
  openGraph: buildOpenGraph({
    title: "爱看盘 · A股/港股/美股 AI 复盘工作台",
    description: "A股、港股与美股实时行情、市场温度、AI 复盘与财报日历，一屏看懂的市场复盘工作台。",
    url: "/",
  }),
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "爱看盘：AI 驱动的 A 股、港股与美股每日复盘工作台",
  description: "爱看盘是一款开源行情数据与研究辅助工具，覆盖 A 股沪深京市场与美股主流标的，提供实时行情、AI 复盘、个股诊断、智能盯盘与研究台。",
  author: { "@type": "Person", name: "爱看盘团队" },
  publisher: { "@id": "https://aikanpan.top/#organization" },
  datePublished: "2026-08-10",
  dateModified: "2026-09-04",
  mainEntityOfPage: "https://aikanpan.top",
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    { "@type": "Question", name: "爱看盘的数据可靠吗？", acceptedAnswer: { "@type": "Answer", text: "行情数据来自东方财富、新浪财经、Finnhub、EODHD 等公开接口，直接呈现原始数值。AI 内容由大语言模型生成，仅供参考，不构成投资建议。" } },
    { "@type": "Question", name: "爱看盘支持美股吗？", acceptedAnswer: { "@type": "Answer", text: "支持。美股覆盖真实行情、K 线、新闻、AI 解读、自选、持仓、交易流水、盯盘提醒、财报盈利数据与研究台。" } },
    { "@type": "Question", name: "盯盘提醒怎么用？", acceptedAnswer: { "@type": "Answer", text: "在盯盘页用自然语言输入条件，例如「贵州茅台跌破 1600 就提醒我」，系统自动解析并记录触发历史。页面打开时每 15 秒刷新并发送浏览器通知；关闭页面后浏览器通知停止，绑定手机号后还可开启短信提醒。" } },
    { "@type": "Question", name: "爱看盘收费吗？", acceptedAnswer: { "@type": "Answer", text: "基础功能可免费使用；AI 高频功能可升级 Pro 时长卡，支付宝付款后自动开通：30 天 ¥19.9、季卡 ¥49/90 天；48 小时内购满 3 笔季卡（实付 ¥147）自动升级 365 天年卡，均不自动续费。购买前需绑定邮箱或手机号。" } },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "如何用爱看盘做每日复盘",
  step: [
    { "@type": "HowToStep", position: 1, name: "开盘前查看市场温度", text: "打开首页查看市场温度和隔夜美股表现，了解今日市场环境" },
    { "@type": "HowToStep", position: 2, name: "盘中设置盯盘提醒", text: "在盯盘页设置条件提醒，页面打开时接收浏览器通知，也可绑定手机号开启短信" },
    { "@type": "HowToStep", position: 3, name: "收盘后阅读 AI 复盘", text: "打开复盘页，读 AI 生成的当日市场总结和涨跌停分析" },
    { "@type": "HowToStep", position: 4, name: "选股时使用 AI 诊断", text: "在搜索页输入股票代码，获取 AI 结构化诊断和评分" },
    { "@type": "HowToStep", position: 5, name: "睡前更新研究论点", text: "在研究台更新投资论点，美股夜盘数据次日同步" },
  ],
};

const personSchema = {
  "@context": "https://schema.org",
  "@type": "Person",
  name: "爱看盘团队",
  url: "https://aikanpan.top/about/",
  jobTitle: "开源投资决策工具团队",
  knowsAbout: ["A股", "美股", "AI 投资分析", "开源软件"],
  sameAs: ["https://github.com/qq136692547-cmyk/aikanpan-web"],
};

export default async function HomePage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  const { market: marketParam } = await searchParams;
  const scope = marketFromSearchParams(marketParam);

  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;
  let usDashboard: UsDashboard | null = null;
  let hkDashboard: HkDashboard | null = null;
  let usDailyReview: AIReview | null = null;
  let hkDailyReview: AIReview | null = null;

  try {
    if (scope === "all" || scope === "cn") {
      [dashboard, insights] = await Promise.all([
        api.getDashboard(),
        api.getInsights(),
      ]);
    }
    if (scope === "all" || scope === "us") {
      [usDashboard, usDailyReview] = await Promise.all([
        api.getUsDashboard(),
        getDailyReviewForSSR("us"),
      ]);
    }
    if (scope === "all" || scope === "hk") {
      [hkDashboard, hkDailyReview] = await Promise.all([
        api.getHkDashboard(),
        getDailyReviewForSSR("hk"),
      ]);
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
              {scope === "all" ? "爱看盘 · A股/港股/美股 AI 复盘工作台" : scope === "cn" ? "A股复盘" : scope === "hk" ? "港股复盘" : "美股复盘"}
            </h1>
            <p className="mt-0.5 text-[12px] text-neo-dim">
              {scope === "all" ? "并排呈现 A股、港股与美股的每日决策视图" : "AI 结论 · 核心数字 · 板块强度 · 市场温度 · 近期财报"}
            </p>
          </div>
        </section>

        <section className="mb-4">
          <PremarketBriefingCard />
        </section>

        <HomeMarketPanels
          scope={scope}
          dashboard={dashboard}
          insights={insights}
          usDashboard={usDashboard}
          hkDashboard={hkDashboard}
          usDailyReview={usDailyReview}
          hkDailyReview={hkDailyReview}
        />

        <HomeAlertEntry market={scope} className="mt-4" />

        {scope !== "all" && <DailyWorkflow className="mt-4" market={scope} />}

        {/* SEO 内容区：仅在全部模式下显示，避免重复 */}
        {scope === "all" && <HomeContent />}
      </main>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(articleSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToSchema) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(personSchema) }} />
      <Footer />
    </div>
  );
}
