import { MarketPageFrame, MarketPageHeader, MarketPageSection } from "@/components/market/market-page-shell";
import { LimitAnalysisCard } from "@/components/ai/limit-analysis-card";
import { AIReview } from "@/components/ai/ai-review";
import { AIHistoryPanel } from "@/components/ai/ai-history-panel";
import { DatePicker } from "@/components/review/date-picker";
import { ReviewStatusBar } from "@/components/review/review-status-bar";
import { DailyWorkflow } from "@/components/workflow/daily-workflow";
import { DailyLoopCard } from "@/components/workflow/daily-loop-card";
import { MarketEarningsCalendar } from "@/components/market/market-earnings-calendar";
import { UsDashboardSection } from "@/components/us/us-dashboard-section";
import { HkDashboardSection } from "@/components/hk/hk-dashboard-section";
import { api, type Dashboard, type HkDashboard, type Insights, type UsDashboard } from "@/lib/api";
import { formatPct, formatPrice } from "@/lib/format";
import { marketFromSearchParams } from "@/lib/market";
import { marketPhaseText, marketPhaseLive } from "@/lib/market-status";
import { getRecentReviewDates } from "@/lib/review-seo";
import { redirect } from "next/navigation";
import type { Metadata } from "next";

export const revalidate = 60;

function todayLocal(): string {
  return new Date().toLocaleDateString("sv");
}

export const metadata: Metadata = {
  title: "每日复盘",
  description: "AI驱动的每日复盘报告，支持A股、港股与美股市场数据。",
  alternates: { canonical: "/review/" },
};

const reviewJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "每日复盘 · 爱看盘",
  description: "AI驱动的每日复盘报告",
  author: { "@type": "Organization", name: "爱看盘" },
  publisher: { "@type": "Organization", name: "爱看盘", url: "https://aikanpan.top" },
  about: ["A股", "港股", "美股", "AI复盘", "股票市场", "行情分析"],
};

/** Neomorphism trend class mapping */
function neoTrendClass(n: number): string {
  if (n > 0) return "text-neo-up";
  if (n < 0) return "text-neo-down";
  return "text-neo-mid";
}

function neoTrendBgClass(n: number): string {
  if (n > 0) return "neo-up-soft";
  if (n < 0) return "neo-down-soft";
  return "neo-inset";
}

export default async function ReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string; market?: string }>;
}) {
  const params = await searchParams;
  const selectedDate = params?.date;
  const scope = marketFromSearchParams(params?.market);
  if (scope === "all") {
    const nextParams = new URLSearchParams({ market: "cn" });
    if (selectedDate) nextParams.set("date", selectedDate);
    redirect(`/review/?${nextParams.toString()}`);
  }
  const isCustomDate = selectedDate && selectedDate !== todayLocal();

  if (scope === "us") {
    let usDashboard: UsDashboard | null = null;
    try {
      usDashboard = await api.getUsDashboard();
    } catch (e) {
      console.error("Failed to fetch US review data:", e);
    }

    const usTemp = usDashboard?.temperature;
    const usFocus = (usDashboard?.sectors ?? []).slice(0, 3).map((s) => s.name ?? s.code);
    const usRisk = usTemp?.vix_change != null ? `VIX ${usTemp.vix_change > 0 ? "+" : ""}${usTemp.vix_change.toFixed(1)}%` : undefined;
    const usConclusion = usTemp ? `市场温度 ${usTemp.score}（${usTemp.label}）` : undefined;

    return (
      <MarketPageFrame market="us">
        <MarketPageHeader
          market="us"
          title="每日复盘"
          image="/images/ai-art/review-decoration-v3.png"
        />
        <DailyWorkflow className="mt-3" market="us" />
        <DailyLoopCard
          market="us"
          conclusion={usConclusion}
          focus={usFocus}
          risk={usRisk}
        />
        {usDashboard ? (
          <UsDashboardSection dashboard={usDashboard} showReview />
        ) : (
          <div className="neo-skeleton mt-3 h-32" />
        )}
        <section className="mt-3">
          <AIHistoryPanel kind="us_daily_review" title="美股复盘历史" />
        </section>
      </MarketPageFrame>
    );
  }

  if (scope === "hk") {
    let hkDashboard: HkDashboard | null = null;
    try {
      hkDashboard = await api.getHkDashboard();
    } catch (e) {
      console.error("Failed to fetch HK review data:", e);
    }

    const hkIndex = hkDashboard?.indices?.[0];
    const hkConclusion = hkIndex ? `恒生指数 ${hkIndex.last}（${hkIndex.change_pct > 0 ? "+" : ""}${hkIndex.change_pct.toFixed(2)}%）` : undefined;
    const hkFocus = (hkDashboard?.top_gainers ?? []).slice(0, 3).map((s) => s.name ?? s.code);
    const hkRisk = hkDashboard?.top_losers?.[0]
      ? `领跌 ${hkDashboard.top_losers[0].name}（${hkDashboard.top_losers[0].change_pct.toFixed(2)}%）`
      : undefined;

    return (
      <MarketPageFrame market="hk">
        <MarketPageHeader
          market="hk"
          title="每日复盘"
          image="/images/ai-art/review-decoration-v3.png"
        />
        <DailyWorkflow className="mt-3" market="hk" />
        <DailyLoopCard
          market="hk"
          conclusion={hkConclusion}
          focus={hkFocus}
          risk={hkRisk}
        />
        {hkDashboard ? (
          <HkDashboardSection dashboard={hkDashboard} showReview />
        ) : (
          <div className="neo-skeleton mt-3 h-32" />
        )}
        <section className="mt-3">
          <AIHistoryPanel kind="hk_daily_review" title="港股复盘历史" />
        </section>
      </MarketPageFrame>
    );
  }

  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;
  let aiAvailable = true;

  try {
    const dailyReview = await api.getDailyReview(selectedDate);
    dashboard = dailyReview?.dashboard ?? null;
    aiAvailable = dailyReview?.ai_available !== false;
    if (!isCustomDate) {
      insights = await api.getInsights();
    }
  } catch (e) {
    console.error("Failed to fetch review data:", e);
  }

  if (!dashboard) {
    if (isCustomDate) {
      return (
        <MarketPageFrame>
          <section className="neo-card p-6">
            <div className="text-sm font-medium text-neo-ink">{selectedDate} 暂无历史复盘</div>
            <p className="mt-1 text-xs text-neo-mid">该日期没有已归档的复盘数据。</p>
          </section>
        </MarketPageFrame>
      );
    }
    return (
      <MarketPageFrame>
        <div className="neo-skeleton mb-4 h-6 w-40" />
        <div className="neo-skeleton h-32" />
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="neo-skeleton h-20" />
          <div className="neo-skeleton h-20" />
          <div className="neo-skeleton h-20" />
          <div className="neo-skeleton h-20" />
        </div>
      </MarketPageFrame>
    );
  }

  const upCount = dashboard.limit_up_count;
  const downCount = dashboard.limit_down_count;
  const upRatio = upCount + downCount > 0 ? (upCount / (upCount + downCount) * 100).toFixed(1) : "0";
  const sentiment = upCount > downCount * 2 ? "多头主导"
    : upCount > downCount ? "偏多"
    : downCount > upCount * 2 ? "空头主导"
    : downCount > upCount ? "偏空"
    : "多空均衡";

  const cnFocus = (insights?.hot_sectors ?? []).slice(0, 3).map((item) => item.name);
  const cnRisk = sentiment.includes("空") ? "市场情绪偏空，注意控制回撤。" : undefined;

  return (
    <MarketPageFrame
      market={scope}
      scripts={
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd) }}
        />
      }
    >
      <MarketPageHeader
        market={scope}
        title="每日复盘"
        subtitle={`${dashboard.index.date} · ${dashboard.market_updated_at}`}
        image="/images/ai-art/review-decoration-v3.png"
        meta={
          <>
            <DatePicker initialDate={selectedDate} />
            <span className={`px-2 py-0.5 text-[11px] ${marketPhaseLive(dashboard.market_phase) ? "neo-up-soft text-neo-up" : "neo-inset text-neo-dim"}`}>
              {marketPhaseText(dashboard.market_phase)}
            </span>
          </>
        }
      />

      <section className="mt-3">
        <ReviewStatusBar />
      </section>
      <DailyWorkflow className="mt-3" market="cn" />
      <DailyLoopCard
        market="cn"
        conclusion={insights?.focus}
        focus={cnFocus}
        risk={cnRisk}
      />

      {/* 日期提示 */}
      {isCustomDate && (
        <section className="mt-3">
          <div className="neo-inset px-3 py-2 text-[12px] text-neo-mid">
            {selectedDate} 历史复盘
          </div>
        </section>
      )}

      {/* AI 涨停题材归因与短线情绪 */}
      <section className="mt-3">
        <LimitAnalysisCard date={selectedDate} />
      </section>

      {/* AI 复盘报告 */}
      <section className="mt-3">
        <AIReview date={selectedDate} available={aiAvailable} />
      </section>

      <section className="mt-3">
        <AIHistoryPanel kind="daily_review" title="A股复盘历史" />
      </section>

      <section className="mt-3">
        <h2 className="mb-2 text-[15px] font-semibold text-neo-ink">按日期查看复盘</h2>
        <div className="flex flex-wrap gap-2">
          {getRecentReviewDates(10).map((date) => (
            <a key={date} href={`/review/${date}/`} className="neo-chip px-3 py-2 text-[11px] text-neo-mid">
              {date}
            </a>
          ))}
        </div>
      </section>

      {/* 市场概览 Bento Grid */}
      <section 
        className="mt-4 relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#101216] p-4 sm:p-5 transition-all duration-300"
        style={{
          boxShadow: "-6px -6px 16px rgba(255, 255, 255, 0.045), 8px 8px 20px rgba(0, 0, 0, 0.65)"
        }}
      >
        <h2 className="mb-3.5 text-[14px] font-semibold text-[#EDEFF3] flex items-center justify-between">
          <span>市场情绪与多空全景</span>
          <span className="text-[11px] font-normal text-[#9AA3B2]">A股全市场截面</span>
        </h2>
        <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
          <div 
            className="flex flex-col justify-between rounded-[10px] border border-white/[0.05] bg-[#0C0E11] p-3"
            style={{ boxShadow: "inset 3px 3px 7px rgba(0, 0, 0, 0.65), inset -2px -2px 5px rgba(255, 255, 255, 0.045)" }}
          >
            <div className="text-[11px] text-[#9AA3B2]">涨停连板</div>
            <div className="mt-1.5 text-2xl font-bold text-[#FF5C61]" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{upCount}</div>
            <div className="mt-0.5 text-[10px] text-[#7C8595]">占比 {upRatio}%</div>
          </div>
          <div 
            className="flex flex-col justify-between rounded-[10px] border border-white/[0.05] bg-[#0C0E11] p-3"
            style={{ boxShadow: "inset 3px 3px 7px rgba(0, 0, 0, 0.65), inset -2px -2px 5px rgba(255, 255, 255, 0.045)" }}
          >
            <div className="text-[11px] text-[#9AA3B2]">跌停封板</div>
            <div className="mt-1.5 text-2xl font-bold text-[#46D993]" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{downCount}</div>
            <div className="mt-0.5 text-[10px] text-[#7C8595]">占比 {(100 - parseFloat(upRatio)).toFixed(1)}%</div>
          </div>
          <div 
            className="flex flex-col justify-between rounded-[10px] border border-white/[0.05] bg-[#0C0E11] p-3"
            style={{ boxShadow: "inset 3px 3px 7px rgba(0, 0, 0, 0.65), inset -2px -2px 5px rgba(255, 255, 255, 0.045)" }}
          >
            <div className="text-[11px] text-[#9AA3B2]">多空博弈比</div>
            <div className="mt-1.5 text-2xl font-bold text-[#EDEFF3]" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
              {upCount > 0 && downCount > 0 ? (upCount / downCount).toFixed(2) : "-"}
            </div>
            <div className="mt-0.5 text-[10px] text-[#A7B6FA]">{upCount > downCount ? "多头主导" : "空头避险"}</div>
          </div>
          <div 
            className="flex flex-col justify-between rounded-[10px] border border-white/[0.05] bg-[#0C0E11] p-3"
            style={{ boxShadow: "inset 3px 3px 7px rgba(0, 0, 0, 0.65), inset -2px -2px 5px rgba(255, 255, 255, 0.045)" }}
          >
            <div className="text-[11px] text-[#9AA3B2]">综合市场情绪</div>
            <div className="mt-1.5 text-xl font-bold text-[#F5A623]">{sentiment}</div>
            <div className="mt-0.5 text-[10px] text-[#7C8595]">量化模型评级</div>
          </div>
        </div>
      </section>

      {/* 指数表现 Bento Grid */}
      <section 
        className="mt-4 relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#101216] p-4 sm:p-5 transition-all duration-300"
        style={{
          boxShadow: "-6px -6px 16px rgba(255, 255, 255, 0.045), 8px 8px 20px rgba(0, 0, 0, 0.65)"
        }}
      >
        <h2 className="mb-3.5 text-[14px] font-semibold text-[#EDEFF3] flex items-center justify-between">
          <span>核心大盘指数表现</span>
          <span className="text-[11px] font-normal text-[#9AA3B2]">实时行情与点位</span>
        </h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {dashboard.indices.map((idx) => {
            const isUp = idx.change_pct >= 0;
            const tColor = isUp ? "text-[#FF5C61]" : "text-[#46D993]";
            const bgBadge = isUp ? "bg-red-500/10 border-red-500/20 text-[#FF5C61]" : "bg-emerald-500/10 border-emerald-500/20 text-[#46D993]";
            return (
              <div 
                key={idx.code} 
                className="group relative flex flex-col justify-between rounded-[12px] border border-white/[0.05] bg-[#0C0E11] p-3.5 transition-all duration-200 hover:border-white/[0.12] hover:bg-[#14171D]"
                style={{
                  boxShadow: "inset 3px 3px 7px rgba(0, 0, 0, 0.65), inset -2px -2px 5px rgba(255, 255, 255, 0.045)"
                }}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[13px] font-semibold text-[#EDEFF3] group-hover:text-white transition-colors">{idx.name}</span>
                  <span className={`rounded-full border px-2 py-0.5 text-[11px] font-semibold ${bgBadge}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                    {formatPct(idx.change_pct)}
                  </span>
                </div>
                <div className={`mt-2 text-2xl font-bold tracking-tight ${tColor}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                  {formatPrice(idx.last)}
                </div>
                <div className="mt-1 flex items-center justify-between text-[11px] text-[#7C8595]">
                  <span>涨跌点位</span>
                  <span className={`font-mono font-medium ${tColor}`}>{idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* 强势行业 */}
      <section className="mt-4">
        <h2 className="mb-2 text-[15px] font-semibold text-neo-ink">强势行业</h2>
        <div className="neo-card p-4">
          <div className="grid grid-cols-1 gap-1 sm:grid-cols-2 lg:grid-cols-3">
            {dashboard.strong_industries.map((ind, i) => {
              const t = neoTrendClass(ind.change_pct);
              return (
                <div key={ind.name} className="transition-colors hover-neo-inset flex items-center gap-2 px-1 py-1.5">
                  <span className="w-5 text-[11px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{i + 1}</span>
                  <span className="flex-1 truncate text-[13px] text-neo-ink">{ind.name}</span>
                  <span className={`text-[13px] ${t}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPct(ind.change_pct)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      <MarketPageSection title="近期财报">
        <MarketEarningsCalendar market="cn" />
      </MarketPageSection>
      {/* 资讯 */}
      {insights && insights.news.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-[15px] font-semibold text-neo-ink">资讯 ({insights.news.length})</h2>
          <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
            {insights.news.map((n) => (
              <a
                key={n.id}
                href={n.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover-neo-inset group flex flex-col neo-card-sm p-3"
              >
                <div className="flex items-center gap-2 text-[10px]">
                  <span className="text-neo-mid">{n.source}</span>
                  <span className="text-neo-dim">·</span>
                  <span className="text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{(n.time || "").slice(5, 16)}</span>
                </div>
                <h4 className="mt-1.5 line-clamp-2 text-[13px] font-medium text-neo-ink">{n.title}</h4>
                <p className="mt-1 line-clamp-2 text-[12px] leading-relaxed text-neo-mid">{n.summary}</p>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 研报 */}
      {insights && insights.reports && insights.reports.length > 0 && (
        <section className="mt-4">
          <h2 className="mb-2 text-[15px] font-semibold text-neo-ink">研报 ({insights.reports.length})</h2>
          <div className="space-y-1">
            {insights.reports.map((r) => (
              <a
                key={r.id}
                href={r.url || "#"}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover-neo-inset group flex items-start gap-3 neo-card-sm p-3"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-[10px]">
                    <span className="text-neo-mid">{r.source}</span>
                    <span className="text-neo-dim">·</span>
                    <span className="text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{(r.publish_at || r.time || "").slice(0, 10)}</span>
                  </div>
                  <h4 className="mt-1 text-[13px] font-medium text-neo-ink">{r.title}</h4>
                  {r.summary && <p className="mt-0.5 line-clamp-2 text-[12px] text-neo-mid">{r.summary}</p>}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 涨跌停 */}
      <section className="mt-4 grid grid-cols-1 gap-2 lg:grid-cols-2">
        <div className="overflow-hidden neo-card-sm">
          <div className="flex items-center justify-between neo-inset px-3 py-2">
            <h3 className="text-[12px] font-medium text-neo-ink">涨停板</h3>
            <span className="text-[11px] text-neo-up" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{dashboard.limit_up.length} 只</span>
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {dashboard.limit_up.map((s) => (
              <a key={s.code} href={`/stock/${s.code.replace(/\./, "")}/`} className="transition-colors hover-neo-inset flex items-center gap-2 neo-inset px-3 py-1.5 last:border-b-0">
                <div className="flex flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium text-neo-ink">{s.name}</span>
                  <span className="text-[10px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{s.code}</span>
                </div>
                <span className="text-right text-[13px] text-neo-up" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{s.price.toFixed(2)}</span>
                <span className="w-20 text-right text-[13px] text-neo-up" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPct(s.pct)}</span>
              </a>
            ))}
          </div>
        </div>
        <div className="overflow-hidden neo-card-sm">
          <div className="flex items-center justify-between neo-inset px-3 py-2">
            <h3 className="text-[12px] font-medium text-neo-ink">跌停板</h3>
            <span className="text-[11px] text-neo-down" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{dashboard.limit_down.length} 只</span>
          </div>
          <div className="max-h-96 overflow-y-auto scrollbar-thin">
            {dashboard.limit_down.map((s) => (
              <a key={s.code} href={`/stock/${s.code.replace(/\./, "")}/`} className="transition-colors hover-neo-inset flex items-center gap-2 neo-inset px-3 py-1.5 last:border-b-0">
                <div className="flex flex-1 flex-col">
                  <span className="truncate text-[13px] font-medium text-neo-ink">{s.name}</span>
                  <span className="text-[10px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{s.code}</span>
                </div>
                <span className="text-right text-[13px] text-neo-down" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{s.price.toFixed(2)}</span>
                <span className="w-20 text-right text-[13px] text-neo-down" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPct(s.pct)}</span>
              </a>
            ))}
          </div>
        </div>
      </section>
    </MarketPageFrame>
  );
}
