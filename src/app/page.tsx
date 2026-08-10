import { Navbar } from "@/components/layout/navbar";
import { AutoRefresh } from "@/components/system/auto-refresh";
import { Footer } from "@/components/layout/footer";
import { MarketTemperaturePanel } from "@/components/ai/market-temperature-panel";
import { NewsRadarCard } from "@/components/ai/news-radar";
import { HomeLimitCard } from "@/components/ai/home-limit-card";
import { HomeLimitTopList } from "@/components/ai/home-limit-top-list";
import { TechCanvasBackground } from "@/components/landing/tech-canvas-background";
import { AIReview } from "@/components/ai/ai-review";
import { Sparkline } from "@/components/chart/sparkline";
import { UsDashboardSection } from "@/components/us/us-dashboard-section";
import { api, type Dashboard, type Insights, type UsDashboard } from "@/lib/api";
import { formatPct, formatPrice, formatChange } from "@/lib/format";
import { marketFromSearchParams } from "@/lib/market";
import { marketPhaseText, marketPhaseLive } from "@/lib/market-status";
import type { Metadata } from "next";

export const revalidate = 30;

export const metadata: Metadata = {
  title: "爱看盘 · AI 复盘工作台",
  description: "A股实时行情、情绪温度、涨停池、强势行业与 AI 复盘摘要，一屏看懂的复盘工作台。",
};

function neoTrendClass(pct: number) {
  return pct > 0 ? "text-neo-up" : pct < 0 ? "text-neo-down" : "text-neo-mid";
}

function sourceLabel(source?: string): string {
  const map: Record<string, string> = {
    tx: "腾讯行情",
    sina: "新浪行情",
    eastmoney: "东方财富",
    ths: "同花顺",
    "sina-finance": "新浪财经",
  };
  return map[source || ""] || source || "行情";
}



export default async function HomePage({ searchParams }: { searchParams: Promise<{ market?: string }> }) {
  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;
  let usDashboard: UsDashboard | null = null;

  const { market: marketParam } = await searchParams;
  const scope = marketFromSearchParams(marketParam);
  try {
    [dashboard, insights] = await Promise.all([
      api.getDashboard(),
      api.getInsights(),
    ]);
  } catch (e) {
    console.error("Failed to fetch home data:", e);
  }
  if (scope !== "cn") {
    try {
      usDashboard = await api.getUsDashboard();
    } catch (e) {
      console.error("Failed to fetch US home data:", e);
    }
  }

  const indexHistories: Record<string, number[]> = {};
  if (dashboard) {
    try {
      const indexCodes = dashboard.indices.map((idx) => idx.code).filter((c): c is string => Boolean(c));
      const settled = await Promise.allSettled(indexCodes.map((c) => api.getStockHistory(c)));
      dashboard.indices.forEach((idx, i) => {
        const result = settled[i];
        if (result.status === "fulfilled" && result.value.closes && result.value.closes.length >= 2) {
          if (idx.code) indexHistories[idx.code] = result.value.closes;
        }
      });
    } catch (e) {
      console.error("Failed to fetch index histories:", e);
    }
  }

  if (!dashboard) {
    return (
      <div className="neo-page">
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-8">
          <div className="neo-skeleton mb-6 h-8 w-48" />
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="neo-skeleton h-44" />
            <div className="neo-skeleton h-44" />
            <div className="neo-skeleton h-44" />
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  if (scope === "us" && usDashboard) {
    return (
      <div className="neo-page">
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
          <AutoRefresh />
          <UsDashboardSection dashboard={usDashboard} />
        </main>
        <Footer />
      </div>
    );
  }

  const idx0 = dashboard.indices[0];
  const otherIndices = dashboard.indices.slice(1, 3);
  const upCount = dashboard.limit_up_count;
  const downCount = dashboard.limit_down_count;
  const total = upCount + downCount;
  const upRatio = total > 0 ? (upCount / total) * 100 : 0;

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-5 sm:px-6 sm:py-6">
      <AutoRefresh />
        {/* 工作台头部 */}
        <section className="neo-fade-up relative min-h-[190px] overflow-hidden rounded-2xl sm:min-h-[230px]">
          <TechCanvasBackground className="pointer-events-none absolute inset-0 h-full w-full" />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--neo-bg)]/80 via-[var(--neo-bg)]/35 to-[var(--neo-bg)]/80" />
          <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-[var(--neo-bg)]/90 to-transparent" />
          <div className="relative flex min-h-[190px] flex-col justify-center px-5 py-4 sm:min-h-[230px] sm:px-6 sm:py-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-[20px] font-bold tracking-tight text-neo-ink">AI 复盘工作台</h1>
                  <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${marketPhaseLive(dashboard.market_phase) ? "neo-up-soft text-neo-up" : "neo-down-soft text-neo-down"}`}>
                    {marketPhaseText(dashboard.market_phase)}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-neo-mid">
                  {dashboard.index.date} · 更新于 {dashboard.market_updated_at}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <a href="/review/" className="neo-btn-primary px-3 py-1.5 text-[12px]">复盘报告</a>
                <a href="/search" className="neo-btn px-3 py-1.5 text-[12px]">个股诊断</a>
                <a href="/alerts" className="neo-btn px-3 py-1.5 text-[12px]">智能盯盘</a>
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
              <span className="neo-chip px-2 py-1 text-neo-mid">行情 {sourceLabel(idx0?.source)}</span>
              <span className="neo-chip px-2 py-1 text-neo-mid">资讯 东方财富 / 财联社</span>
              {insights && (
                <span className="neo-chip px-2 py-1 text-neo-mid">AI 生成 {insights.generated_at.slice(5, 16).replace("T", " ")}</span>
              )}
            </div>
          </div>
        </section>

        {/* 市场快照 */}
        <section className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4 neo-fade-up">
          {idx0 && (
            <div className="neo-card p-5 sm:col-span-2 lg:row-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-[15px] font-semibold text-neo-ink">{idx0.name}</span>
                  <span className="ml-2 text-[11px] text-neo-dim">{idx0.code}</span>
                </div>
                <span className={`rounded-full px-2.5 py-0.5 text-[12px] font-semibold ${idx0.change_pct > 0 ? "neo-up-soft text-neo-up" : "neo-down-soft text-neo-down"}`}>
                  {formatPct(idx0.change_pct)}
                </span>
              </div>
              <div className={`mt-4 text-[34px] font-bold tracking-tight ${neoTrendClass(idx0.change_pct)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {formatPrice(idx0.last)}
              </div>
              <div className={`mt-1 text-[14px] ${neoTrendClass(idx0.change_pct)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {formatChange(idx0.change)}
              </div>
              <Sparkline data={indexHistories[idx0.code || ""] || []} trend={idx0.change_pct} height={44} className="mt-4 w-full" />
              <div className="mt-3 text-[10px] text-neo-dim">来源 {sourceLabel(idx0.source)} · 30 日走势</div>
            </div>
          )}

          {otherIndices.map((idx) => (
            <div key={idx.code} className="neo-card-sm p-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-medium text-neo-mid">{idx.name}</span>
                <span className={`text-[12px] font-semibold ${neoTrendClass(idx.change_pct)}`}>{formatPct(idx.change_pct)}</span>
              </div>
              <div className={`mt-2 text-[22px] font-bold tracking-tight ${neoTrendClass(idx.change_pct)}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {formatPrice(idx.last)}
              </div>
              <Sparkline data={indexHistories[idx.code || ""] || []} trend={idx.change_pct} height={28} className="mt-2 w-full" />
            </div>
          ))}

          <HomeLimitCard
            upCount={upCount}
            downCount={downCount}
            upRatio={upRatio}
            updatedAt={dashboard.market_updated_at}
            limitUp={dashboard.limit_up}
            limitDown={dashboard.limit_down}
          />

          <NewsRadarCard />
        </section>

        {/* 情绪温度 + 涨停池 */}
        <section className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-5 neo-fade-up">
          <div className="neo-card p-5 lg:col-span-2">
            <MarketTemperaturePanel upCount={upCount} downCount={downCount} />
          </div>

          <div className="neo-card-sm overflow-hidden lg:col-span-3">
            <div className="flex items-center justify-between px-5 py-2.5">
              <h2 className="text-[14px] font-semibold text-neo-ink">涨停池 TOP 8</h2>
              <a href="/market/" className="text-[11px] text-neo-primary hover:underline">市场页 →</a>
            </div>
            <HomeLimitTopList stocks={dashboard.limit_up.slice(0, 8)} />
          </div>
        </section>

        {/* 强势行业 */}
        {dashboard.strong_industries && dashboard.strong_industries.length > 0 && (
          <section className="mt-4 neo-card p-5 neo-fade-up">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-[14px] font-semibold text-neo-ink">强势行业</h2>
              <span className="text-[10px] uppercase tracking-wider text-neo-dim">纯计算 · 无 AI 参与</span>
            </div>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {dashboard.strong_industries.slice(0, 6).map((ind, i) => (
                <div key={ind.name} className="flex items-center gap-3 rounded-lg px-2 py-1.5 transition-colors hover-neo-inset">
                  <span className="w-24 truncate text-[13px] font-medium text-neo-ink">{ind.name}</span>
                  <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--neo-surface-inset)]">
                    <div
                      className="bar-grow h-full rounded-full bg-neo-up transition-all duration-500"
                      style={{ width: `${Math.min(Math.abs(ind.change_pct) * 10, 100)}%`, animationDelay: `${Math.min(i * 70, 420)}ms` }}
                    />
                  </div>
                  <span style={{ fontFamily: "var(--font-inter), system-ui" }} className={`w-16 text-right text-[13px] font-semibold ${neoTrendClass(ind.change_pct)}`}>
                    {formatPct(ind.change_pct)}
                  </span>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* AI 复盘摘要 */}
        <section className="relative mt-4 neo-fade-up">
          <img loading="lazy"
            src="/images/ai-art/ai-neural-bg.png"
            alt=""
            aria-hidden
            className="pointer-events-none absolute inset-0 h-full w-full rounded-2xl object-cover opacity-5"
          />
          <div className="neo-ai relative p-5">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <span className="rounded-md bg-neo-primary-soft px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">AI 复盘摘要</span>
              <span className="text-[11px] text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>{insights?.generated_at || ""}</span>
            </div>
            <p className="text-[14px] leading-relaxed text-neo-mid">{insights?.focus || "等待 AI 复盘摘要生成…"}</p>

            {insights?.hot_sectors && insights.hot_sectors.length > 0 && (
              <div className="mt-4 flex flex-wrap gap-2">
                {insights.hot_sectors.map((s) => (
                  <a key={s.name} href="/market/" className={`neo-chip px-3 py-1 text-[12px] font-medium ${s.change_pct > 0 ? "text-neo-up" : "text-neo-down"}`}>
                    {s.name} <span className="ml-1" style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatPct(s.change_pct)}</span>
                  </a>
                ))}
              </div>
            )}

            {insights?.news && insights.news.length > 0 && (
              <div className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-3">
                {insights.news.slice(0, 3).map((n) => (
                  <a
                    key={n.id}
                    href={n.url || "#"}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="neo-card-sm block p-3 transition-all duration-200 hover:-translate-y-0.5"
                  >
                    <div className="flex items-center gap-2 text-[10px] text-neo-dim">
                      <span className="font-medium text-neo-primary">{n.source}</span>
                      <span>·</span>
                      <span>{n.time || ""}</span>
                    </div>
                    <h3 className="mt-1.5 line-clamp-2 text-[13px] font-medium leading-snug text-neo-ink">{n.title}</h3>
                  </a>
                ))}
              </div>
            )}

            <div className="mt-4 flex flex-wrap gap-2 text-[10px]">
              <span className="neo-chip px-2 py-1 text-neo-mid">引用：三大指数</span>
              <span className="neo-chip px-2 py-1 text-neo-mid">引用：涨跌停</span>
              <span className="neo-chip px-2 py-1 text-neo-mid">引用：行业板块</span>
              <span className="neo-chip px-2 py-1 text-neo-mid">引用：市场资讯</span>
              <span className="neo-chip px-2 py-1 text-neo-mid">由 AI 生成，不构成投资建议</span>
            </div>
          </div>
        </section>

        <section className="mt-4 neo-fade-up">
          <AIReview />
        </section>

        {/* 工作台入口 */}
        <section className="mt-4 grid grid-cols-2 gap-3 lg:grid-cols-4 neo-fade-up">
          {[
            { href: "/review/", img: "/images/ai-art/ai-review-illustration-dark.png", title: "每日复盘", desc: "AI 自动生成市场复盘报告" },
            { href: "/search", img: "/images/ai-art/ai-diagnosis-illustration-dark.png", title: "个股诊断", desc: "输入代码，AI 秒出诊断报告" },
            { href: "/alerts", img: "/images/ai-art/ai-alert-illustration-dark.png", title: "智能盯盘", desc: "价格、涨跌幅、成交量多条件组合" },
            { href: "/market/", img: "/images/ai-art/ai-quick-check-illustration-dark.png", title: "市场全景", desc: "板块、涨跌停、资金与资讯" },
          ].map((item) => (
            <a key={item.href} href={item.href} className="group neo-card-sm overflow-hidden transition-all duration-200 hover:-translate-y-0.5">
              <img loading="lazy" src={item.img} alt="" aria-hidden className="h-20 w-full object-cover opacity-90" />
              <div className="p-3">
                <div className="text-[13px] font-semibold text-neo-ink">{item.title}</div>
                <p className="mt-0.5 line-clamp-2 text-[11px] leading-relaxed text-neo-dim">{item.desc}</p>
              </div>
            </a>
          ))}
        </section>

        {scope === "all" && usDashboard && (
          <UsDashboardSection dashboard={usDashboard} />
        )}

        <section className="mt-4 neo-fade-up">
          <div className="neo-card p-5">
            <h2 className="text-[14px] font-semibold text-neo-ink">数据与能力</h2>
            <p className="mt-2 text-[12px] leading-relaxed text-neo-mid">
              数据更新说明：A 股行情在交易时段实时更新，历史 K 线默认提供 120 日窗口；美股报价与 K 线来自 Finnhub、EODHD 免费接口，
              非交易时段展示最近收盘价。每日复盘由 AI 在收盘后自动生成，并结合指数、涨跌停、行业与市场新闻形成摘要。
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-neo-mid">
              使用场景：研究台支持自选、盘前计划、公司档案、投资论点和 AI 评分；盯盘任务每 30 秒轮询一次，价格、涨跌幅和成交量条件可组合使用，
              触发后通过浏览器通知提醒并记录历史。美股研究台覆盖报价、K 线、新闻、财报盈利、自选、持仓与交易流水，帮助用户在同一页面完成跟踪。
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-neo-mid">
              项目以 MIT 许可证开源，代码托管在 GitHub，接口说明见 API 文档。网站当前处于免费测试期，功能与数据源会持续调整，
              商用前将补充数据授权与来源说明。所有行情、AI 内容与提醒均仅供参考，不构成投资建议。
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-neo-mid">
              爱看盘覆盖 A 股沪深京三地市场与美股主流交易标的，提供实时行情、AI 复盘摘要、个股诊断、智能盯盘和研究台。
              行情与资讯来自东方财富、新浪财经、Finnhub、EODHD 等公开数据接口；AI 内容由大语言模型生成，仅作研究参考。
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-neo-mid">
              网站目前处于免费测试期：A 股支持指数、涨跌停池、行业板块、资金流向、AI 复盘与批量评分；美股支持真实报价、K 线、
              新闻、AI 解读、自选、持仓、交易流水、盯盘提醒、财报盈利数据与研究台。用户可通过自然语言创建盯盘任务，
              满足价格、涨跌幅或成交量条件后自动触发浏览器通知并记录历史。
            </p>
            <div className="mt-4">
              <div className="text-[12px] font-semibold text-neo-ink">使用方式</div>
              <ol className="mt-2 list-decimal space-y-1 pl-5 text-[12px] text-neo-mid">
                <li>在首页或搜索页输入 A 股代码、美股代码或公司名称，查看实时行情与 AI 诊断。</li>
                <li>在盯盘页用自然语言创建条件任务，如「苹果跌到180提醒我」，系统会自动解析并持续轮询。</li>
                <li>在研究台维护自选、盘前计划、公司档案与投资论点，并用 AI 评分和关注要点辅助复盘。</li>
              </ol>
            </div>
            <div className="mt-4">
              <div className="text-[12px] font-semibold text-neo-ink">覆盖范围</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-neo-mid">
                <li>A 股：三大指数、涨跌停池、行业板块、资金流向、AI 复盘、批量评分。</li>
                <li>美股：真实报价、K 线、新闻、AI 解读、财报盈利、自选、持仓与交易流水。</li>
                <li>通用：自然语言盯盘、研究台、API 文档、浏览器与短信通知。</li>
              </ul>
            </div>
            <div className="mt-4">
              <div className="text-[12px] font-semibold text-neo-ink">常见问题</div>
            <div className="mt-4">
              <div className="text-[12px] font-semibold text-neo-ink">功能矩阵</div>
              <div className="mt-2 overflow-x-auto">
                <table className="neo-input w-full min-w-[560px] text-left text-[12px]">
                  <thead>
                    <tr className="text-neo-dim"><th className="px-3 py-2">能力</th><th className="px-3 py-2">A 股</th><th className="px-3 py-2">美股</th></tr>
                  </thead>
                  <tbody className="text-neo-mid">
                    <tr><td className="px-3 py-2">实时行情</td><td className="px-3 py-2">指数、涨跌停、行业板块</td><td className="px-3 py-2">个股与 ETF 报价</td></tr>
                    <tr><td className="px-3 py-2">AI 分析</td><td className="px-3 py-2">复盘、诊断、批量评分</td><td className="px-3 py-2">解读、盈利、研究台</td></tr>
                    <tr><td className="px-3 py-2">盯盘提醒</td><td className="px-3 py-2">价格、涨跌幅、成交量</td><td className="px-3 py-2">价格、涨跌幅、成交量</td></tr>
                    <tr><td className="px-3 py-2">持仓管理</td><td className="px-3 py-2">人民币计价</td><td className="px-3 py-2">美元计价并折算人民币</td></tr>
                    <tr><td className="px-3 py-2">数据来源</td><td className="px-3 py-2">东方财富、新浪财经</td><td className="px-3 py-2">Finnhub、EODHD</td></tr>
                  </tbody>
                </table>
              </div>
            </div>
            <p className="mt-4 text-[12px] leading-relaxed text-neo-mid">
              分析口径：A 股复盘以沪深京三大指数、涨跌停数量和强势行业为基础，结合资金流向与市场新闻生成中文摘要；美股复盘以标普 500、纳指 100、道琼斯 ETF 为锚，覆盖热门个股、财报盈利与公司新闻。
            </p>
            <p className="mt-2 text-[12px] leading-relaxed text-neo-mid">
              AI 评分采用 0-10 分制，输出状态与风险提示，仅作为研究参考。盯盘任务支持价格、涨跌幅和成交量条件，满足条件后触发浏览器通知并保留触发历史；研究台允许用户沉淀自选、计划、档案与论点，形成个人复盘闭环。
            </p>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-[12px] text-neo-mid">
                <li><b>爱看盘是什么？</b> 开源投资决策辅助工具，覆盖 A 股与美股。</li>
                <li><b>数据来源是什么？</b> 东方财富、新浪财经、Finnhub、EODHD 等公开接口。</li>
                <li><b>是否收费？</b> 当前免费测试期，后续增值服务会提前公示。</li>
                <li><b>美股支持哪些功能？</b> 行情、K 线、新闻、AI、盯盘、持仓、财报与研究台。</li>
                <li><b>盯盘提醒如何工作？</b> 后端轮询行情，条件满足后触发通知并记录历史。</li>
              </ul>
            </div>
            <p className="mt-4 text-[11px] text-neo-dim">
              维护：<a rel="author" href="/about/" className="text-neo-primary hover:underline">爱看盘团队</a>
            </p>
            <div className="mt-3 flex flex-wrap gap-2 text-[11px]">
              <a href="https://github.com/qq136692547-cmyk/aikanpan-web" target="_blank" rel="noopener noreferrer" className="neo-chip px-2.5 py-1 text-neo-primary">GitHub 开源仓库</a>
              <a href="/api-docs/" className="neo-chip px-2.5 py-1 text-neo-primary">API 文档</a>
              <a href="/about/" className="neo-chip px-2.5 py-1 text-neo-primary">关于与数据来源</a>
            </div>
          </div>
        </section>
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "Article",
            headline: "爱看盘使用指南：A 股与美股 AI 复盘、诊断与盯盘",
            author: { "@type": "Person", name: "爱看盘团队", url: "https://aikanpan.top/about/" },
            datePublished: "2026-08-10",
            dateModified: "2026-08-10",
            publisher: { "@type": "Organization", name: "爱看盘", url: "https://aikanpan.top" },
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: [
              { "@type": "Question", name: "爱看盘是什么？", acceptedAnswer: { "@type": "Answer", text: "开源投资决策辅助工具，覆盖 A 股与美股。" } },
              { "@type": "Question", name: "数据来源是什么？", acceptedAnswer: { "@type": "Answer", text: "东方财富、新浪财经、Finnhub、EODHD 等公开接口。" } },
              { "@type": "Question", name: "是否收费？", acceptedAnswer: { "@type": "Answer", text: "当前免费测试期，后续增值服务会提前公示。" } },
              { "@type": "Question", name: "美股支持哪些功能？", acceptedAnswer: { "@type": "Answer", text: "行情、K 线、新闻、AI、盯盘、持仓、财报与研究台。" } },
              { "@type": "Question", name: "盯盘提醒如何工作？", acceptedAnswer: { "@type": "Answer", text: "后端轮询行情，条件满足后触发通知并记录历史。" } },
            ],
          }),
        }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            name: "如何使用爱看盘",
            step: [
              { "@type": "HowToStep", position: 1, name: "搜索股票", text: "输入 A 股代码、美股代码或公司名称，查看行情与 AI 诊断。" },
              { "@type": "HowToStep", position: 2, name: "创建盯盘", text: "用自然语言创建条件任务，系统自动解析并持续轮询。" },
              { "@type": "HowToStep", position: 3, name: "研究复盘", text: "在研究台维护自选、计划、档案与论点，并使用 AI 评分。" },
            ],
          }),
        }}
      />
    </div>
  );
}
