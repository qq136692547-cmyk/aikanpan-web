"use client";

import { useMemo } from "react";
import type { LimitStock } from "@/lib/api";
import { formatPct, formatPrice } from "@/lib/format";
import { useLimitPersonalization } from "@/lib/use-limit-personal";

function tagLabel(tag: string): string {
  const map: Record<string, string> = {
    limit30: "30cm",
    limit20: "20cm",
    limit10: "10cm",
    st: "ST",
  };
  return map[tag] || tag;
}

export function HomeLimitTopList({ stocks }: { stocks: LimitStock[] }) {
  const { badges } = useLimitPersonalization();
  const ordered = useMemo(() => {
    return [...stocks].sort((a, b) => {
      const aMine = badges(a.code).length > 0 ? 1 : 0;
      const bMine = badges(b.code).length > 0 ? 1 : 0;
      return bMine - aMine;
    });
  }, [stocks, badges]);

  return (
    <div>
      {ordered.map((s, i) => (
        <a
          key={s.code}
          href={`/stock/${s.code.replace(/\./, "")}/`}
          className="grid grid-cols-[32px_1fr_1fr_1fr] items-center gap-2 px-5 py-2 text-[13px] transition-colors hover-neo-inset"
        >
          <span className="text-[11px] text-neo-dim" style={{ fontFamily: "var(--font-inter), system-ui" }}>
            {String(i + 1).padStart(2, "0")}
          </span>
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="truncate font-medium text-neo-ink">{s.name}</span>
            {badges(s.code).map((b) => (
              <span
                key={b}
                className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold ${
                  b === "持仓"
                    ? "bg-[var(--neo-amber)]/15 text-[var(--neo-amber)]"
                    : "bg-[var(--neo-primary)]/15 text-[var(--neo-primary)]"
                }`}
              >
                {b}
              </span>
            ))}
            <span className="text-[10px] text-neo-dim">{s.code}</span>
          </div>
          <span style={{ fontFamily: "var(--font-inter), system-ui" }} className="text-right text-neo-mid">
            {formatPrice(s.price)}
          </span>
          <span className="flex items-center justify-end gap-1.5">
            <span style={{ fontFamily: "var(--font-inter), system-ui" }} className="text-[13px] font-semibold text-neo-up">
              {formatPct(s.pct)}
            </span>
            <span className="neo-chip px-1.5 py-0.5 text-[10px] text-neo-mid">{tagLabel(s.tag)}</span>
          </span>
        </a>
      ))}
    </div>
  );
}
