"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Bot, RefreshCw, Sparkles } from "lucide-react";
import { api, type MarketTemperature } from "@/lib/api";
import { formatPct } from "@/lib/format";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";

const DIM_ORDER: (keyof MarketTemperature["dimensions"])[] = ["index", "sector", "limit", "ai"];

function fallbackMeta(up: number, down: number): { score: number; label: string } {
  const total = up + down;
  if (total === 0) return { score: 50, label: "观望" };
  const score = Math.round((up / total) * 100);
  if (score >= 80) return { score, label: "亢奋" };
  if (score >= 60) return { score, label: "偏多" };
  if (score >= 40) return { score, label: "中性" };
  if (score >= 20) return { score, label: "偏空" };
  return { score, label: "恐慌" };
}

function dimColor(score: number): string {
  if (score >= 75) return "var(--neo-up-text)";
  if (score >= 45) return "var(--neo-primary)";
  return "var(--neo-down-text)";
}

function scoreColor(score: number): string {
  if (score >= 70) return "var(--neo-up-text)";
  if (score >= 45) return "var(--neo-primary)";
  return "var(--neo-down-text)";
}

export function MarketTemperaturePanel({ upCount, downCount }: { upCount: number; downCount: number }) {
  const [data, setData] = useState<MarketTemperature | null>(null);
  const [error, setError] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiText, setAiText] = useState<string | null>(null);
  const [aiMeta, setAiMeta] = useState<{ model: string; generated_at: string; cached: boolean } | null>(null);

  useEffect(() => {
    let cancelled = false;
    api
      .getMarketTemperature(false)
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setError(false);
        }
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadAI = useCallback(async () => {
    if (aiLoading) return;
    setAiLoading(true);
    try {
      const d = await api.getMarketTemperature(true);
      setData(d);
      setAiText(d.ai?.summary ?? null);
      setAiMeta(d.ai ? { model: d.ai.model, generated_at: d.ai.generated_at, cached: d.ai.cached } : null);
    } catch {
      setAiText(null);
    } finally {
      setAiLoading(false);
    }
  }, [aiLoading]);

  const score = data?.score ?? fallbackMeta(upCount, downCount).score;
  const label = data?.label ?? fallbackMeta(upCount, downCount).label;
  const hotSectors = data?.hot_sectors ?? [];
  const focus = data?.focus ?? "";
  const angle = (score / 100) * 180;
  const arcX = 50 + 40 * Math.cos((180 - angle) * Math.PI) / 180;
  const arcY = 50 - 40 * Math.sin((180 - angle) * Math.PI) / 180;
  const largeArc = angle > 180 ? 1 : 0;
  const color = useMemo(() => scoreColor(score), [score]);

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-[14px] font-semibold text-neo-ink">市场温度</h2>
        <div className="flex items-center gap-2">
          <span className="neo-chip px-2 py-0.5 text-[11px] text-neo-mid">{label}</span>
          {data && <span className="text-[10px] text-neo-dim">{data.market_updated_at}</span>}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <svg width="84" height="52" viewBox="0 0 100 56" aria-hidden>
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="5" strokeLinecap="round" />
          <path d={`M 10 50 A 40 40 0 ${largeArc} 1 ${arcX} ${arcY}`} fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <circle cx="50" cy="50" r="2.5" fill={color} />
        </svg>
        <div>
          <div className="text-[30px] font-bold leading-none" style={{ color, fontFamily: "var(--font-inter), system-ui" }}>
            {score}
          </div>
          <div className="mt-1 text-[11px] font-medium text-neo-dim">综合温度 / 100</div>
        </div>
      </div>

      <div className="mt-4 space-y-2.5">
        {DIM_ORDER.map((key) => {
          const dim = data?.dimensions?.[key];
          if (!dim) {
            return (
              <div key={key} className="neo-inset-sm h-10 animate-pulse rounded-md" />
            );
          }
          const c = dimColor(dim.score);
          return (
            <div key={key}>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-neo-mid">{dim.label}</span>
                <span className="text-[11px] font-semibold" style={{ color: c, fontFamily: "var(--font-inter), system-ui" }}>{dim.score}</span>
              </div>
              <div className="neo-inset-sm mt-1 h-1.5 overflow-hidden rounded-full">
                <div className="h-full rounded-full transition-all duration-500" style={{ width: `${dim.score}%`, background: c }} />
              </div>
              <p className="mt-0.5 truncate text-[10px] text-neo-dim" title={dim.detail}>{dim.detail}</p>
            </div>
          );
        })}
      </div>

      {hotSectors.length > 0 && (
        <div className="mt-4">
          <div className="text-[10px] uppercase tracking-wider text-neo-dim">热点行业</div>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {hotSectors.map((s) => (
              <span key={s.name} className="neo-chip px-2 py-1 text-[10px] text-neo-mid">
                {s.name} <span className={s.change_pct > 0 ? "text-neo-up" : "text-neo-down"} style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatPct(s.change_pct)}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {focus && (
        <div className="neo-inset mt-4 rounded-lg px-3 py-2.5">
          <div className="flex items-center gap-1.5 text-[10px] font-semibold text-neo-primary">
            <Sparkles size={11} />
            AI 焦点
          </div>
          <p className="mt-1 text-[11px] leading-relaxed text-neo-mid">{focus}</p>
        </div>
      )}

      <div className="mt-3">
        <button
          onClick={loadAI}
          disabled={aiLoading}
          className="neo-btn-primary flex w-full items-center justify-center gap-1.5 rounded-md px-4 py-2 text-[12px] font-medium disabled:opacity-60"
        >
          {aiLoading ? <RefreshCw size={13} className="animate-spin" /> : <Bot size={13} />}
          {aiLoading ? "AI 生成中…" : aiText ? "重新生成 AI 温度解读" : "AI 深度解读"}
        </button>
        {aiText && (
          <div className="neo-inset mt-3 rounded-lg px-3 py-3">
            <div className="whitespace-pre-wrap text-[12px] leading-relaxed text-neo-ink">{aiText}</div>
            {aiMeta && (
              <div className="mt-2 flex flex-wrap items-center gap-2 text-[10px] text-neo-dim">
                <span>{aiMeta.cached ? "缓存" : "实时生成"}</span>
                <span>{aiMeta.model}</span>
                <span>{aiMeta.generated_at.slice(5, 16).replace("T", " ")}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {error && !data && (
        <p className="mt-3 text-[10px] text-neo-down">温度接口暂不可用，当前为涨跌停简化评分</p>
      )}
      <AiDisclaimer className="mt-3" />
    </div>
  );
}
