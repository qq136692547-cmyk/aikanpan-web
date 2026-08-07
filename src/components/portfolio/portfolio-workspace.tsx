"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import useSWR from "swr";
import { api, type PortfolioReview, type Position, type PortfolioSummary, type TransactionItem } from "@/lib/api";
import { formatAmount, formatPct, formatPrice } from "@/lib/format";
import { Sparkline } from "@/components/chart/sparkline";
import { EmptyState, ErrorState } from "@/components/ui/state";

const TX_TYPES = [
  { value: "buy", label: "买入" },
  { value: "sell", label: "卖出" },
  { value: "dividend", label: "分红" },
] as const;

const TX_TYPE_TEXT: Record<string, string> = {
  buy: "买入",
  sell: "卖出",
  dividend: "分红",
};

const TX_TYPE_CLASS: Record<string, string> = {
  buy: "text-neo-up",
  sell: "text-neo-down",
  dividend: "text-[var(--neo-amber)]",
};

export function PortfolioWorkspace() {
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [shares, setShares] = useState("");
  const [cost, setCost] = useState("");
  const [actionError, setActionError] = useState("");
  const [mutating, setMutating] = useState(false);

  const [txType, setTxType] = useState<"buy" | "sell" | "dividend">("buy");
  const [txCode, setTxCode] = useState("");
  const [txName, setTxName] = useState("");
  const [txShares, setTxShares] = useState("");
  const [txPrice, setTxPrice] = useState("");
  const [txDate, setTxDate] = useState("");
  const [txNote, setTxNote] = useState("");
  const [portfolioReview, setPortfolioReview] = useState<PortfolioReview | null>(null);
  const [portfolioReviewLoading, setPortfolioReviewLoading] = useState(false);
  const [editingTx, setEditingTx] = useState<TransactionItem | null>(null);

  const { data: positionsData, error, mutate } = useSWR(
    "portfolio-positions",
    () => api.getPositions(),
    { refreshInterval: 30000 }
  );
  const { data: summary } = useSWR<PortfolioSummary>(
    "portfolio-summary",
    () => api.getPortfolioSummary(),
    { refreshInterval: 30000 }
  );
  const { data: txData, mutate: mutateTx } = useSWR(
    "portfolio-transactions",
    () => api.getTransactions(),
    { refreshInterval: 30000 }
  );

  const positions: Position[] = positionsData?.positions || [];
  const transactions: TransactionItem[] = txData?.transactions || [];
  const totalValue = summary?.total_value ?? positions.reduce((s, p) => s + p.market_value, 0);
  const totalCost = summary?.total_cost ?? positions.reduce((s, p) => s + p.cost * p.shares, 0);
  const totalPnl = summary?.total_pnl ?? positions.reduce((s, p) => s + p.pnl, 0);
  const totalPnlPct = totalCost > 0 ? (totalPnl / totalCost) * 100 : 0;

  const codesKey = positions.map((p) => p.code).join(",");
  const { data: curve } = useSWR(
    `portfolio-curve-${codesKey}`,
    async () => {
      if (positions.length === 0) return [];
      const settled = await Promise.allSettled(positions.map((p) => api.getStockHistory(p.code)));
      const series = positions.map((p, i) => ({
        shares: p.shares,
        closes: settled[i].status === "fulfilled" ? (settled[i].value.closes || []) : [],
      }));
      const lengths = series.map((s) => s.closes.length);
      const length = lengths.length > 0 ? Math.min(...lengths) : 0;
      const points: { value: number }[] = [];
      for (let i = 0; i < length; i += 1) {
        const value = series.reduce((sum, s) => sum + s.shares * (s.closes[i] || 0), 0);
        points.push({ value: Math.round(value * 100) / 100 });
      }
      return points.slice(-30);
    },
    { refreshInterval: 60000 }
  );
  const curveTrend = curve && curve.length >= 2 ? curve[curve.length - 1].value - curve[0].value : 0;

  async function addPosition(e: FormEvent) {
    e.preventDefault();
    const sharesNum = Number(shares);
    const costNum = Number(cost);
    if (!code.trim() || !sharesNum || !costNum) {
      setActionError("代码、股数和成本价不能为空");
      return;
    }
    setMutating(true);
    setActionError("");
    try {
      await api.upsertPosition({
        code: code.trim(),
        name: name.trim() || undefined,
        shares: sharesNum,
        cost_price: costNum,
      });
      setCode("");
      setName("");
      setShares("");
      setCost("");
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "持仓保存失败");
    } finally {
      setMutating(false);
    }
  }

  function editPosition(p: Position) {
    setCode(p.code);
    setName(p.name);
    setShares(String(p.shares));
    setCost(String(p.cost));
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function removePosition(id: string) {
    setMutating(true);
    setActionError("");
    try {
      await api.deletePosition(id);
      await mutate();
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "删除失败");
    } finally {
      setMutating(false);
    }
  }

  async function loadPortfolioReview() {
    setPortfolioReviewLoading(true);
    setActionError("");
    try {
      const result = await api.getPortfolioReview();
      setPortfolioReview(result);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "组合诊断失败");
    } finally {
      setPortfolioReviewLoading(false);
    }
  }

  function exportCsv() {
    const rows = [["名称", "代码", "股数", "成本", "现价", "市值", "盈亏", "盈亏比例"]];
    for (const p of positions) {
      rows.push([p.name, p.code, String(p.shares), String(p.cost), String(p.current), String(p.market_value), String(p.pnl), String(p.pnl_pct)]);
    }
    const blob = new Blob([rows.map((r) => r.join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aikanpan-positions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  async function addTransaction(e: FormEvent) {
    e.preventDefault();
    const sharesNum = Number(txShares) || 0;
    const priceNum = Number(txPrice) || 0;
    if (!txCode.trim()) {
      setActionError("交易代码不能为空");
      return;
    }
    if ((txType === "buy" || txType === "sell") && (sharesNum <= 0 || priceNum <= 0)) {
      setActionError("买入/卖出需要填写股数和价格");
      return;
    }
    setMutating(true);
    setActionError("");
    try {
      const payload = {
        code: txCode.trim(),
        name: txName.trim() || undefined,
        type: txType,
        shares: sharesNum,
        price: priceNum,
        date: txDate || undefined,
        note: txNote.trim() || undefined,
      };
      if (editingTx) {
        await api.updateTransaction(editingTx.id, payload);
      } else {
        await api.createTransaction(payload);
      }
      setTxCode("");
      setTxName("");
      setTxShares("");
      setTxPrice("");
      setTxNote("");
      setEditingTx(null);
      await Promise.all([mutate(), mutateTx()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "交易记录失败");
    } finally {
      setMutating(false);
    }
  }

  function editTransaction(tx: TransactionItem) {
    setEditingTx(tx);
    setTxType(tx.type);
    setTxCode(tx.code);
    setTxName(tx.name);
    setTxShares(String(tx.shares));
    setTxPrice(String(tx.price));
    setTxDate(tx.date || "");
    setTxNote(tx.note || "");
    window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
  }

  function cancelEditTransaction() {
    setEditingTx(null);
    setTxType("buy");
    setTxCode("");
    setTxName("");
    setTxShares("");
    setTxPrice("");
    setTxNote("");
  }

  async function removeTransaction(tx: TransactionItem) {
    if (!window.confirm(`确认删除 ${tx.name}(${tx.code}) 这笔流水？`)) return;
    setMutating(true);
    setActionError("");
    try {
      await api.deleteTransaction(tx.id);
      await Promise.all([mutate(), mutateTx()]);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "删除流水失败");
    } finally {
      setMutating(false);
    }
  }

  function exportTxCsv() {
    const rows = [["类型", "名称", "代码", "股数", "价格", "日期", "备注"]];
    for (const t of transactions) {
      rows.push([TX_TYPE_TEXT[t.type] || t.type, t.name, t.code, String(t.shares), String(t.price), t.date, t.note || ""]);
    }
    const blob = new Blob([rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, "\"")}"`).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aikanpan-transactions-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!positionsData && !error) {
    return (
      <div className="space-y-3">
        <div className="neo-skeleton h-32 rounded-xl" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="neo-skeleton h-56 rounded-xl lg:col-span-2" />
          <div className="neo-skeleton h-56 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="neo-fade-up space-y-4">
      <section className="neo-card relative overflow-hidden p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="text-[22px] font-bold tracking-tight text-neo-ink">持仓组合</h1>
            <p className="mt-1 text-[12px] text-neo-dim">
              {positions.length} 只持仓 · 每 30 秒刷新
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neo-dim">总市值</div>
              <div key={totalValue} className="data-flash mt-0.5 text-[22px] font-bold text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {formatAmount(totalValue)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neo-dim">总盈亏</div>
              <div key={totalPnl} className={`data-flash mt-0.5 text-[22px] font-bold ${totalPnl >= 0 ? "text-neo-up" : "text-neo-down"}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {totalPnl >= 0 ? "+" : ""}{formatAmount(totalPnl)}
              </div>
            </div>
            <div>
              <div className="text-[10px] uppercase tracking-wider text-neo-dim">盈亏比例</div>
              <div key={totalPnlPct} className={`data-flash mt-0.5 text-[18px] font-bold ${totalPnlPct >= 0 ? "text-neo-up" : "text-neo-down"}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                {formatPct(totalPnlPct)}
              </div>
            </div>
          </div>
        </div>
      </section>

      {error && (
        <ErrorState title="持仓数据加载失败" description="请检查网络后重试" onRetry={() => mutate()} />
      )}

      <section className="neo-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-neo-ink">AI 组合诊断</h2>
          <button onClick={loadPortfolioReview} disabled={portfolioReviewLoading} className="neo-btn-primary rounded-md px-3 py-1.5 text-[12px] font-medium disabled:opacity-60">
            {portfolioReviewLoading ? "生成中…" : portfolioReview ? "重新生成" : "生成诊断"}
          </button>
        </div>
        {portfolioReviewLoading && !portfolioReview ? (
          <div className="mt-3 space-y-2">
            <div className="neo-skeleton h-3 w-full rounded" />
            <div className="neo-skeleton h-3 w-5/6 rounded" />
            <div className="neo-skeleton h-3 w-3/4 rounded" />
          </div>
        ) : portfolioReview ? (
          <p className="mt-3 whitespace-pre-wrap text-[13px] leading-relaxed text-neo-mid">{portfolioReview.content}</p>
        ) : (
          <p className="mt-3 text-[12px] text-neo-mid">暂无组合诊断，点击生成后展示集中度与风险分析</p>
        )}
      </section>


      <section className="neo-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-neo-ink">组合市值趋势</h2>
          <div className="flex items-center gap-2">
            <button onClick={exportCsv} className="neo-chip px-2.5 py-1 text-[11px] text-neo-primary">导出 CSV</button>
            <span className="text-[10px] uppercase tracking-wider text-neo-dim">近 30 个交易日</span>
          </div>
        </div>
        {curve && curve.length >= 2 ? (
          <Sparkline data={curve.map((p) => p.value)} trend={curveTrend} height={64} className="mt-3 w-full" />
        ) : (
          positions.length === 0 ? (
            <div className="mt-3 flex h-16 items-center justify-center rounded-lg bg-[var(--neo-surface-inset)] text-[12px] text-neo-dim">暂无持仓趋势</div>
          ) : (
            <div className="neo-skeleton mt-3 h-16 rounded-lg" />
          )
        )}
      </section>

      <section className="neo-card p-5">
        <h2 className="text-[14px] font-semibold text-neo-ink">添加 / 更新持仓</h2>
        <form onSubmit={addPosition} className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
          <input value={code} onChange={(e) => setCode(e.target.value)} placeholder="代码，如 sh.600519" className="neo-input rounded-md px-3 py-2 text-[12px]" />
          <input value={name} onChange={(e) => setName(e.target.value)} placeholder="名称（可选）" className="neo-input rounded-md px-3 py-2 text-[12px]" />
          <input type="number" min="1" step="1" value={shares} onChange={(e) => setShares(e.target.value)} placeholder="股数" className="neo-input rounded-md px-3 py-2 text-[12px]" />
          <input type="number" min="0.01" step="0.01" value={cost} onChange={(e) => setCost(e.target.value)} placeholder="成本价" className="neo-input rounded-md px-3 py-2 text-[12px]" />
          <button type="submit" disabled={mutating} className="neo-btn-primary rounded-md px-4 py-2 text-[13px] font-medium disabled:opacity-60">
            {mutating ? "保存中…" : "保存持仓"}
          </button>
        </form>
        {actionError && <p className="mt-2 text-[11px] text-neo-down">{actionError}</p>}
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
        <div className="neo-card-sm overflow-hidden lg:col-span-2">
          <div className="flex items-center justify-between px-5 py-3">
            <h2 className="text-[14px] font-semibold text-neo-ink">持仓明细</h2>
            <span className="text-[11px] text-neo-dim">{positions.length} 只</span>
          </div>
          {positions.length === 0 ? (
            <EmptyState title="暂无持仓" description="通过上方表单添加第一只持仓" />
          ) : (
          <>
            <div className="sm:hidden space-y-2 px-3 py-2">
              {positions.map((p) => (
                <div key={p.id} className="neo-inset px-3 py-2.5">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate font-medium text-neo-ink">{p.name}</span>
                    <span className="text-[10px] text-neo-dim">{p.code}</span>
                    {p.pnl_pct <= -10 && <span className="rounded bg-[var(--neo-down-soft)] px-1.5 py-0.5 text-[10px] text-neo-down">止损</span>}
                    {p.pnl_pct >= 20 && <span className="rounded bg-[var(--neo-up-soft)] px-1.5 py-0.5 text-[10px] text-neo-up">止盈</span>}
                  </div>
                  <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px]">
                    <span className="text-neo-dim">股数 <b className="text-neo-ink">{p.shares}</b></span>
                    <span className="text-neo-dim">成本 <b className="text-neo-ink">{formatPrice(p.cost)}</b></span>
                    <span className="text-neo-dim">现价 <b className="text-neo-ink">{formatPrice(p.current)}</b></span>
                    <span className="text-neo-dim">市值 <b className="text-neo-ink">{formatAmount(p.market_value)}</b></span>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between gap-2">
                    <span className={`text-[12px] font-semibold ${p.pnl >= 0 ? "text-neo-up" : "text-neo-down"}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                      {formatAmount(p.pnl)} · {formatPct(p.pnl_pct)}
                    </span>
                    <span className="flex gap-2">
                      <button onClick={() => editPosition(p)} disabled={mutating} className="text-[11px] text-neo-primary">编辑</button>
                      <button onClick={() => removePosition(p.id)} disabled={mutating} className="text-[11px] text-neo-dim">删除</button>
                    </span>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden sm:block overflow-x-auto neo-scrollbar">
              <div className="min-w-[800px]">
                <div className="grid grid-cols-[1fr_70px_70px_70px_90px_80px_80px] gap-2 px-5 py-2 text-[10px] uppercase tracking-wider text-neo-dim">
                  <span>名称 / 代码</span>
                  <span className="text-right">股数</span>
                  <span className="text-right">成本</span>
                  <span className="text-right">现价</span>
                  <span className="text-right">市值</span>
                  <span className="text-right">盈亏</span>
                  <span />
                </div>
                {positions.map((p) => (
                  <div key={p.id} className="grid grid-cols-[1fr_70px_70px_70px_90px_80px_80px] items-center gap-2 px-5 py-2.5 text-[13px] transition-colors hover-neo-inset">
                    <span className="min-w-0">
                      <span className="flex flex-wrap items-center gap-1.5">
                        <span className="truncate font-medium text-neo-ink">{p.name}</span>
                        {p.pnl_pct <= -10 && <span className="rounded bg-[var(--neo-down-soft)] px-1.5 py-0.5 text-[10px] text-neo-down">止损</span>}
                        {p.pnl_pct >= 20 && <span className="rounded bg-[var(--neo-up-soft)] px-1.5 py-0.5 text-[10px] text-neo-up">止盈</span>}
                      </span>
                      <span className="block text-[10px] text-neo-dim">{p.code}</span>
                    </span>
                    <span className="text-right text-neo-mid" style={{ fontFamily: "var(--font-inter), system-ui" }}>{p.shares}</span>
                    <span className="text-right text-neo-mid" style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatPrice(p.cost)}</span>
                    <span className="text-right text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatPrice(p.current)}</span>
                    <span className="text-right text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatAmount(p.market_value)}</span>
                    <span className={`text-right ${p.pnl >= 0 ? "text-neo-up" : "text-neo-down"}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                      {formatAmount(p.pnl)}<span className="ml-1 text-[10px]">{formatPct(p.pnl_pct)}</span>
                    </span>
                    <span className="flex items-center justify-end gap-2">
                      <button onClick={() => editPosition(p)} disabled={mutating} className="text-[11px] text-neo-primary">编辑</button>
                      <button onClick={() => removePosition(p.id)} disabled={mutating} className="text-[11px] text-neo-dim transition-colors hover:text-neo-down disabled:opacity-50">删除</button>
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </>
          )}
        </div>

        <div className="neo-card p-5">
          <h2 className="text-[14px] font-semibold text-neo-ink">仓位占比</h2>
          {positions.length === 0 ? (
            <div className="py-8 text-center text-[12px] text-neo-dim">暂无仓位</div>
          ) : (
            <div className="mt-3 space-y-3">
              {positions.map((p) => {
                const pct = totalValue > 0 ? (p.market_value / totalValue) * 100 : 0;
                return (
                  <div key={p.id}>
                    <div className="flex items-center justify-between text-[12px]">
                      <span className="truncate font-medium text-neo-ink">{p.name}</span>
                      <span className="text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>{pct.toFixed(1)}%</span>
                    </div>
                    <div className="neo-inset mt-1 h-1.5 overflow-hidden rounded-full">
                      <div className={`h-full rounded-full ${p.pnl >= 0 ? "bg-neo-up" : "bg-neo-down"}`} style={{ width: `${Math.min(pct, 100)}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      <section className="neo-card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[14px] font-semibold text-neo-ink">交易流水</h2>
          <div className="flex items-center gap-2">
            {editingTx && <span className="text-[11px] text-neo-primary">正在编辑 {editingTx.name}</span>}
            <button onClick={exportTxCsv} className="neo-chip px-2.5 py-1 text-[11px] text-neo-primary">导出 CSV</button>
          </div>
        </div>
        <form onSubmit={addTransaction} className="mt-3 grid grid-cols-2 gap-2 lg:grid-cols-8">
          <select value={txType} onChange={(e) => setTxType(e.target.value as "buy" | "sell" | "dividend")} className="neo-input rounded-md px-3 py-2 text-[12px]">
            {TX_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
          </select>
          <input value={txCode} onChange={(e) => setTxCode(e.target.value)} placeholder="代码" className="neo-input rounded-md px-3 py-2 text-[12px]" />
          <input value={txName} onChange={(e) => setTxName(e.target.value)} placeholder="名称（可选）" className="neo-input rounded-md px-3 py-2 text-[12px]" />
          <input type="number" min="0" step="1" value={txShares} onChange={(e) => setTxShares(e.target.value)} placeholder="股数" className="neo-input rounded-md px-3 py-2 text-[12px]" />
          <input type="number" min="0" step="0.01" value={txPrice} onChange={(e) => setTxPrice(e.target.value)} placeholder="价格" className="neo-input rounded-md px-3 py-2 text-[12px]" />
          <input type="date" value={txDate} onChange={(e) => setTxDate(e.target.value)} className="neo-input rounded-md px-3 py-2 text-[12px]" />
          <input value={txNote} onChange={(e) => setTxNote(e.target.value)} placeholder="备注（可选）" className="neo-input col-span-2 rounded-md px-3 py-2 text-[12px] lg:col-span-1" />
          <button type="submit" disabled={mutating} className="neo-btn-primary col-span-2 rounded-md px-4 py-2 text-[12px] font-medium disabled:opacity-60 lg:col-span-1">
            {mutating ? "保存中…" : editingTx ? "保存修改" : "记一笔"}
          </button>
          {editingTx && (
            <button type="button" onClick={cancelEditTransaction} className="neo-btn col-span-2 rounded-md px-4 py-2 text-[12px] lg:col-span-1">取消</button>
          )}
        </form>
        {transactions.length === 0 ? (
          <div className="mt-4">
            <EmptyState title="暂无交易流水" description="记录买入、卖出或分红后自动更新持仓" />
          </div>
        ) : (
          <div className="mt-3 divide-y divide-[var(--neo-edge)]">
            {transactions.map((tx) => (
              <div key={tx.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 px-1 py-2.5 text-[12px]">
                <span className={`w-10 font-semibold ${TX_TYPE_CLASS[tx.type] || "text-neo-mid"}`}>{TX_TYPE_TEXT[tx.type] || tx.type}</span>
                <span className="font-medium text-neo-ink">{tx.name}</span>
                <span className="text-[10px] text-neo-dim">{tx.code}</span>
                <span className="text-neo-mid" style={{ fontFamily: "var(--font-inter), system-ui" }}>{tx.shares} 股 × {formatPrice(tx.price)}</span>
                <span className="text-neo-dim">{tx.date}</span>
                {tx.note && <span className="truncate text-neo-dim">{tx.note}</span>}
                <span className="ml-auto flex items-center gap-2">
                  <button onClick={() => editTransaction(tx)} disabled={mutating} className="text-[11px] text-neo-primary disabled:opacity-50">编辑</button>
                  <button onClick={() => removeTransaction(tx)} disabled={mutating} className="text-[11px] text-neo-dim transition-colors hover:text-neo-down disabled:opacity-50">删除</button>
                </span>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
