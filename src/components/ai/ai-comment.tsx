"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  ShieldAlert,
  Sparkles,
  BarChart3,
  Layers,
  LineChart,
  UserCheck,
  Eye,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  Info
} from "lucide-react";
import { api, type AIComment, type StockReport } from "@/lib/api";
import { AIEvidencePanel } from "./ai-evidence-panel";

/** 从 content 末尾提取评分、状态与多空倾向 (兼容纯文本降级) */
function parseScoreAndStatus(content: string): {
  score: number | null;
  status: string | null;
  bias: string | null;
} {
  const scoreMatch = content.match(/\*\*评分\*\*[:：]\s*(\d+)\s*\/\s*10/);
  const statusMatch = content.match(/\*\*状态\*\*[:：]\s*(.+)/);
  let bias: string | null = null;
  if (/偏多|强烈看多|看多|建议买入|超配/.test(content)) bias = "看多";
  else if (/偏空|强烈看空|看空|建议卖出|低配/.test(content)) bias = "看空";
  else if (/中性|震荡|观望/.test(content)) bias = "中性";

  return {
    score: scoreMatch ? parseInt(scoreMatch[1], 10) : null,
    status: statusMatch ? statusMatch[1].trim() : null,
    bias,
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

/** 评分色彩与进度条宽度 */
const getScoreTheme = (score: number) => {
  if (score >= 7) {
    return {
      badgeBg: "bg-neo-up/10 border-neo-up/30 text-neo-up",
      barBg: "bg-neo-up",
      ringColor: "#ef4444",
      level: "偏强",
    };
  }
  if (score >= 5) {
    return {
      badgeBg: "bg-amber-500/10 border-amber-500/30 text-amber-500",
      barBg: "bg-amber-500",
      ringColor: "#f59e0b",
      level: "中性",
    };
  }
  return {
    badgeBg: "bg-neo-down/10 border-neo-down/30 text-neo-down",
    barBg: "bg-neo-down",
    ringColor: "#10b981",
    level: "偏弱",
  };
};

/** 多空倾向样式 */
const getBiasBadge = (bias: string | null | undefined, score: number | null) => {
  const b = bias || (score !== null ? (score >= 7 ? "看多" : score <= 4 ? "看空" : "中性") : "中性");
  if (b.includes("多")) {
    return {
      text: b,
      icon: TrendingUp,
      color: "text-neo-up bg-neo-up/10 border-neo-up/20",
    };
  }
  if (b.includes("空")) {
    return {
      text: b,
      icon: TrendingDown,
      color: "text-neo-down bg-neo-down/10 border-neo-down/20",
    };
  }
  return {
    text: b,
    icon: Minus,
    color: "text-amber-500 bg-amber-500/10 border-amber-500/20",
  };
};

type LoadState = "idle" | "loading" | "done" | "error";

export interface AICommentProps {
  code: string;
  market?: "cn" | "hk" | "us";
  initialData?: AIComment | null;
}

export function AIComment({ code, market = "cn", initialData }: AICommentProps) {
  const [state, setState] = useState<LoadState>(initialData ? "done" : "idle");
  const [data, setData] = useState<AIComment | null>(initialData ?? null);

  useEffect(() => {
    if (initialData) {
      setData(initialData);
      setState("done");
    }
  }, [initialData]);
  const [error, setError] = useState<string>("");
  const [showRisks, setShowRisks] = useState<boolean>(true);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleGenerate = useCallback(async () => {
    setState("loading");
    setError("");

    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      setError("AI 服务响应超时，请重试");
      setState("error");
    }, 60_000);

    try {
      let result: AIComment;
      if (market === "hk") {
        result = await api.getHkAI(code);
      } else if (market === "us") {
        result = await api.getUsAI(code);
      } else {
        result = await api.getAIComment(code);
      }
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setData(result);
      setState("done");
    } catch (e: unknown) {
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      setError(e instanceof Error ? e.message : "AI 分析请求失败");
      setState("error");
    }
  }, [code]);

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
            <span className="flex items-center gap-1.5 rounded-full bg-neo-primary-soft px-2.5 py-1 text-[11px] font-semibold text-neo-primary">
              <Sparkles size={13} />
              AI 智能诊断
            </span>
            <span className="text-xs text-neo-dim">基于大模型与量化指标深度剖析</span>
          </div>
          <button
            onClick={handleGenerate}
            className="neo-btn-primary flex items-center gap-1.5 rounded-md px-4 py-1.5 text-xs font-medium transition-all duration-200 hover:-translate-y-0.5 active:translate-y-0"
          >
            <Sparkles size={13} />
            生成诊断报告
          </button>
        </div>
        <p className="mt-3 text-xs leading-relaxed text-neo-dim">
          系统将实时汇总标的的技术走势、量能主力、估值偏度及基本面要点，出具结构化评级报告与针对性操作指引。
        </p>
      </div>
    );
  }

  if (state === "loading") {
    return (
      <div className="neo-ai p-5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="flex items-center gap-1.5 rounded-full bg-neo-primary-soft px-2.5 py-1 text-[11px] font-semibold text-neo-primary">
              <Sparkles size={13} className="animate-spin" />
              AI 正在深度演算中...
            </span>
            <span className="text-xs text-neo-dim">耗时约 5-15 秒</span>
          </div>
        </div>
        <div className="mt-4 space-y-2.5">
          <div className="neo-skeleton h-4 w-full rounded" />
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
          <span className="flex items-center gap-1.5 rounded-full bg-neo-primary-soft px-2.5 py-1 text-[11px] font-semibold text-neo-primary">
            <Sparkles size={13} />
            AI 诊断
          </span>
          <button
            onClick={handleGenerate}
            className="flex items-center gap-1 rounded-md px-3 py-1.5 text-xs text-neo-mid transition-colors hover-neo-inset hover:text-neo-primary"
          >
            <RefreshCw size={12} />
            重试
          </button>
        </div>
        <p className="mt-3 text-sm text-neo-down">
          {error}
          {error.includes("升级 Pro") && (
            <Link href="/upgrade" className="ml-1 text-neo-primary underline">
              查看 Pro
            </Link>
          )}
        </p>
      </div>
    );
  }

  // done 数据准备与字段解析
  const parsed = parseScoreAndStatus(data!.content);
  const report = data!.report ?? null;
  const score = report?.score ?? parsed.score;
  const status = report?.status ?? parsed.status;
  const biasInfo = getBiasBadge(report?.bias || parsed.bias, score);
  const theme = score !== null ? getScoreTheme(score) : null;
  const body = stripTrailingMeta(data!.content);

  // 四维量化卡片提炼
  const dimensions = [
    {
      key: "trend",
      title: "趋势走势",
      icon: LineChart,
      content: report?.trend,
    },
    {
      key: "technical",
      title: "技术面盘口",
      icon: BarChart3,
      content: report?.technical,
    },
    {
      key: "valuation",
      title: "估值流动性",
      icon: Layers,
      content: report?.valuation || (report as any)?.money_flow,
    },
    {
      key: "positives",
      title: "核心亮点与支撑",
      icon: Sparkles,
      items: report?.positives,
    },
  ].filter((d) => d.content || (d.items && d.items.length > 0));

  // 操作视角归纳 (兼容 string | string[])
  const holderAdvice = Array.isArray(report?.holder_advice)
    ? report?.holder_advice.join("；")
    : report?.holders_advice || (report?.holder_advice as any);

  const watcherAdvice = Array.isArray(report?.watcher_advice)
    ? report?.watcher_advice.join("；")
    : report?.watchers_advice || (report?.watcher_advice as any);

  const hasAdvice = Boolean(holderAdvice || watcherAdvice || report?.operation_advice);
  const risks = report?.risks || [];

  return (
    <div className="neo-ai p-5 space-y-4">
      {/* 头部状态与时间 */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.08] pb-3">
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-neo-primary-soft px-2.5 py-0.5 text-[11px] font-semibold text-neo-primary">
            <Sparkles size={12} />
            AI 智能量化报告
          </span>
          <span className="text-[11px] text-neo-dim font-mono">
            {data!.generated_at?.slice(0, 16).replace("T", " ")}
          </span>
          {data!.cached && (
            <span className="rounded bg-[var(--neo-surface-inset)] px-1.5 py-0.2 text-[10px] text-neo-dim border border-white/[0.08]">
              快照缓存
            </span>
          )}
        </div>
        <button
          onClick={handleGenerate}
          className="flex items-center gap-1 rounded-md px-2.5 py-1 text-xs text-neo-mid transition-all hover-neo-inset hover:text-neo-primary"
        >
          <RefreshCw size={12} />
          重新分析
        </button>
      </div>

      {/* 核心结论与多空评级徽章 (仿开源仪表盘布局) */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-12">
        {/* 左侧：多空倾向与量化评分 */}
        <div className="sm:col-span-4 rounded-xl neo-inset p-3.5 flex flex-col justify-between gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-medium text-neo-dim">量化多空评级</span>
            <div className={`flex items-center gap-1 rounded-full border px-2.5 py-0.5 text-xs font-semibold ${biasInfo.color}`}>
              <biasInfo.icon size={12} />
              <span>{biasInfo.text}</span>
            </div>
          </div>

          <div className="my-1 flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-extrabold tracking-tight text-neo-ink font-mono">
                {score ?? "-"}
              </span>
              <span className="text-xs text-neo-dim font-mono">/ 10 分</span>
            </div>
            {theme && (
              <span className={`text-[11px] font-medium px-2 py-0.5 rounded border ${theme.badgeBg}`}>
                {theme.level}
              </span>
            )}
          </div>

          {/* 评分进度条 */}
          {score !== null && theme && (
            <div className="space-y-1">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-[var(--neo-surface-inset)]">
                <div
                  className={`h-full transition-all duration-500 ${theme.barBg}`}
                  style={{ width: `${Math.min(100, Math.max(0, score * 10))}%` }}
                />
              </div>
              <div className="flex justify-between text-[9px] text-neo-dim font-mono">
                <span>0 谨慎</span>
                <span>5 中性</span>
                <span>10 积极</span>
              </div>
            </div>
          )}

          {status && (
            <div className="rounded bg-[var(--neo-surface)] px-2 py-1 text-center text-[11px] font-medium text-neo-mid border border-white/[0.08]">
              当前状态：{status}
            </div>
          )}
        </div>

        {/* 右侧：核心观点一句话总结 */}
        <div className="sm:col-span-8 rounded-xl neo-card p-3.5 flex flex-col justify-between">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-neo-ink">
            <Info size={14} className="text-neo-primary" />
            <span>核心逻辑判断</span>
          </div>
          <div className="my-2">
            <p className="text-sm leading-relaxed text-neo-ink font-normal">
              {report?.one_sentence ||
                (body.length > 160 ? `${body.slice(0, 160).trim()}...` : body)}
            </p>
          </div>
          {report?.trend && report?.one_sentence && (
            <div className="mt-1 rounded-md bg-[var(--neo-surface-inset)] px-2.5 py-1.5 text-xs text-neo-dim">
              <span className="font-medium text-neo-mid">短中期研判：</span>
              {report.trend}
            </div>
          )}
        </div>
      </div>

      {/* 四维量化卡片组 (技术面、盘口、估值、亮点) */}
      {dimensions.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-neo-ink flex items-center gap-1.5">
            <Layers size={13} className="text-neo-primary" />
            <span>多维度量化剖析</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {dimensions.map((dim) => (
              <div
                key={dim.key}
                className="rounded-lg border border-white/[0.08] bg-[var(--neo-surface)] p-3 transition-colors hover:border-neo-primary/40"
              >
                <div className="mb-1.5 flex items-center gap-1.5 text-xs font-semibold text-neo-ink">
                  <dim.icon size={13} className="text-neo-primary shrink-0" />
                  <span>{dim.title}</span>
                </div>
                {dim.content && (
                  <p className="text-xs leading-relaxed text-neo-mid line-clamp-3 hover:line-clamp-none transition-all">
                    {dim.content}
                  </p>
                )}
                {dim.items && (
                  <ul className="space-y-1 text-xs text-neo-mid">
                    {dim.items.slice(0, 3).map((item, idx) => (
                      <li key={idx} className="flex items-start gap-1.5">
                        <span className="text-neo-primary font-bold">•</span>
                        <span className="leading-relaxed">{item}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 持有者 vs 观望者 双视角决策卡片 (开源特色设计) */}
      {hasAdvice && (
        <div className="space-y-2">
          <div className="text-xs font-semibold text-neo-ink flex items-center gap-1.5">
            <UserCheck size={13} className="text-neo-primary" />
            <span>操作策略参考</span>
          </div>
          <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {holderAdvice && (
              <div className="rounded-lg neo-inset p-3 border-l-2 border-l-neo-primary">
                <div className="flex items-center gap-1 text-xs font-semibold text-neo-ink mb-1">
                  <UserCheck size={12} className="text-neo-primary" />
                  <span>已持仓用户策略</span>
                </div>
                <p className="text-xs leading-relaxed text-neo-mid">
                  {holderAdvice}
                </p>
              </div>
            )}
            {watcherAdvice && (
              <div className="rounded-lg neo-inset p-3 border-l-2 border-l-amber-500">
                <div className="flex items-center gap-1 text-xs font-semibold text-neo-ink mb-1">
                  <Eye size={12} className="text-amber-500" />
                  <span>持币观望者指引</span>
                </div>
                <p className="text-xs leading-relaxed text-neo-mid">
                  {watcherAdvice}
                </p>
              </div>
            )}
          </div>
          {report?.operation_advice && !holderAdvice && !watcherAdvice && (
            <div className="rounded-lg neo-inset p-3 text-xs leading-relaxed text-neo-mid">
              {report.operation_advice}
            </div>
          )}
        </div>
      )}

      {/* 回退兼容：如果未解析出结构化字段，保留 Markdown 渲染 */}
      {!report && body && (
        <div className="ai-markdown rounded-lg neo-inset p-4 text-xs leading-relaxed text-neo-ink">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{body}</ReactMarkdown>
        </div>
      )}

      {/* 风险提示折叠抽屉 */}
      {risks.length > 0 && (
        <div className="rounded-lg border border-neo-down/20 bg-neo-down/5 overflow-hidden">
          <button
            type="button"
            onClick={() => setShowRisks((v) => !v)}
            className="flex min-h-10 w-full items-center justify-between px-3 py-2 text-left text-xs font-medium text-neo-down"
          >
            <span className="flex items-center gap-1.5">
              <ShieldAlert size={13} />
              <span>潜在风险因素 ({risks.length})</span>
            </span>
            {showRisks ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </button>
          {showRisks && (
            <div className="border-t border-neo-down/10 px-3 py-2.5">
              <ul className="space-y-1 text-xs leading-relaxed text-neo-mid">
                {risks.map((risk, index) => (
                  <li key={index} className="flex items-start gap-1.5">
                    <span className="text-neo-down font-bold shrink-0">!</span>
                    <span>{risk}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* 数据来源与可信度面板 */}
      <AIEvidencePanel evidence={data!.evidence} />

      {/* 免责声明 */}
      <p className="pt-1 text-[10px] text-neo-dim leading-normal">
        ⚠ {report?.disclaimer || "本内容由 AI 大模型结合量化规则生成，仅供参考，不构成任何投资建议与决策依据。"}
      </p>
    </div>
  );
}


export { AIComment as StockAIComment };
