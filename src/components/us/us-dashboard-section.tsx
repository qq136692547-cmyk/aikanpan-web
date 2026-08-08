import { formatPct, formatPrice } from "@/lib/format";
import type { UsDashboard } from "@/lib/api";
import { UsDailyReview } from "./us-daily-review";
import { UsWatchlistButton } from "./us-watchlist-button";

export function UsDashboardSection({ dashboard }: { dashboard: UsDashboard }) {
  return (
    <div className="space-y-4">
      <section className="neo-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h2 className="text-[16px] font-bold text-neo-ink">美股市场</h2>
            <p className="mt-1 text-[11px] text-neo-dim">
              三大指数 ETF · USD · 汇率 {dashboard.usd_cny ?? 7.2}
            </p>
          </div>
          <span className="neo-chip px-2 py-1 text-[10px] text-neo-mid">
            {dashboard.generated_at}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {dashboard.indices.map((idx) => (
            <a key={idx.code} href={`/stock/${idx.code}/`} className="neo-card-sm p-4">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[13px] font-medium text-neo-ink">{idx.name}</span>
                <span className="text-[10px] text-neo-dim">{idx.code}</span>
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-[22px] font-bold text-neo-ink">{formatPrice(idx.last)}</span>
                <span
                  className={`text-[12px] font-semibold ${
                    idx.change_pct > 0 ? "text-neo-up" : idx.change_pct < 0 ? "text-neo-down" : "text-neo-mid"
                  }`}
                >
                  {formatPct(idx.change_pct)}
                </span>
              </div>
              <div className="mt-1 text-[10px] text-neo-dim">{idx.source}</div>
            </a>
          ))}
        </div>
      </section>

      <section className="neo-card p-5">
        <h2 className="text-[14px] font-semibold text-neo-ink">热门美股</h2>
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
          {dashboard.stocks.map((s) => (
            <div key={s.code} className="neo-card-sm p-3">
              <div className="flex items-center justify-between gap-2">
                <a href={`/stock/${s.code}/`} className="min-w-0">
                  <span className="block truncate text-[13px] font-medium text-neo-ink">{s.name}</span>
                  <span className="block text-[10px] text-neo-dim">{s.code}</span>
                </a>
                <UsWatchlistButton code={s.code} name={s.name} />
              </div>
              <div className="mt-2 flex items-baseline justify-between gap-2">
                <span className="text-[18px] font-bold text-neo-ink">{formatPrice(s.last)}</span>
                <span
                  className={`text-[12px] font-semibold ${
                    s.change_pct > 0 ? "text-neo-up" : s.change_pct < 0 ? "text-neo-down" : "text-neo-mid"
                  }`}
                >
                  {formatPct(s.change_pct)}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      <UsDailyReview />
    </div>
  );
}
