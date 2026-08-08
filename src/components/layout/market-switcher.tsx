"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { MARKET_OPTIONS, marketFromSearchParams, type MarketScope } from "@/lib/market";

export function MarketSwitcher() {
  const pathname = usePathname();
  const router = useRouter();
  const sp = useSearchParams();
  const current = marketFromSearchParams(sp?.get("market"));

  function select(value: MarketScope) {
    const params = new URLSearchParams(sp?.toString() || "");
    if (value === "all") params.delete("market");
    else params.set("market", value);
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  return (
    <div className="flex items-center gap-1 rounded-full neo-inset p-0.5" role="tablist" aria-label="市场筛选">
      {MARKET_OPTIONS.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="tab"
          aria-selected={current === opt.value}
          onClick={() => select(opt.value)}
          className={`rounded-full px-2.5 py-1 text-[11px] font-medium transition-all ${
            current === opt.value ? "neo-chip-active" : "text-neo-dim"
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  );
}
