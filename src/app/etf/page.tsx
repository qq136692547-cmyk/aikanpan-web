import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { api, type Dashboard } from "@/lib/api";
import { formatPct, trendClass } from "@/lib/format";
import type { Metadata } from "next";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "ETF 行情",
  description: "ETF基金实时行情数据，即将上线。",
};

export default async function EtfPage() {
  let dashboard: Dashboard | null = null;
  try {
    dashboard = await api.getDashboard();
  } catch {}

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        <section className="neo-fade-up">
          <h1 className="text-xl font-bold text-neo-ink">ETF 行情</h1>
          <p className="mt-1 text-sm text-neo-mid">交易型开放式指数基金</p>
        </section>

        <section className="neo-fade-up mt-8" style={{ animationDelay: "60ms" }}>
          <div className="neo-card flex flex-col items-center justify-center px-6 py-16 text-center">
            <div className="neo-inset flex h-14 w-14 items-center justify-center rounded-full">
              <svg className="h-7 w-7 text-neo-dim" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <h2 className="mt-4 text-base font-semibold text-neo-ink">即将上线</h2>
            <p className="mt-2 max-w-md text-sm text-neo-mid">
              ETF 行情页面正在开发中，将提供主流 ETF 的实时净值、折溢价率、跟踪误差和资金流向数据。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["沪深300ETF", "中证500ETF", "创业板ETF", "科创50ETF", "半导体ETF", "新能源ETF"].map((name) => (
                <span key={name} className="neo-card-sm rounded-md px-2.5 py-1 text-xs text-neo-dim">{name}</span>
              ))}
            </div>
          </div>
        </section>

        {dashboard && (
          <section className="neo-fade-up mt-6" style={{ animationDelay: "120ms" }}>
            <h2 className="mb-3 text-sm font-semibold text-neo-mid">市场参考</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {dashboard.indices.map((idx) => (
                <a key={idx.code} href="/market/" className="neo-card-sm p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-neo-mid">{idx.name}</span>
                    <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`text-sm font-medium ${trendClass(idx.change_pct) === "text-up" ? "text-neo-up" : trendClass(idx.change_pct) === "text-down" ? "text-neo-down" : "text-neo-mid"}`}>{formatPct(idx.change_pct)}</span>
                  </div>
                  <div style={{ fontFamily: 'var(--font-inter), system-ui' }} className={`mt-2 text-2xl font-bold ${trendClass(idx.change_pct) === "text-up" ? "text-neo-up" : trendClass(idx.change_pct) === "text-down" ? "text-neo-down" : "text-neo-ink"}`}>{idx.last.toFixed(2)}</div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </div>
  );
}
