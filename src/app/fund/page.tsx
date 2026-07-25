import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { api, type Dashboard } from "@/lib/api";
import { formatPct, trendClass } from "@/lib/format";

export const revalidate = 60;

export default async function FundPage() {
  let dashboard: Dashboard | null = null;
  try {
    dashboard = await api.getDashboard();
  } catch {}

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        <section className="animate-fade-up">
          <h1 className="text-xl font-bold text-[var(--text-primary)]">基金</h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">公募基金行情与筛选</p>
        </section>

        <section className="mt-8 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--border-default)] bg-[var(--bg-surface)] px-6 py-16 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--bg-elevated)]">
              <svg className="h-7 w-7 text-[var(--text-tertiary)]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V14.25m1.5 0v-.375c0-.621.504-1.125 1.125-1.125H18.75" />
              </svg>
            </div>
            <h2 className="mt-4 text-base font-semibold text-[var(--text-primary)]">即将上线</h2>
            <p className="mt-2 max-w-md text-sm text-[var(--text-secondary)]">
              基金页面正在开发中，将提供基金净值查询、业绩排名、持仓分析和基金经理档案。
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-2">
              {["股票型", "混合型", "债券型", "指数型", "QDII", "货币型"].map((name) => (
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
