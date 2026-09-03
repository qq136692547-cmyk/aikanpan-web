import { Navbar } from "@/components/layout/navbar";
import { AutoRefresh } from "@/components/system/auto-refresh";
import { Footer } from "@/components/layout/footer";
import { HomeMarketPanels } from "@/components/home/home-market-panel";
import { HomeContent } from "@/components/home/home-content";
import { DailyWorkflow } from "@/components/workflow/daily-workflow";
import { api, type Dashboard, type Insights, type UsDashboard } from "@/lib/api";
import { marketFromSearchParams } from "@/lib/market";
import type { Metadata } from "next";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "爱看盘 · AI 复盘工作台",
  description: "A股与美股实时行情、市场温度、AI 复盘与财报日历，一屏看懂的市场复盘工作台。",
};

const articleSchema = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "爱看盘：AI 驱动的 A 股与美股每日复盘工作台",
  description: "爱看盘是一款开源投资决策辅助工具，覆盖 A 股沪深京市场与美股主流标的，提供实时行情、AI 复盘、个股诊断、智能盯盘与研究台。",
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
    { "@type": "Question", name: "盯盘提醒怎么用？", acceptedAnswer: { "@type": "Answer", text: "在盯盘页用自然语言输入条件，例如「贵州茅台跌破 1600 就提醒我」，系统自动解析并持续监控，满足条件后触发浏览器通知并记录触发历史。" } },
    { "@type": "Question", name: "爱看盘收费吗？", acceptedAnswer: { "@type": "Answer", text: "基础功能免费使用，AI 高频功能需要激活码开通会员。当前为测试期。" } },
  ],
};

const howToSchema = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "如何用爱看盘做每日复盘",
  step: [
    { "@type": "HowToStep", position: 1, name: "开盘前查看市场温度", text: "打开首页查看市场温度和隔夜美股表现，判断今日仓位倾向" },
    { "@type": "HowToStep", position: 2, name: "盘中设置盯盘提醒", text: "在盯盘页设置条件提醒，不用一直盯盘，到价自动通知" },
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