"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type AIComment } from "@/lib/api";

/** 从 content 末尾提取评分和状态 */
function parseScoreAndStatus(content: string): { score: number | null; status: string | null } {
  const scoreMatch = content.match(/\*\*评分\*\*[:：]\s*(\d+)\s*\/\s*10/);
  const statusMatch = content.match(/\*\*状态\*\*[:：]\s*(.+)/);
  return {
    score: scoreMatch ? parseInt(scoreMatch[1], 10) : null,
    status: statusMatch ? statusMatch[1].trim() : null,
  };
}

/** 从 content 中移除末尾的评分/状态行，单独展示 */
function stripTrailingMeta(content: string): string {
  return content
    .replace(/\n*⚠\s*本内容由[\s\S]*$/m, "")
    .replace(/\n*\*\*评分\*\*[:：]\s*\d+\/10\s*/m, "")
    .replace(/\n*\*\*状态\*\*[:：]\s*.+$/m, "")
    .trim();
}

const scoreColor = (score: number): { bg: string; text: string } => {
  if (score >= 8) return { bg: "neo-up-soft", text: "text-neo-up" };
  if (score >= 5) return { bg: "bg-[var(--neo-amber-soft)]", text: "text-[var(--neo-amber)]" };
  return { bg: "neo-down-soft", text: "text-neo-down" };
};

type LoadState = "idle" | "loading" | "done" | "error";

export function AIComment({ code }: { code: string }) {
  const [state, setState] = useState<LoadState>("idle");
  const [data, setData] = useState<AIComment | null>(null);
  const [error, setError] = useState<string>("");
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGenerate = useCallback(async () => {
    setState("loading");
    setError("");

    // 60 秒超时自动切换到 error
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setError("AI 服务响应超时，请重试");
      setState("error");
    }, 60_000);

    try {
      const result = await api.getAIComment(code);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setData(result);
      setState("done");
      api.saveAIHistory({ code, name: result.name, content: result.content, model: result.model, generated_at: result.generated_at }).catch(() => {});
    } catch (e: unknown) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setError(e instanceof Error ? e.message : "AI 分析请求失败");
      setState("error");
    }
  }, [code]);

  // cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, []);

  if (state === "idle") {
    return (
      <div className="neo-ai p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded bg-neo-primary-soft px-2 py-1 text-[11px] font-medium text-neo-primary">
              🤖 AI 诊断
            </span>
            <span className="text-xs text-neo-dim">深度分析资金面、技术面、估值面</span>
          </div>
          <button
            onClick={handleGenerate}
            className="neo-btn-primary rounded-md px-4 py-1.5 text-sm font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-px"
          >
            生成 AI 诊断
          </button>
        </div>

        {/* 示例提示 */}
        <div className="mt-3 pt-3" style={{ borderTop: "1px solid var(--neo-surface-inset)" }}>
          <p className="text-[11px] text-neo-dim">示例输出：</p>
          <ul className="mt-1 space-y-0.5 text-[11px] text-neo-dim">
            <li>• 资金面：主力资金流向分析</li>
            <li>• 技术面：MACD/KDJ/RSI 指标解读</li>
            <li>• 估值面：PE/PB 行业对比</li>
            <li>• 综合评分：AI 给出 1-10 分评级</li>
          </ul>
        </div>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="neo-ai p-5">
        <div className="flex items-center gap-2">
          <span className="rounded bg-neo-primary-soft px-2 py-1 text-[11px] font-medium text-neo-primary">
            🤖 AI 诊断
          </span>
          <span className="text-sm text-neo-mid">AI 正在分析中...</span>
          <span className="text-[11px] text-neo-dim">通常需要 10-30 秒</span>
          <span className="ml-1 h-3 w-3 animate-spin rounded-full border-2 border-neo-primary border-t-transparent" />
        </div>
        <div className="mt-4 space-y-3">
          <div className="neo-skeleton h-4 w-3/4 rounded" />
          <div className="neo-skeleton h-4 w-full rounded" style={{ animationDelay: "100ms" }} />
          <div className="neo-skeleton h-4 w-5/6 rounded" style={{ animationDelay: "200ms" }} />
          <div className="neo-skeleton h-4 w-2/3 rounded" style={{ animationDelay: "300ms" }} />
        </div>
      </div>
    );
  }

  if (state === "error") {
    return (
      <div className="neo-ai p-5">
        <div className="flex items-center justify-between">
          <span className="rounded bg-neo-primary-soft px-2 py-1 text-[11px] font-medium text-neo-primary">🤖 AI 诊断</span>
          <button
            onClick={handleGenerate}
            className="rounded-md px-3 py-1.5 text-sm text-neo-mid transition-colors hover-neo-inset hover:text-neo-primary"
          >
            重试
          </button>
        </div>
        <p className="mt-3 text-sm text-neo-down">{error}</p>
      </div>
    );
  }

  // done
  const { score, status } = parseScoreAndStatus(data!.content);
  const body = stripTrailingMeta(data!.content);
  const sc = score !== null ? scoreColor(score) : null;

  return (
    <div className="neo-ai p-5">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded bg-neo-primary-soft px-2 py-1 text-[11px] font-medium text-neo-primary">
            🤖 AI 诊断
          </span>
          <span className="text-[11px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
            {data!.generated_at.slice(0, 16).replace("T", " ")}
          </span>
          {data!.cached && (
            <span className="rounded bg-[var(--neo-surface-inset)] px-1.5 py-0.5 text-[10px] text-neo-dim">缓存</span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          className="rounded-md px-3 py-1.5 text-sm text-neo-mid transition-colors hover-neo-inset hover:text-neo-primary"
        >
          重新生成
        </button>
      </div>

      {/* 评分 + 状态 */}
      {(score !== null || status) && (
        <div className="mt-4 flex items-center gap-3">
          {score !== null && sc && (
            <div className={`flex items-center gap-2 rounded-md ${sc.bg} px-3 py-1.5`}>
              <span className={`text-lg font-bold ${sc.text}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{score}</span>
              <span className="text-xs text-neo-dim">/ 10</span>
            </div>
          )}
          {status && (
            <div className="neo-inset rounded-md px-3 py-1.5">
              <span className="text-sm font-medium text-neo-ink">{status}</span>
            </div>
          )}
        </div>
      )}

      {/* Markdown 内容 */}
      <div className="ai-markdown mt-4 text-sm leading-relaxed text-neo-ink">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
      </div>

      <p className="mt-4 pt-3 text-[11px] text-neo-dim">
        ⚠ 本内容由 AI 生成，不构成投资建议
      </p>
    </div>
  );
}
