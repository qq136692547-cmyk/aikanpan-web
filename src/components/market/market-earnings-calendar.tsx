"use client";

import { useEffect, useState } from "react";
import { api, type UsEarningsCalendarItem } from "@/lib/api";

type EarningsCalendarItem = UsEarningsCalendarItem & {
  upcoming?: {
    date?: string;
    label?: string;
    eps_estimate?: number;
    revenue_estimate?: number;
  } | null;
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://aikanpan.top/api/v1";

export function MarketEarningsCalendar({ market }: { market: "cn" | "us" }) {
  const [items, setItems] = useState<EarningsCalendarItem[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        if (market === "cn") {
          const res = await fetch(`${API_BASE}/cn/earnings-calendar`, { cache: "no-store" });
          if (!res.ok) throw new Error(`earnings ${res.status}`);
          const data = (await res.json()) as { calendar?: EarningsCalendarItem[] };
          if (!cancelled) setItems(data.calendar || []);
        } else {
          const data = await api.getUsEarningsCalendar();
          if (!cancelled) setItems(data.calendar || []);
        }
      } catch {
        if (!cancelled) setItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [market]);

  return (
    <div className="neo-card p-4">
      {loading && !items ? (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="neo-skeleton h-20" />
          ))}
        </div>
      ) : !items?.length ? (
        <p className="text-[12px] text-neo-mid">暂无近期财报</p>
      ) : (
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {items.slice(0, 8).map((item) => (
            <a
              key={item.symbol}
              href={market === "cn" ? `/stock/${item.symbol.replace(/\./, "")}/` : `/stock/${item.symbol}/`}
              className="neo-card-sm p-3 transition-all duration-200 hover:-translate-y-0.5"
            >
              <div className="truncate text-[13px] font-semibold text-neo-ink">{item.name || item.symbol}</div>
              <div className="mt-0.5 text-[11px] text-neo-mid">{item.upcoming?.date || "待定"}</div>
              {item.upcoming?.label && <div className="text-[10px] text-neo-dim">{item.upcoming.label}</div>}
              {item.upcoming?.eps_estimate != null && (
                <div className="text-[10px] text-neo-dim">EPS 预估 ${item.upcoming.eps_estimate.toFixed(2)}</div>
              )}
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
