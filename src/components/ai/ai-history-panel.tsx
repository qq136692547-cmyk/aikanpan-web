"use client";

import { useCallback, useEffect, useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, CircleAlert, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import { api, type AIHistoryItem, type AITask, type AITaskKind } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { AIEvidencePanel } from "./ai-evidence-panel";

const KIND_LABELS: Record<AITaskKind, string> = {
  stock_comment: "A股个股诊断",
  us_stock_ai: "美股个股诊断",
  hk_stock_ai: "港股个股诊断",
  daily_review: "A股每日复盘",
  us_daily_review: "美股每日复盘",
  hk_daily_review: "港股每日复盘",
  score_batch: "批量评分",
  portfolio_review: "组合诊断",
  plan_focus: "计划关注要点",
  news_radar: "舆情雷达",
};

export function AIHistoryPanel({
  code,
  kind,
  taskKind,
  title = "连续研究历史",
  limit = 50,
  onRecovered,
}: {
  code?: string;
  kind?: AITaskKind;
  taskKind?: AITaskKind;
  title?: string;
  limit?: number;
  onRecovered?: (result: unknown, task: AITask) => void;
}) {
  const [history, setHistory] = useState<AIHistoryItem[]>([]);
  const [tasks, setTasks] = useState<AITask[]>([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState<string | null>(null);
  const { isAuthenticated } = useAuth();
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isAuthenticated) {
      setHistory([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const data = await api.getAIHistory({ code, kind, limit });
      setHistory(data.history);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [code, kind, limit, isAuthenticated]);

  useEffect(() => {
    // This effect starts the remote history request when the stock code changes.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    load();
  }, [load]);

  const loadTasks = useCallback(async () => {
    if (!isAuthenticated) {
      setTasks([]);
      return;
    }
    const filter = taskKind ?? kind;
    try {
      const data = await api.getAITasks({ kind: filter, limit: 5 });
      setTasks(data.tasks);
    } catch {
      setTasks([]);
    }
  }, [kind, taskKind, isAuthenticated]);

  useEffect(() => {
    // Polls task checkpoints so a failed long-running generation can be retried.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadTasks();
    if (!isAuthenticated) return;
    const timer = setInterval(() => {
      loadTasks();
    }, 5000);
    return () => clearInterval(timer);
  }, [loadTasks, isAuthenticated]);

  async function remove(id: string) {
    setDeleting(id);
    try {
      await api.deleteAIHistory(id);
      setHistory((prev) => prev.filter((h) => h.id !== id));
    } catch {
      // ignore
    } finally {
      setDeleting(null);
    }
  }

  async function retry(task: AITask) {
    setRetrying(task.id);
    try {
      const result = await api.retryAITask<unknown>(task.id);
      await loadTasks();
      await load();
      onRecovered?.(result, task);
    } catch {
      await loadTasks();
    } finally {
      setRetrying(null);
    }
  }

  return (
    <div className="neo-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-neo-ink">{title}</h3>
        <div className="flex items-center gap-2">
          {tasks.some((task) => task.status === "running") && <RefreshCw size={12} className="animate-spin text-neo-primary" />}
          <span className="text-[11px] text-neo-dim">{history.length} 条</span>
        </div>
      </div>
      {tasks.length > 0 && (
        <div className="mt-3 space-y-2">
          {tasks.slice(0, 3).map((task) => (
            <div key={task.id} className="neo-inset rounded-md px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex min-w-0 items-center gap-1.5">
                  {task.status === "running" ? (
                    <RefreshCw size={11} className="shrink-0 animate-spin text-neo-primary" />
                  ) : task.status === "failed" ? (
                    <CircleAlert size={11} className="shrink-0 text-neo-down" />
                  ) : (
                    <CheckCircle2 size={11} className="shrink-0 text-neo-up" />
                  )}
                  <span className="truncate text-[11px] font-medium text-neo-mid">{task.title}</span>
                </div>
                {task.status === "failed" && (
                  <button
                    type="button"
                    onClick={() => retry(task)}
                    disabled={retrying === task.id}
                    title="重试任务"
                    aria-label={`重试 ${task.title}`}
                    className="inline-flex min-h-11 shrink-0 items-center gap-1 text-[10px] text-neo-primary disabled:opacity-50"
                  >
                    <RotateCcw size={10} className={retrying === task.id ? "animate-spin" : ""} />
                    重试
                  </button>
                )}
              </div>
              <div className="mt-1 flex items-center justify-between gap-2 text-[10px] text-neo-dim">
                <span className="truncate">
                  {task.status === "failed" ? task.error || "生成失败" : task.stage === "completed" ? "已完成" : `生成中 ${task.progress}%`}
                </span>
                <span className="shrink-0">{(task.updated_at || task.created_at || "").slice(5, 16).replace("T", " ")}</span>
              </div>
            </div>
          ))}
        </div>
      )}
      {loading ? (
        <div className="mt-3 space-y-2">
          <div className="neo-skeleton h-10 w-full rounded" />
          <div className="neo-skeleton h-10 w-4/5 rounded" />
        </div>
      ) : history.length === 0 ? (
        <p className="mt-3 text-[12px] text-neo-dim">暂无历史记录，生成 AI 诊断后自动保存</p>
      ) : (
        <div className="mt-3 divide-y divide-[var(--neo-edge)]">
          {history.map((h) => {
            const open = expandedId === h.id;
            const itemKind = h.kind && h.kind in KIND_LABELS ? (h.kind as AITaskKind) : undefined;
            const itemTitle = h.title || h.name || h.code || (itemKind ? KIND_LABELS[itemKind] : "AI 研究");
            return (
              <div key={h.id} className="py-2.5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedId(open ? null : h.id)}
                    aria-expanded={open}
                    className="flex min-h-11 min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="truncate text-[13px] font-medium text-neo-ink">{itemTitle}</span>
                    {itemKind && (
                      <span className="shrink-0 rounded bg-[var(--neo-surface-inset)] px-1.5 py-0.5 text-[9px] text-neo-dim">
                        {KIND_LABELS[itemKind]}
                      </span>
                    )}
                    <span className="hidden min-w-0 truncate text-[10px] text-neo-dim sm:inline" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                      {h.generated_at.slice(0, 16).replace("T", " ")}
                    </span>
                    <span className="hidden min-w-0 truncate text-[10px] text-neo-dim md:inline">{h.model}</span>
                    {open ? <ChevronUp size={14} className="shrink-0 text-neo-dim" /> : <ChevronDown size={14} className="shrink-0 text-neo-dim" />}
                  </button>
                  <button
                    onClick={() => remove(h.id)}
                    disabled={deleting === h.id}
                    aria-label={`删除 ${itemTitle} 的历史记录`}
                    className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-md text-neo-dim transition-colors hover:text-neo-down disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {open && (
                  <>
                    <div className="ai-markdown mt-2 rounded-md bg-[var(--neo-surface-inset)] px-3 py-2.5 text-[12px] leading-relaxed text-neo-mid">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{h.content}</ReactMarkdown>
                    </div>
                    <AIEvidencePanel evidence={h.evidence} />
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
