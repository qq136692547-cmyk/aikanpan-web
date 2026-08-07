"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";
import { api, type AlertItem } from "@/lib/api";
import { EmptyState, ErrorState } from "@/components/ui/state";

function fieldLabel(field: string): string {
  if (field === "price") return "价格";
  if (field === "change_pct") return "涨跌幅";
  if (field === "volume") return "成交量";
  return field;
}

function conditionText(alert: AlertItem): string {
  if (alert.conditions && alert.conditions.length > 0) {
    return alert.conditions
      .map((c) => `${fieldLabel(c.field)} ${c.op === "above" ? "≥" : "≤"} ${c.threshold}`)
      .join(" 且 ");
  }
  return `${conditionLabel(alert.condition)} ${alert.threshold}`;
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

export function AlertManager() {
  const [deleting, setDeleting] = useState<string | null>(null);
  const { data: alertData, error, isLoading, mutate } = useSWR("alerts", () => api.getAlerts());
  const { data: historyData } = useSWR("alert-history", () =>
    api.getAlertHistory().catch(() => ({ alerts: [], count: 0 }))
  );
  const { data: settings } = useSWR("alert-settings", () => api.getAlertSettings(), { refreshInterval: 30000 });

  const alerts = alertData?.alerts || [];
  const history = historyData?.alerts || [];
  const seenHistory = useRef<Set<string>>(new Set());
  const historyInitialized = useRef(false);

  useEffect(() => {
    if (!historyInitialized.current) {
      for (const h of history) seenHistory.current.add(h.id);
      historyInitialized.current = true;
      return;
    }
    if (!settings?.browser_enabled) return;
    for (const h of history) {
      if (seenHistory.current.has(h.id)) continue;
      seenHistory.current.add(h.id);
      if (typeof window !== "undefined" && "Notification" in window && Notification.permission === "granted") {
        new Notification(`盯盘提醒：${h.name}`, {
          body: `${h.code} ${h.conditions?.length ? "多条件" : h.condition} ${h.threshold}，最新价 ${h.last_value ?? h.price_at_trigger ?? "-"}`, 
        });
      }
    }
  }, [history, settings?.browser_enabled]);

  async function handleDelete(id: string) {
    setDeleting(id);
    try {
      await api.deleteAlert(id);
      mutate((prev) =>
        prev ? { ...prev, alerts: prev.alerts.filter((a) => a.id !== id), count: Math.max(0, prev.count - 1) } : prev
      );
    } catch (e: any) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  }

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="neo-skeleton h-16 rounded-lg" />
        ))}
      </div>
    );
  }

    return <ErrorState title="盯盘数据加载失败" description="请检查网络后重试" onRetry={() => mutate()} />;

  return (
    <div className="space-y-4">
      <div>
        <div className="mb-3 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neo-primary pulse-dot" />
          <h3 className="text-sm font-semibold text-neo-ink">盯盘任务</h3>
          {alerts.length > 0 && <span className="text-xs text-neo-dim">({alerts.length})</span>}
        </div>
        {alerts.length === 0 ? (
          <EmptyState title="暂无盯盘任务" description="在上方输入自然语言，或手动组合价格/涨跌幅/成交量条件" />
        ) : (
          <div className="neo-card-sm overflow-hidden">
            <div className="divide-y divide-[var(--neo-edge)]">
              {alerts.map((alert) => {
                const isActive = alert.active !== false && !alert.triggered_at;
                const isTriggered = !!alert.triggered_at;
                const stockHref = `/stock/${alert.code.replace(/\./, "")}/`;
                return (
                  <div key={alert.id} className="transition-colors hover-neo-inset flex items-center gap-4 px-4 py-3">
                    <div className={`h-2 w-2 shrink-0 rounded-full ${isTriggered ? "bg-neo-down" : isActive ? "bg-neo-up pulse-dot" : "bg-neo-dim"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a href={stockHref} className="truncate text-sm font-medium text-neo-ink hover:text-neo-primary">
                          {alert.name}
                        </a>
                        <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-[10px] text-neo-dim">{alert.code}</span>
                        <StatusBadge active={isActive} triggered={isTriggered} />
                      </div>
                      <div className="mt-0.5 text-xs text-neo-mid">
                        {conditionText(alert)}
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
        )}
      </div>

      {history.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-neo-down" />
            <h3 className="text-sm font-semibold text-neo-ink">触发历史</h3>
            <span className="text-xs text-neo-dim">({history.length})</span>
          </div>
          <div className="neo-card-sm overflow-hidden">
            <div className="divide-y divide-[var(--neo-edge)]">
              {history.map((h) => {
                const stockHref = `/stock/${h.code.replace(/\./, "")}/`;
                return (
                  <div key={h.id} className="transition-colors hover-neo-inset flex items-center gap-4 px-4 py-3">
                    <div className="h-2 w-2 shrink-0 rounded-full bg-neo-down" />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a href={stockHref} className="truncate text-sm font-medium text-neo-ink hover:text-neo-primary">
                          {h.name}
                        </a>
                        <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-[10px] text-neo-dim">{h.code}</span>
                      </div>
                      <div className="mt-0.5 text-xs text-neo-mid">
                        {h.conditions?.length
                          ? h.conditions.map((c) => `${fieldLabel(c.field)} ${c.op === "above" ? "≥" : "≤"} ${c.threshold}`).join(" 且 ")
                          : `${conditionLabel(h.condition)} ${h.threshold}`}
                        <span className="ml-2 text-neo-dim">触发价: <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-neo-down">{(h.last_value ?? h.price_at_trigger ?? 0).toFixed(2)}</span></span>
                      </div>
                    </div>
                    <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="shrink-0 text-[10px] text-neo-dim">{h.triggered_at}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <section className="neo-card mt-4 grid grid-cols-1 gap-2 p-4 sm:grid-cols-3">
        <div className="neo-inset p-4">
          <h3 className="text-[12px] font-medium text-neo-ink">自然语言创建</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-neo-mid">输入「茅台跌破1500」，AI 自动解析股票代码、条件和阈值</p>
        </div>
        <div className="neo-inset p-4">
          <h3 className="text-[12px] font-medium text-neo-ink">实时监控</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-neo-mid">后台持续轮询行情数据，条件满足时立即触发通知</p>
        </div>
        <div className="neo-inset p-4">
          <h3 className="text-[12px] font-medium text-neo-ink">多渠道提醒</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-neo-mid">支持微信订阅消息推送，触发记录可追溯</p>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ active, triggered }: { active: boolean; triggered: boolean }) {
  if (triggered) {
    return <span className="rounded px-1.5 py-0.5 text-[10px] font-medium neo-down-soft text-neo-down">已触发</span>;
  }
  if (active) {
    return <span className="rounded px-1.5 py-0.5 text-[10px] font-medium neo-up-soft text-neo-up">运行中</span>;
  }
  return <span className="rounded px-1.5 py-0.5 text-[10px] font-medium bg-[var(--neo-surface-inset)] text-neo-dim">已禁用</span>;
}
