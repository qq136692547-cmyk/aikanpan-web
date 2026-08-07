"use client";

import { useState, useCallback, useMemo } from "react";
import { api, type AIScoreItem, type LimitStock } from "@/lib/api";
import { LimitStockList } from "@/components/market";

/** 带 AI 评分功能的涨停跌停板 */
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

  const allCodes = useMemo(() => {
    return [...upStocks, ...downStocks].map((s) => s.code);
  }, [upStocks, downStocks]);

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

  return (
    <div className="space-y-4">
      {/* 操作栏 */}
      <div className="flex items-center gap-3">
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
            "🤖 一键 AI 评分"
          )}
        </button>
        {error && <span className="text-xs text-neo-down">{error}</span>}
        {Object.keys(scores).length > 0 && !loading && (
          <span className="text-xs text-neo-dim">
            已评分 {Object.keys(scores).length} 只
          </span>
        )}
      </div>

      {/* 涨停板 + 跌停板 */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <LimitStockList
          title="涨停板"
          stocks={upStocks.slice(0, 10)}
          type="up"
          delay={120}
          scores={scores}
          scoreLoading={loading}
        />
        <LimitStockList
          title="跌停板"
          stocks={downStocks.slice(0, 10)}
          type="down"
          delay={180}
          scores={scores}
          scoreLoading={loading}
        />
      </div>
    </div>
  );
}
