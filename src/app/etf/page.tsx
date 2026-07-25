import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { api, type Dashboard } from "@/lib/api";
import { formatPct, trendClass } from "@/lib/format";

export const revalidate = 60;

export default async function EtfPage() {
  let dashboard: Dashboard | null = null;
  try {
    dashboard = await api.getDashboard();
  } catch {}

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        <section className="animate-fade-up">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">ETF 行情</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">交易型开放式指数基金</p>
        </section>

        <section className="mt-8 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
              <svg className="h-7 w-7 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
              </svg>
            </div>
            <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">即将上线</h2>
            <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
              ETF 行情页面正在开发中，将提供主流 ETF 的实时净值、折溢价率、跟踪误差和资金流向数据。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["沪深300ETF", "中证500ETF", "创业板ETF", "科创50ETF", "半导体ETF", "新能源ETF"].map((name) => (
                <span key={name} className="rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-2.5 py-1 text-xs text-[var(--text-tertiary)]">{name}</span>
              ))}
            </div>
          </div>
        </section>

        {dashboard && (
          <section className="mt-6 animate-fade-up" style={{ animationDelay: "120ms" }}>
            <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)]">市场参考</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {dashboard.indices.map((idx) => (
                <a key={idx.code} href="/market/" className="card-hover rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{idx.name}</span>
                    <span className={`font-num text-sm font-medium ${trendClass(idx.change_pct)}`}>{formatPct(idx.change_pct)}</span>
                  </div>
                  <div className={`font-num mt-2 text-2xl font-bold ${trendClass(idx.change_pct)}`}>{idx.last.toFixed(2)}</div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}
