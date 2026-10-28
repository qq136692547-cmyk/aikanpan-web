"use client";

import { useState, useCallback } from "react";
import { Sunrise, RefreshCw, ChevronDown, ChevronUp, AlertCircle } from "lucide-react";
import { api, type PremarketBriefing } from "@/lib/api";

export function PremarketBriefingCard() {
  const [data, setData] = useState<PremarketBriefing | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  const fetchBriefing = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await api.getPremarketBriefing();
      setData(res);
      setExpanded(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "获取盘前早报失败");
    } finally {
      setLoading(false);
    }
  }, []);

  return (
    <div className="neo-card p-4 transition-all duration-200 border-l-4 border-l-neo-primary">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-neo-primary/10 text-neo-primary">
            <Sunrise className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-semibold text-neo-ink">AI 盘前早报 · 隔夜外盘与看盘线索</h2>
              <span className="rounded bg-neo-primary/10 px-1.5 py-0.5 text-[10px] font-medium text-neo-primary">开盘前必读</span>
            </div>
            {/* 副标题「基于隔夜美股三大指数…」已删：F8 加首访告知条必须先在别处省回等量高度，
                375×667 下这条副标题占 32px，正好抵掉告知条的 28px + margin。
                标题与「开盘前必读」标签仍在，版式语义不受影响。 */}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {!data && !loading && (
            <button
              onClick={fetchBriefing}
              className="neo-btn-primary flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium"
            >
              <Sunrise className="h-3.5 w-3.5" />
              生成早报
            </button>
          )}

          {data && (
            <>
              <button
                onClick={fetchBriefing}
                disabled={loading}
                title="重新生成早报"
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--neo-border)] text-neo-dim transition-colors hover:text-neo-ink disabled:opacity-50"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setExpanded(!expanded)}
                className="flex h-7 w-7 items-center justify-center rounded-md border border-[var(--neo-border)] text-neo-dim transition-colors hover:text-neo-ink"
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
          正在抓取昨夜欧美外盘、热门中概股与快讯并调用 DeepSeek 进行策略推演...
        </div>
      )}

      {error && (
        <div className="mt-3 flex items-center gap-2 rounded-md bg-neo-down/10 px-3 py-2 text-xs text-neo-down">
          <AlertCircle className="h-4 w-4 shrink-0" />
          <span>{error}</span>
          <button onClick={fetchBriefing} className="ml-auto underline">重试</button>
        </div>
      )}

      {data && expanded && (
        <div className="mt-4 border-t border-[var(--neo-border)] pt-3">
          <div className="prose prose-sm max-w-none text-xs leading-relaxed text-neo-ink space-y-2 whitespace-pre-wrap font-sans">
            {data.content}
          </div>
          <div className="mt-3 flex items-center justify-between border-t border-[var(--neo-border)] pt-2 text-[10px] text-neo-dim">
            <span>模型: {data.model || "DeepSeek-V4-Flash"} · {data.cached ? "命中缓存" : "实时生成"} · {data.generated_at?.slice(0, 16).replace("T", " ")}</span>
            <span>{data.disclaimer}</span>
          </div>
        </div>
      )}
    </div>
  );
}