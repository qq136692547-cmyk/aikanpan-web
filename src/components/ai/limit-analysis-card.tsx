"use client";

import { useState, useCallback } from "react";
import { Sparkles, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { api, type LimitAnalysis } from "@/lib/api";

export function LimitAnalysisCard({ date }: { date?: string }) {
  const [data, setData] = useState<LimitAnalysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  const fetchAnalysis = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getLimitAnalysis(date);
      setData(res);
      setExpanded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "获取涨停分析失败");
    } finally {
      setLoading(false);
    }
  }, [date]);

  return (
    <div className="neo-card p-4 transition-all duration-200">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-md bg-neo-primary/10 text-neo-primary">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-neo-ink">AI 涨停题材归因与短线情绪</h3>
            <p className="text-[11px] text-neo-dim">基于今日涨停板与领涨行业，提炼核心炒作主线与情绪周期</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!data && !loading && (
            <button
              onClick={fetchAnalysis}
              className="neo-btn-primary flex min-h-11 items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
            >
              <Sparkles className="h-3.5 w-3.5" />
              一键解读
            </button>
          )}

          {data && (
            <>
              <button
                onClick={fetchAnalysis}
                disabled={loading}
                title="重新解读"
                className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--neo-border)] text-neo-dim transition-colors hover:text-neo-ink disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex h-11 w-11 items-center justify-center rounded-md border border-[var(--neo-border)] text-neo-dim transition-colors hover:text-neo-ink"
              >
                {expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </button>
            </>
          )}
        </div>
      </div>

      {loading && !data && (
        <div className="mt-4 flex items-center justify-center gap-2 py-6 text-xs text-neo-dim">
          <RefreshCw className="h-4 w-4 animate-spin text-neo-primary" />
          正在聚合今日涨停梯队并调用 DeepSeek 深度归因...
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-neo-danger/10 px-3 py-2 text-xs text-neo-danger">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchAnalysis} className="ml-auto inline-flex min-h-11 items-center underline">重试</button>
        </div>
      )}

      {data && expanded && (
        <div className="mt-4 border-t border-[var(--neo-border)] pt-3">
          <div className="prose prose-sm max-w-none text-xs leading-relaxed text-neo-ink space-y-2 whitespace-pre-wrap font-sans">
            {data.content}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--neo-border)] pt-2 text-[10px] text-neo-dim">
            <span>模型: {data.model || "DeepSeek-V4-Flash"} · {data.cached ? "命中缓存" : "实时提炼"}</span>
            <span>{data.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}
