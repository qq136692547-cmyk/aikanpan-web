"use client";

import Link from "next/link";
import useSWR from "swr";
import { RefreshCw } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { api, type AIReview } from "@/lib/api";
import { isAiQuotaExhaustedError } from "@/lib/ai-quota";
import { AIEvidencePanel } from "@/components/ai/ai-evidence-panel";

const US_DAILY_REVIEW_KEY = "us-daily-review";

async function fetchUsDailyReview() {
  return api.getUsDailyReview();
}

export function useUsDailyReview() {
  return useSWR<AIReview>(US_DAILY_REVIEW_KEY, fetchUsDailyReview, {
    keepPreviousData: true,
    revalidateOnFocus: false,
    dedupingInterval: 60_000,
  });
}

export function getUsDailyReviewExcerpt(content: string) {
  const paragraph = stripTrailingMeta(content)
    .split(/\n{2,}/)
    .map((part) => part.replace(/[\n#*>]/g, " ").replace(/\s+/g, " ").trim())
    .find((part) => part && !part.startsWith("状态") && !part.startsWith("评分"));
  return paragraph || "";
}

export function getUsDailyReviewTakeaways(content: string) {
  const body = stripTrailingMeta(content);
  const clean = (value: string) =>
    value
      .replace(/^\s*\d+[.、]\s*/, "")
      .replace(/^\s*[-+*]\s+/, "")
      .replace(/^\*\*[^*]+\*\*[:：]?\s*/, "")
      .replace(/^[>:：\s]+/, "")
      .replace(/\*\*/g, "")
      .replace(/\s+/g, " ")
      .trim();
  const blocks = body
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .map(clean)
    .filter(Boolean);
  const marketText =
    blocks.find(
      (block) =>
        !/^(?:今日美股复盘|美股复盘|评分|状态)/.test(block) &&
        block.length >= 16,
    ) || getUsDailyReviewExcerpt(body);
  const riskPattern = /风险|警惕|留意|关注|下跌|回调|压力|波动|不确定|谨慎|利空/;
  const actionPattern = /关注|观察|留意|等待|观望|回踩|波动|承压|承接|轮动/;
  const riskText =
    blocks.find((block) => block !== marketText && riskPattern.test(block)) || "";
  const actionText =
    blocks
      .filter((block) => block !== marketText && block !== riskText && actionPattern.test(block))
      .at(-1) || "";

  return [
    { label: "市场驱动", text: marketText },
    { label: "主要风险", text: riskText },
    { label: "关注要点", text: actionText },
  ].filter((item) => item.text);
}

function parseScoreAndStatus(content: string): { score: number | null; status: string | null } {
  const scoreMatch = content.match(/\*\*评分\*\*[:：]\s*(\d+)\s*\/\s*10/);
  const statusMatch = content.match(/\*\*状态\*\*[:：]\s*(.+)/);
  return {
    score: scoreMatch ? parseInt(scoreMatch[1], 10) : null,
    status: statusMatch ? statusMatch[1].trim() : null,
  };
}

export function getUsDailyReviewConclusion(content: string) {
  const { score, status } = parseScoreAndStatus(content);
  return [status, score !== null ? `评分 ${score}/10` : ""].filter(Boolean).join(" · ");
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

export function UsDailyReview() {
  const { data, error, isLoading, mutate } = useUsDailyReview();

  if (isLoading && !data) {
    return (
      <div className="neo-ai scanline p-6">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-neo-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">
            美股 AI 复盘
          </span>
          <span className="text-[13px] text-neo-mid">生成中…</span>
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

  if (error && !data) {
    return (
      <div className="neo-card-sm p-6">
        <div className="flex items-center justify-between">
          <span className="rounded-md bg-neo-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">美股 AI 复盘</span>
          <button onClick={() => mutate()} className="rounded-md px-3 py-1 text-[12px] text-neo-mid transition-colors hover-neo-inset hover:text-neo-primary">重试</button>
        </div>
        <p className="mt-3 text-[13px] text-neo-down">
          {error instanceof Error ? error.message : "美股复盘请求失败"}
          {/* P0-2: 额度耗尽时给稳定的升级入口（错误码优先，文案回退） */}
          {isAiQuotaExhaustedError(error) && (
            <Link href="/upgrade/" className="ml-1 text-neo-primary underline hover:text-neo-primary">
              升级 Pro 解锁更多额度
            </Link>
          )}
        </p>
      </div>
    );
  }

  if (!data) return null;

  const { score, status } = parseScoreAndStatus(data.content);
  const body = stripTrailingMeta(data.content);
  const sc = score !== null ? scoreColor(score) : null;

  return (
    <div className="neo-ai p-5 sm:p-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="rounded-md bg-neo-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">
            美股 AI 复盘
          </span>
          <span className="text-[11px] text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>{data.generated_at.slice(0, 16).replace("T", " ")}</span>
          {data.cached && <span className="rounded bg-[var(--neo-surface-inset)] px-1.5 py-0.5 text-[10px] text-neo-dim">缓存</span>}
        </div>
        <button onClick={() => mutate()} disabled={isLoading} className="rounded-md px-3 py-1 text-[12px] text-neo-mid transition-colors hover-neo-inset hover:text-neo-primary disabled:opacity-50">
          <RefreshCw size={12} className={`mr-1 inline ${isLoading ? "animate-spin" : ""}`} />
          重新生成
        </button>
      </div>

      {(score !== null || status) && (
        <div className="mt-4 flex items-center gap-2">
          {score !== null && sc && (
            <div className={`flex items-baseline gap-1 rounded-md ${sc.bg} px-3 py-1.5`}>
              <span className={`text-[20px] font-bold ${sc.text}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>{score}</span>
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

      <AIEvidencePanel evidence={data.evidence} />

      <p className="mt-4 pt-3 text-[11px] text-neo-mid leading-relaxed">
        ⚠ 本内容由 AI 自动生成，可能存在错误；数据来自第三方公开接口，可能存在延迟。本内容不构成证券投资建议，据此操作盈亏自负。
      </p>
    </div>
  );
}
