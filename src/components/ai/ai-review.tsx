"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type AIReview } from "@/lib/api";

function parseScoreAndStatus(content: string): { score: number | null; status: string | null } {
  const scoreMatch = content.match(/\*\*评分\*\*[:：]\s*(\d+)\s*\/\s*10/);
  const statusMatch = content.match(/\*\*状态\*\*[:：]\s*(.+)/);
  return {
    score: scoreMatch ? parseInt(scoreMatch[1], 10) : null,
    status: statusMatch ? statusMatch[1].trim() : null,
  };
}

function stripTrailingMeta(content: string): string {
  return content
    .replace(/\n*⚠\s*本内容由[\s\S]*$/m, "")
    .replace(/\n*\*\*评分\*\*[:：]\s*\d+\/10\s*/m, "")
    .replace(/\n*\*\*状态\*\*[:：]\s*.+$/m, "")
    .trim();
}

const scoreColor = (score: number) => {
  if (score >= 8) return { bg: "neo-up-soft", text: "text-neo-up" };
  if (score >= 5) return { bg: "bg-[var(--neo-amber-soft)]", text: "text-[var(--neo-amber)]" };
  return { bg: "neo-down-soft", text: "text-neo-down" };
};

type LoadState = "loading" | "done" | "error";

export function AIReview() {
  const [state, setState] = useState<LoadState>("loading");
  const [data, setData] = useState<AIReview | null>(null);
  const [error, setError] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchReview = useCallback(async () => {
    setState("loading");
    setError("");

    // 60 秒超时自动切换到 error
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setError("AI 服务响应超时，请重试");
      setState("error");
    }, 60_000);

    try {
      const result = await api.getAIReview();
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setData(result);
      setState("done");
    } catch (e: unknown) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setError(e instanceof Error ? e.message : "AI 复盘请求失败");
      setState("error");
    }
  }, []);

  useEffect(() => {
    fetchReview();
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [fetchReview]);

  if (state === "loading") {
    return (
      <div className="neo-ai scanline p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-neo-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">
            AI 复盘
          </span>
          <span className="text-[13px] text-neo-mid">生成中…</span>
          <span className="text-[11px] text-neo-dim">通常需要 10-30 秒</span>
          <span className="h-3 w-3 animate-spin rounded-full border-2 border-neo-primary border-t-transparent" />
        </div>
        <div className="mt-4 space-y-2">
          <div className="neo-skeleton h-3 w-full rounded" />
          <div className="neo-skeleton h-3 w-5/6 rounded" style={{ animationDelay: "100ms" }} />
          <div className="neo-skeleton h-3 w-3/4 rounded" style={{ animationDelay: "200ms" }} />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="neo-card-sm p-6">
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-neo-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">AI 复盘</span>
          <button onClick={fetchReview} className="rounded-md px-3 py-1 text-[12px] text-neo-mid transition-colors hover-neo-inset hover:text-neo-primary">重试</button>
        </div>
        <p className="mt-3 text-[13px] text-neo-down">{error}</p>
      </div>
    );
  }

  const { score, status } = parseScoreAndStatus(data!.content);
  const body = stripTrailingMeta(data!.content);
  const sc = score !== null ? scoreColor(score) : null;

  return (
    <div className="neo-ai p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-neo-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">
            AI 复盘
          </span>
          <span className="text-[11px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{data!.generated_at.slice(0, 16).replace("T", " ")}</span>
          {data!.cached && <span className="rounded bg-[var(--neo-surface-inset)] px-1.5 py-0.5 text-[10px] text-neo-dim">缓存</span>}
        </div>
        <button onClick={fetchReview} className="rounded-md px-3 py-1 text-[12px] text-neo-mid transition-colors hover-neo-inset hover:text-neo-primary">
          重新生成
        </button>
      </div>

      {(score !== null || status) && (
        <div className="mt-4 flex items-center gap-2">
          {score !== null && sc && (
            <div className={`flex items-baseline gap-1 rounded-md ${sc.bg} px-3 py-1.5`}>
              <span className={`text-[20px] font-bold ${sc.text}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{score}</span>
              <span className="text-[10px] text-neo-dim">/10</span>
            </div>
          )}
          {status && (
            <div className="neo-inset rounded-md px-3 py-1.5">
              <span className="text-[13px] font-medium text-neo-ink">{status}</span>
            </div>
          )}
        </div>
      )}

      <div className="ai-markdown mt-4 text-sm leading-relaxed text-neo-ink">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>

      <p className="mt-4 pt-3 text-[11px] text-neo-dim">
        ⚠ 本内容由 AI 生成，不构成投资建议
      </p>
    </div>
  );
}
