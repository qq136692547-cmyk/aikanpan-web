"use client";

import { useCallback, useEffect, useState } from "react";
import { Bot, RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { api, type AIReview } from "@/lib/api";

export function UsDailyReview() {
  const [data, setData] = useState<AIReview | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const d = await api.getUsDailyReview();
      setData(d);
    } catch {
      // degraded
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <section className="neo-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 text-[14px] font-semibold text-neo-ink">
          <Bot size={15} style={{ color: "var(--neo-primary)" }} />
          美股每日复盘
        </div>
        <button
          onClick={load}
          disabled={loading}
          className="neo-chip flex shrink-0 items-center gap-1 px-2 py-1 text-[10px] text-neo-mid disabled:opacity-60"
        >
          <RefreshCw size={11} className={loading ? "animate-spin" : ""} />
          刷新
        </button>
      </div>

      {loading && !data && (
        <div className="mt-3 space-y-2">
          <div className="neo-skeleton h-3 w-full rounded" />
          <div className="neo-skeleton h-3 w-5/6 rounded" />
          <div className="neo-skeleton h-3 w-3/4 rounded" />
        </div>
      )}

      {data && (
        <div className="neo-inset mt-3 rounded-lg px-3 py-3">
          <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-neo-ink">
            <ReactMarkdown>{data.content}</ReactMarkdown>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-neo-dim">
            <span>{data.cached ? "缓存" : "实时生成"}</span>
            <span>{data.model}</span>
            <span>{data.generated_at.slice(5, 16).replace("T", " ")}</span>
          </div>
        </div>
      )}

      {!data && !loading && (
        <p className="mt-3 text-[10px] text-neo-down">美股复盘暂不可用，请稍后重试</p>
      )}
    </section>
  );
}
