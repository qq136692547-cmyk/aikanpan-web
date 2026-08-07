"use client";

import useSWR from "swr";
import { api } from "@/lib/api";

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

export function AlertHistory() {
  const { data } = useSWR("alert-history", () =>
    api.getAlertHistory().catch(() => ({ alerts: [], count: 0 }))
  );
  const history = data?.alerts || [];

  if (history.length === 0) return null;

  return (
    <div className="neo-card-sm overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-neo-down" />
          <h3 className="text-sm font-semibold text-neo-ink">触发历史</h3>
        </div>
        <span className="text-xs text-neo-dim">共 {history.length} 条</span>
      </div>
      <div className="divide-y divide-[var(--neo-edge)]">
        {history.map((h) => {
          const stockHref = `/stock/${h.code.replace(/\./, "")}/`;
          return (
            <div key={h.id} className="transition-colors hover-neo-inset flex items-center gap-4 px-4 py-3">
              <div className="h-2 w-2 shrink-0 rounded-full bg-neo-down" />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <a href={stockHref} className="truncate text-sm font-medium text-neo-ink hover:text-neo-primary">{h.name}</a>
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
  );
}
