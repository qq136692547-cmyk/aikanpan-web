"use client";

import { useCallback, useEffect, useState } from "react";
import { Radio, RefreshCw } from "lucide-react";
import { api, type NewsRadar } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";

export function NewsRadarCard() {
  const { isAuthenticated } = useAuth();
  const [data, setData] = useState<NewsRadar | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const d = await api.getNewsRadar();
      setData(d);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) return;
    // This effect starts the remote radar request on mount.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load, isAuthenticated]);

  return (
    <div className="neo-card-sm flex h-full flex-col p-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[13px] font-semibold text-neo-ink">
          <Radio size={14} style={{ color: "var(--neo-primary)" }} />
          AI 舆情雷达
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="neo-chip flex shrink-0 items-center gap-1 px-2 py-1 text-[10px] text-neo-mid disabled:opacity-60"
          aria-label="刷新舆情雷达"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          刷新
        </button>
      </div>
      <div className="mt-1 text-[10px] text-neo-dim">
        {data ? `基于 ${data.news_count} 条资讯` : "聚合今日市场资讯"}
      </div>

      {loading && !data && (
        <div className="mt-3 space-y-2">
          <div className="neo-skeleton h-3 w-full" />
          <div className="neo-skeleton h-3 w-4/5" />
          <div className="neo-skeleton h-3 w-3/5" />
        </div>
      )}

      {data && (
        <div className="neo-inset mt-3 flex-1 rounded-lg px-3 py-2.5">
          <p className="whitespace-pre-wrap text-[11px] leading-relaxed text-neo-mid">{data.radar}</p>
        </div>
      )}

      {error && !data && (
        <p className="mt-3 text-[10px] text-neo-down">舆情雷达生成失败，点击重试</p>
      )}

      {data && (
        <div className="mt-2 text-[10px] text-neo-dim">
          {data.cached ? "缓存" : "实时生成"} · {data.model} · {data.generated_at.slice(5, 16).replace("T", " ")}
        </div>
      )}
      <AiDisclaimer className="mt-2" />
    </div>
  );
}
