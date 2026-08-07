"use client";
import { useState, useMemo } from "react";
import type { Sector } from "@/lib/api";
import { formatPct, formatPrice } from "@/lib/format";

type SortKey = "name" | "price" | "change_pct" | "change" | "turnover_rate";
type SortDir = "asc" | "desc";

export function SortableSectorTable({ sectors }: { sectors: Sector[] }) {
  const [sortKey, setSortKey] = useState<SortKey>("change_pct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const sorted = useMemo(() => {
    const arr = [...sectors];
    arr.sort((a, b) => {
      let av: string | number = a[sortKey];
      let bv: string | number = b[sortKey];
      if (typeof av === "string" && typeof bv === "string") {
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      }
      return sortDir === "asc" ? (av as number) - (bv as number) : (bv as number) - (av as number);
    });
    return arr;
  }, [sectors, sortKey, sortDir]);

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const SortHeader = ({ label, keyName, align = "left" }: { label: string; keyName: SortKey; align?: "left" | "right" }) => (
    <th
      className={`px-4 py-3 text-[11px] uppercase tracking-wide font-medium cursor-pointer select-none transition-colors hover:text-neo-primary ${
        align === "right" ? "text-right" : "text-left"
      } ${sortKey === keyName ? "text-neo-primary" : "text-neo-dim"}`}
      onClick={() => toggleSort(keyName)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === keyName && <span className="text-[8px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </span>
    </th>
  );

  return (
    <div className="neo-card-sm overflow-hidden">
      <div className="overflow-x-auto neo-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--neo-surface-active)]">
              <SortHeader label="板块名称" keyName="name" />
              <SortHeader label="最新价" keyName="price" align="right" />
              <SortHeader label="涨跌幅" keyName="change_pct" align="right" />
              <SortHeader label="涨跌额" keyName="change" align="right" />
              <SortHeader label="换手率" keyName="turnover_rate" align="right" />
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr
                key={s.code}
                className={`transition-colors hover-neo-inset ${i < sorted.length - 1 ? "border-b border-[var(--neo-surface-inset)]" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <span className="text-[13px] font-medium text-neo-ink">{s.name}</span>
<span className="ml-2 text-[10px] text-neo-mid" style={{ fontFamily: 'var(--font-inter), system-ui' }}>{s.code}</span>
                </td>
                <td className="px-4 py-2.5 text-right text-[13px] text-neo-mid" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                  {formatPrice(s.price)}
                </td>
                <td className={`px-4 py-2.5 text-right text-[13px] font-semibold ${s.change_pct > 0 ? "text-neo-up" : s.change_pct < 0 ? "text-neo-down" : "text-neo-mid"}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                  {formatPct(s.change_pct)}
                </td>
                <td className={`px-4 py-2.5 text-right text-[12px] ${s.change > 0 ? "text-neo-up" : s.change < 0 ? "text-neo-down" : "text-neo-mid"}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                  {s.change > 0 ? "+" : ""}{s.change.toFixed(2)}
                </td>
                <td className="px-4 py-2.5 text-right text-[12px] text-neo-dim" style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                  {s.turnover_rate.toFixed(2)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
