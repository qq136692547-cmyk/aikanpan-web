"use client";

import { useState } from "react";
import useSWR from "swr";
import { AlertTriangle, CheckCircle2, Clock, RefreshCw } from "lucide-react";
import { api, type ReviewStatus } from "@/lib/api";

export function ReviewStatusBar() {
  const { data, mutate } = useSWR<ReviewStatus>("review-status", () => api.getReviewStatus(), { refreshInterval: 60000 });
  const [refreshing, setRefreshing] = useState(false);

  async function refresh() {
    setRefreshing(true);
    try {
      await api.getAIReview();
      await mutate();
    } catch {
      await mutate();
    } finally {
      setRefreshing(false);
    }
  }

  return (
    <section className="neo-card p-4">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
        <div className="flex items-center gap-2">
          <Clock size={15} style={{ color: "var(--neo-primary)" }} />
          <span className="text-[11px] text-neo-dim">下次运行</span>
          <span className="text-[12px] font-medium text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>
            {data?.next_run ? data.next_run.replace("T", " ") : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <CheckCircle2 size={15} style={{ color: data?.last_success_at ? "var(--neo-up)" : "var(--neo-dim)" }} />
          <span className="text-[11px] text-neo-dim">最近成功</span>
          <span className="text-[12px] font-medium text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>
            {data?.last_success_at ? data.last_success_at.replace("T", " ") : "—"}
          </span>
        </div>
        <div className="flex items-center gap-2">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${data?.cached ? "neo-up-soft text-neo-up" : "bg-[var(--neo-surface-inset)] text-neo-dim"}`}>
            {data?.cached ? "缓存命中" : "未缓存"}
          </span>
        </div>
        {data?.last_error && (
          <div className="flex min-w-0 items-center gap-2">
            <AlertTriangle size={15} style={{ color: "var(--neo-down)" }} />
            <span className="truncate text-[11px] text-neo-down">{data.last_error}</span>
          </div>
        )}
        <button
          onClick={refresh}
          disabled={refreshing}
          className="neo-btn-primary ml-auto flex items-center gap-1.5 rounded-md px-3 py-1.5 text-[12px] font-medium disabled:opacity-60"
        >
          <RefreshCw size={13} className={refreshing ? "animate-spin" : ""} />
          {refreshing ? "刷新中…" : "立即刷新"}
        </button>
      </div>
    </section>
  );
}
