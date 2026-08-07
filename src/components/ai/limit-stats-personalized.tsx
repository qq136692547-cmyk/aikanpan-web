"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { Star } from "lucide-react";
import { api, type LimitStock } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { normalizeStockCode } from "@/lib/format";
import { Sparkline } from "@/components/chart/sparkline";

export function LimitStatsPersonalized({
  upStocks,
  downStocks,
  upCount,
  downCount,
  sparkData = [],
}: {
  upStocks: LimitStock[];
  downStocks: LimitStock[];
  upCount: number;
  downCount: number;
  sparkData?: number[];
}) {
  const { isAuthenticated } = useAuth();
  const { data: watchData } = useSWR(
    isAuthenticated ? "limit-stats-watchlist" : null,
    () => api.getWatchlist(),
    { refreshInterval: 30000 }
  );
  const { data: positionsData } = useSWR(
    isAuthenticated ? "limit-stats-positions" : null,
    () => api.getPositions(),
    { refreshInterval: 30000 }
  );

  const watchCodes = useMemo(
    () => new Set((watchData?.watchlist || []).map((w) => normalizeStockCode(w.code))),
    [watchData]
  );
  const holdingCodes = useMemo(
    () => new Set((positionsData?.positions || []).map((p) => normalizeStockCode(p.code))),
    [positionsData]
  );

  const myUp = useMemo(
    () =>
      upStocks.filter((s) => {
        const n = normalizeStockCode(s.code);
        return watchCodes.has(n) || holdingCodes.has(n);
      }),
    [upStocks, watchCodes, holdingCodes]
  );
  const myDown = useMemo(
    () =>
      downStocks.filter((s) => {
        const n = normalizeStockCode(s.code);
        return watchCodes.has(n) || holdingCodes.has(n);
      }),
    [downStocks, watchCodes, holdingCodes]
  );

  const total = upCount + downCount;
  const upRatio = total > 0 ? (upCount / total) * 100 : 0;
  const myTotal = myUp.length + myDown.length;
  const myUpRatio = myTotal > 0 ? (myUp.length / myTotal) * 100 : 0;
  const myMine = [...myUp, ...myDown].slice(0, 6);

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      <div className="neo-inset relative overflow-hidden px-4 py-3">
        {sparkData.length >= 2 && (
          <Sparkline
            data={sparkData}
            trend={1}
            height={36}
            className="pointer-events-none absolute inset-y-0 right-0 w-28 opacity-25"
          />
        )}
        <div className="relative">
          <div className="text-[10px] uppercase tracking-wider text-neo-dim">涨停</div>
          <div className="mt-1 text-[28px] font-bold leading-none text-neo-up" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
            {upCount}
          </div>
          <div className="mt-1 text-[10px] text-neo-dim">{upRatio.toFixed(0)}%</div>
        </div>
      </div>

      <div className="neo-inset relative overflow-hidden px-4 py-3">
        {sparkData.length >= 2 && (
          <Sparkline
            data={sparkData}
            trend={-1}
            height={36}
            className="pointer-events-none absolute inset-y-0 right-0 w-28 opacity-25"
          />
        )}
        <div className="relative">
          <div className="text-[10px] uppercase tracking-wider text-neo-dim">跌停</div>
          <div className="mt-1 text-[28px] font-bold leading-none text-neo-down" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
            {downCount}
          </div>
          <div className="mt-1 text-[10px] text-neo-dim">{(100 - upRatio).toFixed(0)}%</div>
        </div>
      </div>

      <div className="neo-inset relative overflow-hidden px-4 py-3 sm:col-span-2">
        {sparkData.length >= 2 && (
          <Sparkline
            data={sparkData}
            trend={1}
            height={26}
            className="pointer-events-none absolute inset-y-0 right-0 w-36 opacity-15"
          />
        )}
        <div className="relative">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-neo-dim">涨跌分布</span>
            <span className="text-[11px] text-neo-mid" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
              {upCount > 0 && downCount > 0 ? (upCount / downCount).toFixed(2) : "-"}
            </span>
          </div>
          <div className="mt-2.5 flex h-1.5 overflow-hidden rounded-full bg-[var(--neo-surface-active)]">
            <div className="bg-[var(--neo-up)] transition-all duration-500" style={{ width: `${upRatio}%` }} />
            <div className="bg-[var(--neo-down)] transition-all duration-500" style={{ width: `${100 - upRatio}%` }} />
          </div>
          <div className="mt-1.5 flex justify-between text-[10px]" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
            <span className="text-neo-up">{upCount}</span>
            <span className="text-neo-down">{downCount}</span>
          </div>

          <div className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="flex items-center gap-1 text-[10px] font-medium text-neo-primary">
              <Star className="h-3 w-3" />
              我的关注
            </span>
            <span className="text-[10px] text-neo-up">涨停 {myUp.length}</span>
            <span className="text-[10px] text-neo-down">跌停 {myDown.length}</span>
            {myTotal > 0 && (
              <span className="text-[10px] text-neo-dim">关注涨停占比 {myUpRatio.toFixed(0)}%</span>
            )}
          </div>

          {myMine.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {myMine.map((s) => (
                <a
                  key={s.code}
                  href={`/stock/${s.code.replace(/\./, "")}/`}
                  className="neo-chip px-2 py-1 text-[10px] text-neo-ink transition-colors hover:text-neo-primary"
                >
                  {s.name}
                </a>
              ))}
            </div>
          )}
          {isAuthenticated && myTotal === 0 && (
            <div className="mt-2 text-[10px] text-neo-dim">暂无自选/持仓涨跌停</div>
          )}
        </div>
      </div>
    </div>
  );
}
