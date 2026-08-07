"use client";

import { useState, useCallback, useMemo } from "react";
import useSWR from "swr";
import { List, Star } from "lucide-react";
import { api, type AIScoreItem, type LimitStock } from "@/lib/api";
import { LimitStockList } from "@/components/market";
import { useAuth } from "@/lib/auth";
import { normalizeStockCode } from "@/lib/format";

/** Limit board with AI scoring plus watchlist/holdings personalization. */
export function LimitListWithScore({
  upStocks,
  downStocks,
}: {
  upStocks: LimitStock[];
  downStocks: LimitStock[];
}) {
  const [scores, setScores] = useState<Record<string, AIScoreItem>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [mode, setMode] = useState<"all" | "mine">("all");

  const { isAuthenticated } = useAuth();
  const { data: watchData } = useSWR(
    isAuthenticated ? "dashboard-limit-watchlist" : null,
    () => api.getWatchlist(),
    { refreshInterval: 30000 }
  );
  const { data: positionsData } = useSWR(
    isAuthenticated ? "dashboard-limit-positions" : null,
    () => api.getPositions(),
    { refreshInterval: 30000 }
  );

  const watchCodes = useMemo(
    () => {
      const items = watchData?.watchlist || [];
      return new Set(items.map((w) => normalizeStockCode(w.code)));
    },
    [watchData]
  );
  const holdingCodes = useMemo(
    () => new Set((positionsData?.positions || []).map((p) => normalizeStockCode(p.code))),
    [positionsData]
  );
  const mineCodes = useMemo(
    () => new Set([...watchCodes, ...holdingCodes]),
    [watchCodes, holdingCodes]
  );

  const isMine = useCallback(
    (code: string) => mineCodes.has(normalizeStockCode(code)),
    [mineCodes]
  );

  const badges = useMemo(() => {
    const map: Record<string, string[]> = {};
    for (const s of [...upStocks, ...downStocks]) {
      const n = normalizeStockCode(s.code);
      const tags: string[] = [];
      if (holdingCodes.has(n)) tags.push("持仓");
      if (watchCodes.has(n)) tags.push("自选");
      if (tags.length > 0) map[n] = tags;
    }
    return map;
  }, [upStocks, downStocks, watchCodes, holdingCodes]);

  const arrange = useCallback(
    (stocks: LimitStock[]) => {
      if (mode === "mine") return stocks.filter((s) => isMine(s.code));
      return [...stocks].sort((a, b) => Number(isMine(b.code)) - Number(isMine(a.code)));
    },
    [mode, isMine]
  );

  const upList = useMemo(() => arrange(upStocks), [arrange, upStocks]);
  const downList = useMemo(() => arrange(downStocks), [arrange, downStocks]);
  const upMineCount = useMemo(
    () => upStocks.filter((s) => isMine(s.code)).length,
    [upStocks, isMine]
  );
  const downMineCount = useMemo(
    () => downStocks.filter((s) => isMine(s.code)).length,
    [downStocks, isMine]
  );

  const allCodes = useMemo(
    () => [...upStocks, ...downStocks].map((s) => s.code),
    [upStocks, downStocks]
  );

  const handleBatchScore = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getAIScoreBatch(allCodes);
      const map: Record<string, AIScoreItem> = {};
      for (const item of result.items) {
        map[item.code] = item;
      }
      setScores(map);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "评分请求失败");
    } finally {
      setLoading(false);
    }
  }, [allCodes]);

  const segmentClass = (active: boolean) =>
    `flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium transition-colors ${
      active ? "bg-[var(--neo-surface)] text-neo-ink shadow-sm" : "text-neo-dim hover:text-neo-ink"
    }`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="neo-inset flex items-center gap-1 rounded-md p-1">
          <button type="button" onClick={() => setMode("all")} className={segmentClass(mode === "all")}>
            <List className="h-3.5 w-3.5" />
            全部
          </button>
          <button type="button" onClick={() => setMode("mine")} className={segmentClass(mode === "mine")}>
            <Star className="h-3.5 w-3.5" />
            我的关注
          </button>
        </div>
        {mineCodes.size > 0 && (
          <span className="text-[12px] text-neo-dim">
            关注涨停 {upMineCount} · 跌停 {downMineCount}
          </span>
        )}
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={handleBatchScore}
            disabled={loading || allCodes.length === 0}
            className="neo-btn-primary rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {loading ? (
              <span className="flex items-center gap-1.5">
                <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" />
                AI 评分中...
              </span>
            ) : (
              "一键 AI 评分"
            )}
          </button>
          {error && <span className="text-xs text-neo-down">{error}</span>}
          {Object.keys(scores).length > 0 && !loading && (
            <span className="text-xs text-neo-dim">已评分 {Object.keys(scores).length} 只</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LimitStockList
          title="涨停板"
          stocks={upList.slice(0, 10)}
          type="up"
          delay={120}
          scores={scores}
          scoreLoading={loading}
          mineCodes={mineCodes}
          badges={badges}
          emptyText={mode === "mine" ? "暂无自选/持仓涨停" : undefined}
        />
        <LimitStockList
          title="跌停板"
          stocks={downList.slice(0, 10)}
          type="down"
          delay={180}
          scores={scores}
          scoreLoading={loading}
          mineCodes={mineCodes}
          badges={badges}
          emptyText={mode === "mine" ? "暂无自选/持仓跌停" : undefined}
        />
      </div>
    </div>
  );
}
