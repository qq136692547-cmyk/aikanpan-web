import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AboutBrandBanner } from "@/components/about/about-brand-banner";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "关于爱看盘",
  description: "爱看盘是一款AI驱动的股票复盘工具，提供A股行情、AI复盘、个股分析等功能。",
};

export default function AboutPage() {
  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6 sm:py-6">
        {/* 品牌故事横幅 */}
        <AboutBrandBanner />

        <section className="neo-fade-up">
          <h1 className="text-xl font-bold text-neo-ink">关于爱看盘</h1>
        <div className="mt-2 text-xs text-neo-dim">作者：爱看盘团队 &middot; <a href="https://github.com/qq136692547-cmyk/aikanpan-web" target="_blank" rel="noopener noreferrer" className="text-brand hover:opacity-80">GitHub</a></div>
        </section>

        <section className="neo-card neo-fade-up mt-6 max-w-2xl p-6" style={{ animationDelay: "60ms" }}>
          <div className="space-y-4 text-sm leading-relaxed text-neo-mid">
            <p>
              <span className="font-medium text-neo-ink">爱看盘</span> 是一款 AI 驱动的股票复盘工具，
              旨在帮助投资者快速了解市场全貌、把握投资机会。
            </p>
            <p>
              项目由爱看盘团队独立开发并开源，源码见 <a href="https://github.com/qq136692547-cmyk/aikanpan-web" target="_blank" rel="noopener noreferrer" className="text-brand transition-colors hover:opacity-80">aikanpan-web</a>，
              数据来源包括东方财富、新浪财经等主流金融数据平台。
              Web 前端采用 Next.js + Tailwind CSS 构建，
              同时提供鸿蒙原生 APP 版本。
            </p>
          </div>
        </section>

        <section className="neo-fade-up mt-8" style={{ animationDelay: "120ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-neo-mid">功能特性</h2>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { title: "实时行情", desc: "三大指数、涨跌停个股、行业板块" },
              { title: "AI 复盘", desc: "AI 生成市场摘要与风险提示" },
              { title: "AI 个股诊断", desc: "LLM 生成结构化分析、评分与决策参考" },
              { title: "AI 批量评分", desc: "涨停跌停板一键 AI 评分，快速筛选" },
              { title: "智能盯盘", desc: "自然语言创建盯盘任务，到价自动提醒" },
              { title: "个股详情", desc: "报价、资金流向、信号面板、AI 诊断" },
              { title: "市场总览", desc: "板块行情、强势行业排名" },
              { title: "资讯研报", desc: "实时市场新闻与研报精选" },
            ].map((f) => (
              <div key={f.title} className="neo-card-sm p-4 break-words overflow-hidden">
                <div className="text-sm font-medium text-neo-ink">{f.title}</div>
                <div className="mt-1 text-xs text-neo-dim break-words">{f.desc}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="neo-fade-up mt-8" style={{ animationDelay: "180ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-neo-mid">技术栈</h2>
          <div className="flex flex-wrap gap-2">
            {["Next.js 16", "React 19", "TypeScript", "Tailwind CSS 4", "shadcn/ui", "FastAPI", "Python", "HarmonyOS"].map((t) => (
              <span key={t} className="neo-card-sm rounded-md px-3 py-1 text-xs text-neo-mid">{t}</span>
            ))}
          </div>
        </section>

        {/* 使命与愿景 */}
        <section className="neo-fade-up mt-8" style={{ animationDelay: "210ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-neo-mid">使命与愿景</h2>
          <div className="neo-card mission-panel overflow-hidden p-0">
            <div className="mission-grid" aria-hidden />
            <div className="mission-beam" aria-hidden />
            <div className="mission-beam mission-beam-b" aria-hidden />
            <div className="mission-scan" aria-hidden />
            <div className="mission-edge" aria-hidden />
            <div className="mission-corner mission-corner-tl" aria-hidden />
            <div className="mission-corner mission-corner-tr" aria-hidden />
            <div className="mission-corner mission-corner-bl" aria-hidden />
            <div className="mission-corner mission-corner-br" aria-hidden />
            <div className="mission-scale" aria-hidden />
            <div className="relative p-6 sm:p-8">
              <div className="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-neo-primary">
                Mission / Vision
              </div>
              <p className="mt-4 max-w-xl text-sm leading-relaxed text-neo-ink/90 sm:text-[15px]">
                <span className="font-semibold text-neo-ink">使命</span>：让每一位投资者都能借助 AI 的力量，更高效地理解市场、把握机会。
              </p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-neo-mid sm:text-[15px]">
                <span className="font-semibold text-neo-ink">愿景</span>：成为 A 股投资者首选的 AI 辅助决策工具，让复杂的市场数据变得清晰可读。
              </p>
            </div>
          </div>
        </section>

        <section className="neo-fade-up mt-8" style={{ animationDelay: "230ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-neo-mid">常见问题</h2>
          <div className="neo-card divide-y divide-[var(--neo-edge)]">
            {[
              { q: "爱看盘是什么？", a: "爱看盘是一款开源投资决策辅助工具，覆盖 A 股与美股，提供实时行情、AI 复盘、个股诊断、智能盯盘和研究台。" },
              { q: "爱看盘的数据来源是什么？", a: "行情与资讯来自东方财富、新浪财经、Finnhub、EODHD 等公开数据接口，AI 内容由大语言模型生成。" },
              { q: "爱看盘是否收费？", a: "当前为免费测试期，网站不收费；后续如有会员或数据增值服务会提前公示。" },
              { q: "美股支持哪些功能？", a: "美股支持真实行情、K 线、新闻、AI 解读、自选、持仓、交易流水、盯盘提醒、财报盈利数据与研究台。" },
              { q: "盯盘提醒如何工作？", a: "用户用自然语言或手动条件创建盯盘任务，后端定期轮询行情，满足条件后触发浏览器通知并记录触发历史。" },
            ].map((item) => (
              <div key={item.q} className="px-4 py-3">
                <div className="text-sm font-medium text-neo-ink">{item.q}</div>
                <p className="mt-1 text-xs leading-relaxed text-neo-mid">{item.a}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="neo-fade-up mt-8" style={{ animationDelay: "240ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-neo-mid">免责声明</h2>
          <div className="neo-card p-4">
            <p className="text-xs leading-relaxed text-neo-dim">
              本网站提供的所有数据和信息仅供参考，不构成任何投资建议。数据来源为第三方平台，
              不保证数据的准确性、完整性和及时性。投资有风险，入市需谨慎。用户应基于自身判断做出投资决策，
              对投资结果自行承担责任。
            </p>
          </div>
        </section>

        <section className="neo-fade-up mt-8" style={{ animationDelay: "300ms" }}>
          <div className="relative overflow-hidden rounded-2xl">
            <img loading="lazy"
              src="/images/ai-art/api-doc-decoration.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-b from-[var(--neo-bg)]/60 via-[var(--neo-bg)]/40 to-[var(--neo-bg)]/80" />
            <div className="relative p-6">
              <h2 className="mb-3 text-sm font-semibold text-neo-mid">联系我们</h2>
              <div className="space-y-2 text-sm text-neo-mid">
                <p>微信号：<span className="font-medium text-neo-ink">denglio0</span></p>
                <p>邮箱：<a href="mailto:qq136692547@gmail.com" className="text-brand hover:opacity-80">qq136692547@gmail.com</a></p>
                <p className="text-xs text-neo-dim">AI 会员激活码可在闲鱼搜索"爱看盘"购买，或通过微信/邮箱联系我们。</p>
              </div>
              <h2 className="mb-3 mt-6 text-sm font-semibold text-neo-mid">链接</h2>
              <div className="flex flex-wrap gap-4 text-sm">
                <a href="https://github.com/qq136692547-cmyk/aikanpan-web" target="_blank" rel="noopener noreferrer" className="text-brand transition-colors hover:opacity-80">
                  GitHub 仓库 →
                </a>
                <a href="https://www.sse.com.cn" target="_blank" rel="noopener noreferrer" className="text-brand transition-colors hover:opacity-80">
                上海证券交易所 →
                </a>
                <a href="https://www.szse.cn" target="_blank" rel="noopener noreferrer" className="text-brand transition-colors hover:opacity-80">
                深圳证券交易所 →
                </a>
                <a href="https://www.csrc.gov.cn" target="_blank" rel="noopener noreferrer" className="text-brand transition-colors hover:opacity-80">
                中国证监会 →
                </a>
                <a href="https://www.eastmoney.com" target="_blank" rel="noopener noreferrer" className="text-brand transition-colors hover:opacity-80">
                东方财富 →
                </a>
                <a href="/api-docs/" className="text-brand transition-colors hover:opacity-80">
                  API 文档 →
                </a>
                <a href="/market/" className="text-brand transition-colors hover:opacity-80">
                  市场总览 →
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              { "@type": "Question", name: "爱看盘是什么？", acceptedAnswer: { "@type": "Answer", text: "爱看盘是一款开源投资决策辅助工具，覆盖 A 股与美股，提供实时行情、AI 复盘、个股诊断、智能盯盘和研究台。" } },
              { "@type": "Question", name: "爱看盘的数据来源是什么？", acceptedAnswer: { "@type": "Answer", text: "行情与资讯来自东方财富、新浪财经、Finnhub、EODHD 等公开数据接口，AI 内容由大语言模型生成。" } },
              { "@type": "Question", name: "爱看盘是否收费？", acceptedAnswer: { "@type": "Answer", text: "当前为免费测试期，网站不收费；后续如有会员或数据增值服务会提前公示。" } },
              { "@type": "Question", name: "美股支持哪些功能？", acceptedAnswer: { "@type": "Answer", text: "美股支持真实行情、K 线、新闻、AI 解读、自选、持仓、交易流水、盯盘提醒、财报盈利数据与研究台。" } },
              { "@type": "Question", name: "盯盘提醒如何工作？", acceptedAnswer: { "@type": "Answer", text: "用户用自然语言或手动条件创建盯盘任务，后端定期轮询行情，满足条件后触发浏览器通知并记录触发历史。" } },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Person",
            name: "爱看盘团队",
            url: "https://aikanpan.top/about/",
            jobTitle: "开源投资决策工具团队",
            knowsAbout: ["A股", "美股", "AI 投资分析", "开源软件"],
            hasCredential: { "@type": "EducationalOccupationalCredential", credentialCategory: "开源软件与投资分析", name: "开源投资工具团队" },
            sameAs: ["https://github.com/qq136692547-cmyk/aikanpan-web"],
          }),
        }}
      />
      <Footer />
    </div>
  );
}
