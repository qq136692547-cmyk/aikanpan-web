"use client";

import { useState, useCallback } from "react";
import { api, type AIScoreItem } from "@/lib/api";
import { AIScoreBadge, AIScoreBadgeSkeleton, AIScoreBadgeEmpty } from "./ai-score-badge";

type ScoreMap = Record<string, AIScoreItem>;

export function AIScorePanel({ codes }: { codes: string[] }) {
  const [scores, setScores] = useState<ScoreMap>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleBatchScore = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const result = await api.getAIScoreBatch(codes);
      const map: ScoreMap = {};
      for (const item of result.items) {
        map[item.code] = item;
      }
      setScores(map);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "评分请求失败");
    } finally {
      setLoading(false);
    }
  }, [codes]);

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleBatchScore}
        disabled={loading}
        className="neo-btn-primary rounded-md px-3 py-1 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-50 disabled:cursor-not-allowed"
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
      {/* invisible spacer to maintain layout */}
      <span className="invisible">.</span>
    </div>
  );
}

/** 渲染单个股票的评分徽章（在列表行内使用） */
export function ScoreCell({ code, scores, loading }: { code: string; scores: ScoreMap; loading: boolean }) {
  if (loading && !scores[code]) {
    return <AIScoreBadgeSkeleton />;
  }
  if (scores[code]) {
    return <AIScoreBadge item={scores[code]} />;
  }
  return <AIScoreBadgeEmpty />;
}
