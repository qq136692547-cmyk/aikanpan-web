import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { AIReview } from "@/components/ai/ai-review";
import { DatePicker } from "@/components/review/date-picker";
import { ReviewStatusBar } from "@/components/review/review-status-bar";
import { api, type Dashboard, type Insights } from "@/lib/api";
import { formatPct, formatPrice } from "@/lib/format";
import { marketPhaseText, marketPhaseLive } from "@/lib/market-status";
import type { Metadata } from "next";

export const revalidate = 60;

function todayLocal(): string {
  return new Date().toLocaleDateString("sv");
}

export const metadata: Metadata = {
  title: "每日复盘",
  description: "AI驱动的A股每日复盘报告，包含市场概览、强势行业、资讯新闻和研报精选。",
};

const reviewJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "每日复盘 · 爱看盘",
  description: "AI驱动的A股每日复盘报告",
  author: { "@type": "Organization", name: "爱看盘" },
  publisher: { "@type": "Organization", name: "爱看盘", url: "https://aikanpan.top" },
  about: ["A股", "AI复盘", "股票市场", "行情分析"],
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
  searchParams: Promise<{ date?: string }>;
}) {
  const params = await searchParams;
  const selectedDate = params?.date;
  const isCustomDate = selectedDate && selectedDate !== todayLocal();

  let dashboard: Dashboard | null = null;
  let insights: Insights | null = null;

  try {
    const dailyReview = await api.getDailyReview(selectedDate);
    dashboard = dailyReview?.dashboard ?? null;
    if (!isCustomDate) {
      insights = await api.getInsights();
    }
  } catch (e) {
    console.error("Failed to fetch review data:", e);
  }

  if (!dashboard) {
    if (isCustomDate) {
      return (
        <div className="neo-page">
          <Navbar />
          <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6">
            <section className="neo-card p-6">
              <div className="text-sm font-medium text-neo-ink">{selectedDate} 暂无历史复盘</div>
              <p className="mt-1 text-xs text-neo-mid">该日期没有已归档的复盘数据。</p>
            </section>
          </main>
          <Footer />
        </div>
      );
    }
    return (
      <div className="neo-page">
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-4 sm:px-6">
          <div className="neo-skeleton mb-4 h-6 w-40" />
          <div className="neo-skeleton h-32" />
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="neo-skeleton h-20" />
            <div className="neo-skeleton h-20" />
            <div className="neo-skeleton h-20" />
            <div className="neo-skeleton h-20" />
          </div>
        </main>
        <Footer />
      </div>
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

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-4 py-3 sm:px-6 sm:py-4">
        {/* Header */}
        <section>
          <div className="relative overflow-hidden rounded-2xl">
            <img loading="lazy"
              src="/images/ai-art/review-decoration-v2.png"
              alt=""
              aria-hidden
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-20"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[var(--neo-bg)]/70 via-[var(--neo-bg)]/50 to-[var(--neo-bg)]/70" />
            <div className="relative flex items-center justify-between">
            <div>
              <h1 className="text-[14px] font-medium text-neo-ink">每日复盘</h1>
              <p className="mt-0.5 text-[11px] text-neo-dim">{dashboard.index.date} · {dashboard.market_updated_at}</p>
            </div>
            <div className="flex items-center gap-3">
              <DatePicker initialDate={selectedDate} />
              <span className={`px-2 py-0.5 text-[11px] ${marketPhaseLive(dashboard.market_phase) ? "neo-up-soft text-neo-up" : "neo-inset text-neo-dim"}`}>
                {marketPhaseText(dashboard.market_phase)}
              </span>
            </div>
          </div>
          </div>
        </section>

        <section className="mt-3">
          <ReviewStatusBar />
        </section>

        {/* 日期提示 */}
        {isCustomDate && (
          <section className="mt-3">
            <div className="neo-inset px-3 py-2 text-[12px] text-neo-mid">
              {selectedDate} 历史复盘
            </div>
          </section>
        )}

        {/* AI 复盘报告 */}
        <section className="mt-3">
          <AIReview date={selectedDate} />
        </section>

        {/* 市场概览 */}
        <section className="mt-4">
          <h2 className="mb-2 text-[12px] text-neo-mid">市场概览</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <div className="neo-card-sm p-3">
              <div className="text-[11px] text-neo-mid">涨停</div>
              <div className="mt-1.5 text-xl font-semibold text-neo-up" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{upCount}</div>
              <div className="mt-0.5 text-[10px] text-neo-dim">占比 {upRatio}%</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[11px] text-neo-mid">跌停</div>
              <div className="mt-1.5 text-xl font-semibold text-neo-down" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{downCount}</div>
              <div className="mt-0.5 text-[10px] text-neo-dim">占比 {(100 - parseFloat(upRatio)).toFixed(1)}%</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[11px] text-neo-mid">涨跌比</div>
              <div className="mt-1.5 text-xl font-semibold text-neo-ink" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                {upCount > 0 && downCount > 0 ? (upCount / downCount).toFixed(2) : "-"}
              </div>
              <div className="mt-0.5 text-[10px] text-neo-dim">{upCount > downCount ? "多头占优" : "空头占优"}</div>
            </div>
            <div className="neo-card-sm p-3">
              <div className="text-[11px] text-neo-mid">市场情绪</div>
              <div className="mt-1.5 text-xl font-semibold text-neo-ink">{sentiment}</div>
            </div>
          </div>
        </section>

        {/* 指数表现 */}
        <section className="mt-4">
          <h2 className="mb-2 text-[12px] text-neo-mid">指数表现</h2>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {dashboard.indices.map((idx) => {
              const t = neoTrendClass(idx.change_pct);
              const bgT = neoTrendBgClass(idx.change_pct);
              return (
                <div key={idx.code} className="neo-card-sm p-3">
                  <div className="flex items-center justify-between">
                    <span className="text-[13px] text-neo-mid">{idx.name}</span>
                    <span className={`px-1.5 py-0.5 text-[11px] ${bgT} ${t}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPct(idx.change_pct)}</span>
                  </div>
                  <div className={`mt-1.5 text-xl font-semibold ${t}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{formatPrice(idx.last)}</div>
                  <div className={`mt-0.5 text-[12px] ${t}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{idx.change >= 0 ? "+" : ""}{idx.change.toFixed(2)}</div>
                </div>
              );
            })}
          </div>
        </section>

        {/* 强势行业 */}
        <section className="mt-4">
          <h2 className="mb-2 text-[12px] text-neo-mid">强势行业</h2>
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

        {/* 资讯 */}
        {insights && insights.news.length > 0 && (
          <section className="mt-4">
            <h2 className="mb-2 text-[12px] text-neo-mid">资讯 ({insights.news.length})</h2>
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
            <h2 className="mb-2 text-[12px] text-neo-mid">研报 ({insights.reports.length})</h2>
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
      </main>
      <Footer />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(reviewJsonLd) }}
      />
    </div>
  );
}
