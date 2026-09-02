"use client";

import { useState } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { EmptyState, ErrorState } from "@/components/ui/state";

function fieldLabel(field: string): string {
  if (field === "price") return "价格";
  if (field === "change_pct") return "涨跌幅";
  if (field === "volume") return "成交量";
  return field;
}

function conditionLabel(cond: string): string {
  const map: Record<string, string> = {
    above: "涨到",
    below: "跌破",
    change_up: "涨幅达",
    change_down: "跌幅达",
    change_above: "涨幅达",
    change_below: "跌幅达",
  };
  return map[cond] || cond;
}

export function AlertList({ refreshKey }: { refreshKey?: number }) {
  const [deleting, setDeleting] = useState<string | null>(null);
  const { data, error, isLoading, mutate } = useSWR(["alerts", refreshKey ?? 0], () => api.getAlerts());

  const alerts = data?.alerts || [];

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api.deleteAlert(id);
      mutate((prev) =>
        prev ? { ...prev, alerts: prev.alerts.filter((a) => a.id !== id), count: Math.max(0, prev.count - 1) } : prev
      );
    } catch {
      // keep list unchanged
    } finally {
      setDeleting(null);
    }
  }

  if (isLoading) {
    return (
      <div className="neo-card-sm p-5">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="neo-skeleton h-12 rounded" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorState title="盯盘数据加载失败" description="请检查网络后重试" onRetry={() => mutate()} />;
  }

  if (alerts.length === 0) {
    return <EmptyState title="暂无盯盘任务" description="在上方输入自然语言，或手动组合价格/涨跌幅/成交量条件" />;
  }

  return (
    <div className="neo-card-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-neo-ink">盯盘任务</h3>
          <span className="text-[10px] font-medium text-neo-dim">实时</span>
        </div>
        <span className="text-xs text-neo-dim">共 {alerts.length} 个</span>
      </div>
      <div className="divide-y divide-[var(--neo-edge)]">
        {alerts.map((alert) => {
          const isActive = alert.active !== false && !alert.triggered_at;
          const isTriggered = !!alert.triggered_at;
          const stockHref = `/stock/${alert.code.replace(/\./, "")}/`;
          return (
            <div key={alert.id} className="transition-colors hover-neo-inset flex items-center gap-4 px-4 py-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a href={stockHref} className="truncate text-sm font-medium text-neo-ink hover:text-neo-primary">{alert.name}</a>
                  <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-[10px] text-neo-dim">{alert.code}</span>
                  <StatusBadge active={isActive} triggered={isTriggered} />
                </div>
                <div className="mt-0.5 text-xs text-neo-mid">
                  {alert.conditions?.length
                    ? alert.conditions.map((c) => `${fieldLabel(c.field)} ${c.op === "above" ? "≥" : "≤"} ${c.threshold}`).join(" 且 ")
                    : `${conditionLabel(alert.condition)} ${alert.threshold}`}
                  {alert.note && <span className="ml-2 text-neo-dim">— {alert.note}</span>}
                </div>
                <div className="mt-0.5 flex items-center gap-2 text-[10px] text-neo-dim">
                  <span>创建: {alert.created_at}</span>
                  {alert.last_check && <span>· 最后检查: {alert.last_check}</span>}
                  {alert.triggered_at && <span className="text-neo-down">· 触发: {alert.triggered_at}</span>}
                </div>
              </div>
              <button
                onClick={() => handleDelete(alert.id)}
                disabled={deleting === alert.id}
                className="shrink-0 rounded-md px-2 py-1 text-xs text-neo-dim transition-colors hover:text-neo-down disabled:opacity-40"
              >
                {deleting === alert.id ? "删除中…" : "删除"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function StatusBadge({ active, triggered }: { active: boolean; triggered: boolean }) {
  if (triggered) return <span className="rounded px-1.5 py-0.5 text-[10px] font-medium neo-down-soft text-neo-down">已触发</span>;
  if (active) return <span className="rounded px-1.5 py-0.5 text-[10px] font-medium neo-up-soft text-neo-up">运行中</span>;
  return <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--neo-surface-inset)] text-neo-dim">已禁用</span>;
}
