"use client";

import { useMemo } from "react";
import { Star } from "lucide-react";
import type { LimitStock } from "@/lib/api";
import { useLimitPersonalization } from "@/lib/use-limit-personal";

export function HomeLimitCard({
  upCount,
  downCount,
  upRatio,
  updatedAt,
  limitUp,
  limitDown,
}: {
  upCount: number;
  downCount: number;
  upRatio: number;
  updatedAt: string;
  limitUp: LimitStock[];
  limitDown: LimitStock[];
}) {
  const { isAuthenticated, isMine } = useLimitPersonalization();
  const myUp = useMemo(() => limitUp.filter((s) => isMine(s.code)).length, [limitUp, isMine]);
  const myDown = useMemo(() => limitDown.filter((s) => isMine(s.code)).length, [limitDown, isMine]);
  const myTotal = myUp + myDown;
  const myRatio = myTotal > 0 ? Math.round((myUp / myTotal) * 100) : 0;
  const myStocks = useMemo(
    () => [...limitUp, ...limitDown].filter((s) => isMine(s.code)).slice(0, 3),
    [limitUp, limitDown, isMine]
  );

  return (
    <div className="neo-card-sm relative overflow-hidden p-4">
      <div className="text-[10px] uppercase tracking-wider text-neo-dim">涨跌停</div>
      <div className="mt-2 flex items-baseline gap-3">
        <span className="text-[26px] font-bold leading-none text-neo-up" style={{ fontFamily: "var(--font-inter), system-ui" }}>
          {upCount}
        </span>
        <span className="text-[13px] text-neo-up">涨停</span>
        <span className="text-[26px] font-bold leading-none text-neo-down" style={{ fontFamily: "var(--font-inter), system-ui" }}>
          {downCount}
        </span>
        <span className="text-[13px] text-neo-down">跌停</span>
      </div>
      <div className="neo-inset-sm mt-3 h-1.5 overflow-hidden rounded-full">
        <div className="h-full rounded-full bg-neo-up transition-all duration-500" style={{ width: `${upRatio}%` }} />
      </div>
      <div className="mt-1.5 flex justify-between text-[10px] text-neo-dim">
        <span>涨停占比 {upRatio.toFixed(0)}%</span>
        <span>{updatedAt}</span>
      </div>

      {isAuthenticated && (
        <div className="mt-2.5 border-t border-[var(--neo-surface-active)] pt-2">
          <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 text-[10px]">
            <span className="flex items-center gap-1 font-medium text-neo-primary">
              <Star className="h-3 w-3" />
              我的关注
            </span>
            <span className="text-neo-up">涨停 {myUp}</span>
            <span className="text-neo-down">跌停 {myDown}</span>
            {myTotal > 0 && <span className="text-neo-dim">占比 {myRatio}%</span>}
          </div>
          {myStocks.length > 0 && (
            <div className="mt-1.5 flex flex-wrap gap-1.5">
              {myStocks.map((s) => (
                <a
                  key={s.code}
                  href={`/stock/${s.code.replace(/\./, "")}/`}
                  className="neo-chip px-2 py-0.5 text-[10px] text-neo-ink transition-colors hover:text-neo-primary"
                >
                  {s.name}
                </a>
              ))}
            </div>
          )}
          {myTotal === 0 && <div className="mt-1 text-[10px] text-neo-dim">暂无自选/持仓涨跌停</div>}
        </div>
      )}
    </div>
  );
}
