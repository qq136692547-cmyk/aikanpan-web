import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AboutBrandBanner } from "@/components/about/about-brand-banner";
import type { Metadata } from "next";

export const revalidate = 3600;

export const metadata: Metadata = {
  title: "关于爱看盘",
  description: "爱看盘是一款AI驱动的股票复盘工具，提供A股行情、AI复盘、个股分析等功能。",
  alternates: { canonical: "/about/" },
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
              旨在帮助使用者快速了解市场全貌与公开数据。
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
              { title: "AI 个股诊断", desc: "LLM 生成结构化分析与评分" },
              { title: "AI 批量评分", desc: "涨停跌停板一键 AI 评分，快速筛选" },
              { title: "智能盯盘", desc: "自然语言创建盯盘任务，页面轮询、浏览器通知与可选短信" },
              { title: "个股详情", desc: "报价、资金流向、信号面板、AI 诊断" },
              { title: "市场总览", desc: "板块行情、强势行业排名" },
              { title: "市场资讯", desc: "实时市场新闻与财务数据" },
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
                <span className="font-semibold text-neo-ink">使命</span>：让每一位使用者都能借助 AI 的力量，更高效地理解市场公开数据。
              </p>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-neo-mid sm:text-[15px]">
                <span className="font-semibold text-neo-ink">愿景</span>：成为 A 股使用者首选的 AI 行情数据与研究辅助工具，让复杂的市场数据变得清晰可读。
              </p>
            </div>
          </div>
        </section>

        <section className="neo-fade-up mt-8" style={{ animationDelay: "230ms" }}>
          <h2 className="mb-3 text-sm font-semibold text-neo-mid">常见问题</h2>
          <div className="neo-card divide-y divide-[var(--neo-edge)]">
            {[
              { q: "爱看盘是什么？", a: "爱看盘是一款开源行情数据与研究辅助工具，覆盖 A 股、港股与美股，提供实时行情、AI 复盘、个股诊断、智能盯盘和研究台。" },
              { q: "爱看盘的数据来源是什么？", a: "行情与资讯来自东方财富、新浪财经、Finnhub、EODHD 等公开数据接口，美股官方披露来自 SEC EDGAR，AI 内容由大语言模型生成。" },
              { q: "爱看盘是否收费？", a: "基础功能可免费使用；AI 高频功能可升级 Pro 时长卡，支付宝付款后自动开通：7 天体验卡 ¥1.9、30 天 ¥19、季卡 ¥49/90 天；年卡累计方案实付 ¥147/365 天，均不自动续费。购买前需绑定邮箱或手机号。" },
              { q: "美股支持哪些功能？", a: "美股支持真实行情、K 线、新闻、AI 解读、自选、持仓、交易流水、盯盘提醒、财报盈利数据与研究台。" },
              { q: "盯盘提醒如何工作？", a: "用户创建盯盘任务后，页面打开时每 15 秒刷新触发记录并发送浏览器通知；关闭页面后浏览器通知停止，绑定手机号后可开启短信提醒。" },
              { q: "付款后没开通怎么办？", a: "若支付宝已扣款但会员权益未点亮，可先用支付宝商户订单号在升级页自助找回；仍无法开通的，请通过微信 denglio0 或邮箱 qq136692547@gmail.com 提供订单号，我们会核实订单与权益状态后处理，细则见《用户协议》售后章节。" },
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
              本网站为行情数据与研究辅助工具，<strong className="text-neo-mid">运营方不具备证券投资咨询业务资格，不开展证券投资咨询业务</strong>。
              本站提供的所有数据和信息仅供参考，不构成任何投资建议、买卖推荐或价格预测；
              AI 生成内容由大语言模型自动合成，可能存在事实错误（模型幻觉），请勿作为决策依据。
            </p>
            <p className="mt-2 text-xs leading-relaxed text-neo-dim">
              数据来源为东方财富、新浪财经、Finnhub、EODHD、SEC EDGAR 等第三方公开接口，
              可能存在延迟、口径差异、缺值与更新滞后，<strong className="text-neo-mid">盘中行情通常为延时行情，不代表交易所实时成交数据或最终结算数据</strong>，
              本站不保证数据的准确性、完整性和及时性。
            </p>
            <p className="mt-2 text-xs leading-relaxed text-neo-dim">
              本站依赖第三方数据源与云服务，可能因网络、政策、数据源中断或第三方服务不可用而出现延迟、缺失或服务中断，
              本站不承诺任何具体可用性比例。投资有风险，入市需谨慎，用户应基于自身判断独立作出投资决策，
              对投资结果自行承担全部责任。
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
                <p className="text-xs text-neo-dim">Pro 激活码在支付宝付款后自动发放，如有问题可通过微信/邮箱联系我们。</p>
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
              { "@type": "Question", name: "爱看盘是什么？", acceptedAnswer: { "@type": "Answer", text: "爱看盘是一款开源行情数据与研究辅助工具，覆盖 A 股、港股与美股，提供实时行情、AI 复盘、个股诊断、智能盯盘和研究台。" } },
              { "@type": "Question", name: "爱看盘的数据来源是什么？", acceptedAnswer: { "@type": "Answer", text: "行情与资讯来自东方财富、新浪财经、Finnhub、EODHD 等公开数据接口，美股官方披露来自 SEC EDGAR，AI 内容由大语言模型生成。" } },
              { "@type": "Question", name: "爱看盘是否收费？", acceptedAnswer: { "@type": "Answer", text: "基础功能可免费使用；AI 高频功能可升级 Pro 时长卡，支付宝付款后自动开通：7 天体验卡 ¥1.9、30 天 ¥19、季卡 ¥49/90 天；年卡累计方案实付 ¥147/365 天，均不自动续费。购买前需绑定邮箱或手机号。" } },
              { "@type": "Question", name: "美股支持哪些功能？", acceptedAnswer: { "@type": "Answer", text: "美股支持真实行情、K 线、新闻、AI 解读、自选、持仓、交易流水、盯盘提醒、财报盈利数据与研究台。" } },
              { "@type": "Question", name: "盯盘提醒如何工作？", acceptedAnswer: { "@type": "Answer", text: "用户创建盯盘任务后，页面打开时每 15 秒刷新触发记录并发送浏览器通知；关闭页面后浏览器通知停止，绑定手机号后可开启短信提醒。" } },
              { "@type": "Question", name: "付款后没开通怎么办？", acceptedAnswer: { "@type": "Answer", text: "若支付宝已扣款但会员权益未点亮，可先用支付宝商户订单号在升级页自助找回；仍无法开通的，请通过微信 denglio0 或邮箱 qq136692547@gmail.com 提供订单号，我们会核实订单与权益状态后处理，细则见《用户协议》售后章节。" } },
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
