"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import useSWR from "swr";
import { api, type AlertItem } from "@/lib/api";
import { type MarketScope } from "@/lib/market";
import { useAuth } from "@/lib/auth";
import { EmptyState, ErrorState } from "@/components/ui/state";
import { AuthRetryNotice } from "@/components/system/auth-retry-notice";

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

function stockHrefFor(item: { code: string; market?: string }): string {
  if (item.market === "hk") return `/stock/${item.code.replace(/\.HK$/i, "").padStart(5, "0")}/`;
  return item.market === "us" ? `/stock/${item.code}/` : `/stock/${item.code.replace(/\./, "")}/`;
}

export function AlertManager({ market = "all" }: { market?: MarketScope }) {
  const activeMarket: "cn" | "hk" | "us" | undefined = market === "us" ? "us" : market === "hk" ? "hk" : market === "cn" ? "cn" : undefined;
  const marketLabel = market === "us" ? "美股" : market === "hk" ? "港股" : market === "cn" ? "A股" : "";
  const { user, loading: authLoading, retry: retryAuth } = useAuth();
  const ready = !authLoading && !!user;
  /** 游客登录失败：ready 会永久为 false，必须给出重试入口，否则列表永远空白且无出路 */
  const authFailed = !authLoading && !user;
  const [deleting, setDeleting] = useState<string | null>(null);
  // SWR key 保持 `ready && user`：失败态 key 为 null 是**正确**行为（不该匿名请求）；
  // 重试成功后 ready 变 true，key 从 null 变为数组，SWR 立即发起首次请求 ——
  // 既不会重复请求，也不会永远不请求。别把这里的判定改成只看 authLoading。
  const { data: alertData, error, isLoading, mutate } = useSWR(
    ready && user ? ["alerts", market, user.user_id] : null,
    () => api.getAlerts(activeMarket),
    { refreshInterval: 15000 }
  );
  const { data: historyData, error: historyError, mutate: mutateHistory } = useSWR(
    ready && user ? ["alert-history", market, user.user_id] : null,
    () => api.getAlertHistory(activeMarket),
    { refreshInterval: 15000 }
  );
  const { data: settings } = useSWR(ready && user ? ["alert-settings", user.user_id] : null, () => api.getAlertSettings(), { refreshInterval: 30000 });
  const { data: unreadData, mutate: mutateUnread } = useSWR(
    ready && user ? ["alert-unread", user.user_id] : null,
    () => api.getAlertUnreadCount(),
    { refreshInterval: 30000 }
  );
  const unreadCount = unreadData?.count || 0;

  const alerts = alertData?.alerts || [];
  const history = useMemo(() => historyData?.alerts || [], [historyData]);
  const seenHistory = useRef<Set<string>>(new Set());
  const historyInitialized = useRef(false);

  useEffect(() => {
    const handler = () => {
      mutate();
      mutateHistory();
    };
    window.addEventListener("alerts-refresh", handler);
    return () => window.removeEventListener("alerts-refresh", handler);
  }, [mutate, mutateHistory]);

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
          body: `${h.code} ${h.conditions?.length ? "多条件" : h.condition} ${h.threshold}，最新价 ${h.last_value ?? h.price_at_trigger ?? "-"}${h.market === "us" ? " USD" : h.market === "hk" ? " HKD" : ""}`,
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
    } catch (e: unknown) {
      console.error(e);
    } finally {
      setDeleting(null);
    }
  }

  async function handleMarkAllRead() {
    try {
      await api.markAllAlertsRead();
      await mutateUnread();
      mutateHistory();
    } catch (e: unknown) {
      console.error(e);
    }
  }

  // 「加载中」与「初始化失败」必须分开判：合并会让失败态停在骨架屏上，
  // 用户看不到重试入口；反过来把加载中当失败，重试成功后会立刻又弹一次提示。
  if (authLoading || isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div key={i} className="neo-skeleton h-16 rounded-lg" />
        ))}
      </div>
    );
  }

  if (authFailed) {
    return <AuthRetryNotice onRetry={retryAuth} />;
  }

  if (error) {
    return (
      <ErrorState
        title="盯盘数据加载失败"
        description="点「重新加载」再加载一次，已创建的盯盘任务不会丢"
        onRetry={() => mutate()}
      />
    );
  }

  return (
    <div className="space-y-4">
      {unreadCount > 0 && (
        <div className="neo-card-sm flex flex-wrap items-center justify-between gap-2 border border-rose-200/60 bg-rose-50/60 px-4 py-3">
          <span className="text-xs font-medium text-rose-600">你有 {unreadCount} 条新的盯盘触发记录</span>
          <button
            onClick={handleMarkAllRead}
            className="inline-flex min-h-11 items-center rounded-md px-2 py-1 text-xs font-medium text-rose-600 hover:text-rose-700"
          >
            全部标记已读
          </button>
        </div>
      )}
      <div>
        <div className="mb-3 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-neo-ink">盯盘任务{marketLabel ? ` · ${marketLabel}` : ""}</h3>
          <span className="text-[10px] font-medium text-neo-dim">服务端监控中</span>
          {alerts.length > 0 && <span className="text-xs text-neo-dim">({alerts.length})</span>}
        </div>
        {alerts.length === 0 ? (
          <EmptyState title="暂无盯盘任务" description="在上方输入自然语言，或手动组合价格/涨跌幅/成交量条件" />
        ) : (
          <div className="neo-card overflow-hidden rounded-2xl">
            <div className="divide-y divide-[var(--neo-edge)]">
              {alerts.map((alert) => {
                const isActive = alert.active !== false && !alert.triggered_at;
                const isTriggered = !!alert.triggered_at;
                const stockHref = stockHrefFor(alert);
                return (
                  <div key={alert.id} className="transition-colors hover-neo-inset flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a href={stockHref} className="truncate text-sm font-medium text-neo-ink hover:text-neo-primary">
                          {alert.name}
                        </a>
                        <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-[10px] text-neo-dim">{alert.code}</span>
                        {market === "all" && <span className="rounded bg-[var(--neo-surface-inset)] px-1.5 py-0.5 text-[10px] text-neo-dim">{alert.market === "us" ? "美股" : alert.market === "hk" ? "港股" : "A股"}</span>}
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
                      className="min-h-11 shrink-0 rounded-md px-2 py-1 text-xs text-neo-dim transition-colors hover:text-neo-down disabled:opacity-40"
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

      {historyError && (
        <div className="neo-card-sm flex flex-wrap items-center justify-between gap-2 px-4 py-3">
          <span className="text-xs text-neo-down">触发历史加载失败</span>
          <button onClick={() => mutateHistory()} className="inline-flex min-h-11 items-center text-xs text-neo-primary">重试</button>
        </div>
      )}

      {history.length > 0 && (
        <div>
          <div className="mb-3 flex items-center gap-2">
            <h3 className="text-sm font-semibold text-neo-ink">触发历史{marketLabel ? ` · ${marketLabel}` : ""}</h3>
            <span className="text-xs text-neo-dim">({history.length})</span>
          </div>
          <div className="neo-card overflow-hidden rounded-2xl">
            <div className="divide-y divide-[var(--neo-edge)]">
              {history.map((h) => {
                const stockHref = stockHrefFor(h);
                return (
                  <div key={h.id} className="transition-colors hover-neo-inset flex items-center gap-4 px-4 py-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <a href={stockHref} className="truncate text-sm font-medium text-neo-ink hover:text-neo-primary">
                          {h.name}
                        </a>
                        <span style={{ fontFamily: 'var(--font-inter), system-ui' }} className="text-[10px] text-neo-dim">{h.code}</span>
                        {market === "all" && <span className="rounded bg-[var(--neo-surface-inset)] px-1.5 py-0.5 text-[10px] text-neo-dim">{h.market === "us" ? "美股" : h.market === "hk" ? "港股" : "A股"}</span>}
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
          <p className="mt-1 text-[11px] leading-relaxed text-neo-mid">{market === "us" ? "输入「苹果跌到180」，AI 自动解析股票代码、条件和阈值" : market === "hk" ? "输入「腾讯跌到400」，AI 自动解析股票代码、条件和阈值" : "输入「茅台跌破1500」，AI 自动解析股票代码、条件和阈值"}</p>
        </div>
        <div className="neo-inset p-4">
          <h3 className="text-[12px] font-medium text-neo-ink">服务端持续监控</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-neo-mid">服务端每 30 秒检查一次行情，关闭页面也照常运行；触发后可经邮件 / 短信触达</p>
        </div>
        <div className="neo-inset p-4">
          <h3 className="text-[12px] font-medium text-neo-ink">多渠道提醒</h3>
          <p className="mt-1 text-[11px] leading-relaxed text-neo-mid">绑定邮箱开启邮件、绑定手机号开启短信后，即使不在站内也能收到触发通知</p>
        </div>
      </section>
    </div>
  );
}

function StatusBadge({ active, triggered }: { active: boolean; triggered: boolean }) {
  if (triggered) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-rose-50 text-rose-600 border border-rose-200/60 shadow-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-rose-500" />
        已触发
      </span>
    );
  }
  if (active) {
    return (
      <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold bg-emerald-50 text-emerald-600 border border-emerald-200/60 shadow-xs">
        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
        监控中
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium bg-neo-bg-dim text-neo-dim border border-white/40">
      <span className="h-1.5 w-1.5 rounded-full bg-neo-dim/40" />
      已停用
    </span>
  );
}

