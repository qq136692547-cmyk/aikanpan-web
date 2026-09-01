"use client";

import { useMemo, useState } from "react";
import { formatPct, formatPrice } from "@/lib/format";

export type MarketSectorRow = {
  code: string;
  name?: string;
  price: number;
  change: number;
  change_pct: number;
  turnover_rate?: number;
};

type SortKey = "name" | "price" | "change_pct" | "change" | "turnover_rate";
type SortDir = "asc" | "desc";

function SortHeader({
  label,
  keyName,
  align = "left",
  sortKey,
  sortDir,
  onSort,
}: {
  label: string;
  keyName: SortKey;
  align?: "left" | "right";
  sortKey: SortKey;
  sortDir: SortDir;
  onSort: (key: SortKey) => void;
}) {
  return (
    <th
      className={`px-4 py-3 text-[11px] uppercase tracking-wide font-medium cursor-pointer select-none transition-colors hover:text-neo-primary ${
        align === "right" ? "text-right" : "text-left"
      } ${sortKey === keyName ? "text-neo-primary" : "text-neo-dim"}`}
      onClick={() => onSort(keyName)}
    >
      <span className="inline-flex items-center gap-1">
        {label}
        {sortKey === keyName && <span className="text-[8px]">{sortDir === "asc" ? "▲" : "▼"}</span>}
      </span>
    </th>
  );
}

export function SortableSectorTable({
  sectors,
  showTurnover = true,
}: {
  sectors: MarketSectorRow[];
  showTurnover?: boolean;
}) {
  const [sortKey, setSortKey] = useState<SortKey>("change_pct");
  const [sortDir, setSortDir] = useState<SortDir>("desc");
  const hasTurnover = showTurnover && sectors.some((s) => typeof s.turnover_rate === "number");

  const sorted = useMemo(() => {
    const arr = [...sectors];
    arr.sort((a, b) => {
      const av = a[sortKey] ?? (sortKey === "name" ? "" : 0);
      const bv = b[sortKey] ?? (sortKey === "name" ? "" : 0);
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

  return (
    <div className="neo-card-sm overflow-hidden">
      <div className="overflow-x-auto neo-scrollbar">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--neo-surface-active)]">
              <SortHeader label="板块名称" keyName="name" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label="最新价" keyName="price" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label="涨跌幅" keyName="change_pct" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              <SortHeader label="涨跌额" keyName="change" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              {hasTurnover && (
                <SortHeader label="换手率" keyName="turnover_rate" align="right" sortKey={sortKey} sortDir={sortDir} onSort={toggleSort} />
              )}
            </tr>
          </thead>
          <tbody>
            {sorted.map((s, i) => (
              <tr
                key={s.code}
                className={`transition-colors hover-neo-inset ${i < sorted.length - 1 ? "border-b border-[var(--neo-surface-inset)]" : ""}`}
              >
                <td className="px-4 py-2.5">
                  <span className="text-[13px] font-medium text-neo-ink">{s.name ?? s.code}</span>
                  <span className="ml-2 text-[10px] text-neo-mid" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                    {s.code}
                  </span>
                </td>
                <td className="px-4 py-2.5 text-right text-[13px] text-neo-mid" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                  {formatPrice(s.price)}
                </td>
                <td
                  className={`px-4 py-2.5 text-right text-[13px] font-semibold ${
                    s.change_pct > 0 ? "text-neo-up" : s.change_pct < 0 ? "text-neo-down" : "text-neo-mid"
                  }`}
                  style={{ fontFamily: "var(--font-inter), system-ui" }}
                >
                  {formatPct(s.change_pct)}
                </td>
                <td
                  className={`px-4 py-2.5 text-right text-[12px] ${
                    s.change > 0 ? "text-neo-up" : s.change < 0 ? "text-neo-down" : "text-neo-mid"
                  }`}
                  style={{ fontFamily: "var(--font-inter), system-ui" }}
                >
                  {s.change > 0 ? "+" : ""}
                  {s.change.toFixed(2)}
                </td>
                {hasTurnover && (
                  <td className="px-4 py-2.5 text-right text-[12px] text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                    {(s.turnover_rate ?? 0).toFixed(2)}%
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
