import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "关于爱看盘",
  description: "爱看盘是一款AI驱动的股票复盘工具，提供A股行情、AI复盘、个股分析等功能。",
};

export default function AboutPage() {
  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        <section className="animate-fade-up">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">关于爱看盘</h1>
        </section>

        <section className="mt-6 animate-fade-up max-w-2xl" style={{ animationDelay: "60ms" }}>
          <div className="space-y-4 text-sm leading-relaxed text-[var(--text-secondary)]">
            <p>
              <span className="font-medium text-[var(--text-primary)]">爱看盘</span> 是一款 AI 驱动的股票复盘工具，
              旨在帮助投资者快速了解市场全貌、把握投资机会。
            </p>
            <p>
              项目后端基于 <a href="https://github.com/zqj372-ops/daily_stock_analysis_workbench" target="_blank" rel="noopener noreferrer" className="text-brand transition-fast hover:opacity-80">daily_stock_analysis_workbench</a>，
              数据来源包括东方财富、新浪财经等主流金融数据平台。
              Web 前端采用 Next.js + Tailwind CSS 构建，
              同时提供鸿蒙原生 APP 版本。
            </p>
          </div>
        </section>

        <section className="mt-8 animate-fade-up" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">功能特性</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "实时行情", desc: "三大指数、涨跌停个股、行业板块" },
              { title: "AI 复盘", desc: "AI 生成市场摘要和投资信号" },
              { title: "个股详情", desc: "报价、资金流向、事件驱动分析" },
              { title: "市场总览", desc: "板块行情、强势行业排名" },
              { title: "资讯研报", desc: "实时市场新闻与研报精选" },
              { title: "深色主题", desc: "专业金融仪表盘视觉风格" },
            ].map((f) => (
              <div key={f.title} className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                <div className="text-sm font-medium text-[var(--text-primary)]">{f.title}</div>
                <div className="mt-1 text-xs text-[var(--text-tertiary)]">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="mt-8 animate-fade-up" style={{ animationDelay: "180ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">技术栈</h2>
          <div className="flex flex-wrap gap-2">
            {["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "shadcn/ui", "FastAPI", "Python", "HarmonyOS"].map((t) => (
              <span key={t} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-1 text-xs text-[var(--text-secondary)]">{t}</span>
            ))}
          </div>
        </section>

        <section className="mt-8 animate-fade-up" style={{ animationDelay: "240ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">免责声明</h2>
          <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
            <p className="text-xs leading-relaxed text-[var(--text-tertiary)]">
              本网站提供的所有数据和信息仅供参考，不构成任何投资建议。数据来源为第三方平台，
              不保证数据的准确性、完整性和及时性。投资有风险，入市需谨慎。用户应基于自身判断做出投资决策，
              对投资结果自行承担责任。
            </p>
          </div>
        </section>

        <section className="mt-8 animate-fade-up" style={{ animationDelay: "300ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">链接</h2>
          <div className="flex flex-wrap gap-4 text-sm">
            <a href="https://github.com/zqj372-ops/daily_stock_analysis_workbench" target="_blank" rel="noopener noreferrer" className="text-brand transition-fast hover:opacity-80">
              GitHub 仓库 →
            </a>
            <a href="/api-docs/" className="text-brand transition-fast hover:opacity-80">
              API 文档 →
            </a>
            <a href="/market/" className="text-brand transition-fast hover:opacity-80">
              市场总览 →
            </a>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
