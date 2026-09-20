"use client";

import { useState } from "react";
import { api, type AlertCondition, type AlertParseResult } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { type MarketScope } from "@/lib/market";

const EXAMPLES = [
  "帮我盯着茅台跌破1500",
  "宁德时代涨到250提醒我",
  "比亚迪涨幅超过5%通知我",
  "腾讯跌破300",
];

const US_EXAMPLES = [
  "苹果跌到180提醒我",
  "英伟达涨到150通知我",
  "特斯拉涨幅超过3%提醒我",
  "微软跌破400",
];

const HK_EXAMPLES = [
  "腾讯跌到400提醒我",
  "阿里涨到120通知我",
  "美团涨幅超过5%提醒我",
  "小米跌破25",
];

const FIELD_OPTIONS = [
  { value: "price", label: "价格" },
  { value: "change_pct", label: "涨跌幅" },
  { value: "volume", label: "成交量" },
] as const;

const OP_OPTIONS = [
  { value: "above", label: "≥" },
  { value: "below", label: "≤" },
] as const;

function emptyCondition(): AlertCondition {
  return { field: "price", op: "above", threshold: 0 };
}

function legacyToConditions(condition: string, threshold: number): AlertCondition[] {
  switch (condition) {
    case "above":
      return [{ field: "price", op: "above", threshold }];
    case "below":
      return [{ field: "price", op: "below", threshold }];
    case "change_above":
    case "change_up":
      return [{ field: "change_pct", op: "above", threshold }];
    case "change_below":
    case "change_down":
      return [{ field: "change_pct", op: "below", threshold: -Math.abs(threshold) }];
    default:
      return [];
  }
}

function fieldLabel(field: string): string {
  return FIELD_OPTIONS.find((o) => o.value === field)?.label || field;
}

function opLabel(op: string): string {
  return OP_OPTIONS.find((o) => o.value === op)?.label || op;
}

export function AlertInput({ market = "all", onCreated }: { market?: MarketScope; onCreated?: () => void }) {
  const activeMarket: "cn" | "hk" | "us" = market === "us" ? "us" : market === "hk" ? "hk" : "cn";
  const examples = market === "us" ? US_EXAMPLES : market === "hk" ? HK_EXAMPLES : EXAMPLES;
  const marketLabel = activeMarket === "us" ? "美股" : activeMarket === "hk" ? "港股" : "A股";
  const { user, loading: authLoading } = useAuth();
  const ready = !authLoading && !!user;
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [parsed, setParsed] = useState<AlertParseResult | null>(null);
  const [conditions, setConditions] = useState<AlertCondition[]>([]);
  const [codeInput, setCodeInput] = useState("");
  const [builderOpen, setBuilderOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  async function handleParse() {
    if (!ready) {
      setError("账户正在初始化，请稍后重试");
      return;
    }
    if (!text.trim()) return;
    setLoading(true);
    setError(null);
    setParsed(null);
    setSuccess(null);
    try {
      const result = await api.parseAlert(text, activeMarket);
      const conds = result.conditions?.length
        ? result.conditions
        : result.condition && result.threshold !== undefined
          ? legacyToConditions(result.condition, result.threshold)
          : [];
      setParsed(result);
      setConditions(conds.length ? conds : [emptyCondition()]);
      setCodeInput(result.code || "");
      setBuilderOpen(true);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "解析失败，请重试");
    } finally {
      setLoading(false);
    }
  }

  function openManual() {
    if (!ready) {
      setError("账户正在初始化，请稍后重试");
      return;
    }
    setBuilderOpen(true);
    setParsed(null);
    setConditions([emptyCondition()]);
    setError(null);
    setSuccess(null);
  }

  function updateCondition(index: number, patch: Partial<AlertCondition>) {
    setConditions((prev) => prev.map((c, i) => (i === index ? { ...c, ...patch } : c)));
  }

  function addCondition() {
    setConditions((prev) => [...prev, emptyCondition()]);
  }

  function removeCondition(index: number) {
    setConditions((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  }

  async function handleCreate() {
    if (!ready) {
      setError("账户正在初始化，请稍后重试");
      return;
    }
    const code = codeInput.trim();
    const valid = conditions.filter((c) => c.threshold !== 0);
    if (!code || valid.length === 0) {
      setError("请填写股票代码和至少一条有效条件");
      return;
    }
    setCreating(true);
    setError(null);
    try {
      await api.createAlert({
        code,
        conditions: valid,
        market: activeMarket,
        note: parsed?.raw_text || text || undefined,
      });
      setSuccess(`已创建盯盘任务：${code}（${valid.length} 个条件）`);
      setParsed(null);
      setConditions([]);
      setCodeInput("");
      setText("");
      setBuilderOpen(false);
      onCreated?.();
      window.dispatchEvent(new CustomEvent("alerts-refresh"));
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "创建失败，请重试");
    } finally {
      setCreating(false);
    }
  }

  return (
    <div className="neo-card-sm p-5">
      <div className="mb-3 flex items-center gap-2">
        <span className="rounded bg-neo-primary-soft px-2 py-1 text-[11px] font-medium text-neo-primary">智能盯盘</span>
        <h3 className="text-sm font-semibold text-neo-ink">自然语言创建或组合条件</h3>
      </div>

      <div className="neo-inset flex items-center gap-1 rounded-md p-1">
        <input
          type="text"
          aria-label={market === "us" ? "输入美股盯盘条件" : market === "hk" ? "输入港股盯盘条件" : "输入 A 股盯盘条件"}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleParse()}
          placeholder={market === "us" ? "输入盯盘条件，如「苹果跌到180提醒我」" : market === "hk" ? "输入盯盘条件，如「腾讯跌到400提醒我」" : "输入盯盘条件，如「茅台跌破1500且涨幅超2%」"}
          className="neo-input min-h-11 flex-1 rounded-md bg-transparent px-3 py-2 text-sm text-neo-ink placeholder:text-neo-dim focus:outline-none"
        />
        <button
          onClick={handleParse}
          disabled={!ready || loading || !text.trim()}
          className="neo-btn-primary min-h-11 shrink-0 rounded-md px-4 py-1.5 text-sm font-medium text-white disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {loading ? "解析中…" : "解析"}
        </button>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        {examples.map((ex) => (
          <button
            key={ex}
            onClick={() => setText(ex)}
            className="neo-input min-h-11 rounded-md px-2.5 py-1 text-xs text-neo-dim transition-colors hover:text-neo-mid"
          >
            {ex}
          </button>
        ))}
        {!builderOpen && (
          <button
            onClick={openManual}
            disabled={!ready}
            className="neo-btn min-h-11 rounded-md px-3 py-1 text-xs text-neo-primary"
          >
            + 手动组合条件
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 neo-down-soft rounded-md px-3 py-2 text-xs text-neo-down">
          ⚠ {error}
        </div>
      )}

      {success && (
        <div className="mt-3 neo-up-soft rounded-md px-3 py-2 text-xs text-neo-up">
          ✅ {success}
        </div>
      )}

      {builderOpen && (
        <div className="mt-4 neo-inset rounded-md p-4">
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <span className="text-xs font-medium text-neo-ink">创建盯盘任务</span>
            <span className="rounded bg-neo-primary-soft px-1.5 py-0.5 text-[10px] font-medium text-neo-primary">{marketLabel}</span>
            {parsed && (
              <span className="text-[11px] text-neo-dim">
                解析置信度 {(parsed.confidence * 100).toFixed(0)}% · 模型 {parsed.model}
              </span>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <div className="text-[10px] text-neo-dim">股票代码</div>
              <input
                type="text"
                aria-label="盯盘股票代码"
                value={codeInput}
                onChange={(e) => setCodeInput(e.target.value)}
                placeholder={market === "us" ? "如 AAPL" : market === "hk" ? "如 00700" : "如 sh.600519"}
                className="neo-input mt-1 min-h-11 w-full rounded-md px-3 py-2 text-sm"
              />
            </div>
            {parsed?.name && (
              <div className="flex items-end pb-2 text-sm font-medium text-neo-ink">{parsed.name}</div>
            )}
          </div>

          <div className="mt-3 space-y-2">
            {conditions.map((c, i) => (
              <div key={i} className="grid grid-cols-2 gap-2 sm:grid-cols-[1fr_1fr_1fr_auto]">
                <select
                  aria-label="条件字段"
                  value={c.field}
                  onChange={(e) => updateCondition(i, { field: e.target.value as AlertCondition["field"] })}
                  className="neo-input min-h-11 rounded-md px-2 py-2 text-xs"
                >
                  {FIELD_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <select
                  aria-label="条件运算符"
                  value={c.op}
                  onChange={(e) => updateCondition(i, { op: e.target.value as AlertCondition["op"] })}
                  className="neo-input min-h-11 rounded-md px-2 py-2 text-xs"
                >
                  {OP_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>{o.label}</option>
                  ))}
                </select>
                <input
                  type="number"
                  aria-label="条件阈值"
                  step="any"
                  value={c.threshold}
                  onChange={(e) => updateCondition(i, { threshold: Number(e.target.value) })}
                  placeholder="阈值"
                  className="neo-input min-h-11 rounded-md px-2 py-2 text-xs"
                />
                <button
                  onClick={() => removeCondition(i)}
                  disabled={conditions.length === 1}
                  className="inline-flex min-h-11 items-center justify-center rounded-md px-2 py-2 text-xs text-neo-dim transition-colors hover:text-neo-down disabled:opacity-40"
                >
                  删除
                </button>
              </div>
            ))}
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <button onClick={addCondition} className="neo-input inline-flex min-h-11 items-center rounded-md px-3 py-2 text-xs text-neo-mid transition-colors hover:text-neo-primary">
              + 添加条件
            </button>
            <button
              onClick={handleCreate}
              disabled={!ready || creating}
              className="neo-btn-primary min-h-11 rounded-md px-4 py-2 text-sm font-medium text-white disabled:opacity-40"
            >
              {creating ? "创建中…" : "确认创建"}
            </button>
            <button
              onClick={() => {
                setBuilderOpen(false);
                setParsed(null);
                setConditions([]);
                setCodeInput("");
              }}
              className="neo-input min-h-11 rounded-md px-4 py-2 text-sm text-neo-mid transition-colors"
            >
              取消
            </button>
          </div>

          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-neo-dim">
            {conditions
              .filter((c) => c.threshold !== 0)
              .map((c, i) => (
                <span key={i} className="neo-chip px-2 py-0.5">
                  {fieldLabel(c.field)} {opLabel(c.op)} {c.threshold}
                </span>
              ))}
          </div>
        </div>
      )}
    </div>
  );
}
