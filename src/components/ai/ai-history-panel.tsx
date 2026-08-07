"use client";

import { useCallback, useEffect, useState } from "react";
import { ChevronDown, ChevronUp, Trash2 } from "lucide-react";
import { api, type AIHistoryItem } from "@/lib/api";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

export function AIHistoryPanel({ code }: { code: string }) {
  const [history, setHistory] = useState<AIHistoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getAIHistory(code);
      setHistory(data.history);
    } catch {
      setHistory([]);
    } finally {
      setLoading(false);
    }
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

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

  return (
    <div className="neo-card p-5">
      <div className="flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-neo-ink">AI 诊断历史</h3>
        <span className="text-[11px] text-neo-dim">{history.length} 条</span>
      </div>
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
            return (
              <div key={h.id} className="py-2.5">
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => setExpandedId(open ? null : h.id)}
                    aria-expanded={open}
                    className="flex min-w-0 flex-1 items-center gap-2 text-left"
                  >
                    <span className="truncate text-[13px] font-medium text-neo-ink">{h.name}</span>
                    <span className="shrink-0 text-[10px] text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                      {h.generated_at.slice(0, 16).replace("T", " ")}
                    </span>
                    <span className="shrink-0 text-[10px] text-neo-dim">{h.model}</span>
                    {open ? <ChevronUp size={14} className="shrink-0 text-neo-dim" /> : <ChevronDown size={14} className="shrink-0 text-neo-dim" />}
                  </button>
                  <button
                    onClick={() => remove(h.id)}
                    disabled={deleting === h.id}
                    aria-label={`删除 ${h.name} 的历史诊断`}
                    className="shrink-0 rounded-md p-1 text-neo-dim transition-colors hover:text-neo-down disabled:opacity-40"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
                {open && (
                  <div className="ai-markdown mt-2 rounded-md bg-[var(--neo-surface-inset)] px-3 py-2.5 text-[12px] leading-relaxed text-neo-mid">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{h.content}</ReactMarkdown>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
