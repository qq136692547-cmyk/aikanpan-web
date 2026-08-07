"use client";

import { useState } from "react";
import { Star } from "lucide-react";
import { useWatchlist } from "@/lib/use-watchlist";

export function WatchlistButton({ code, name }: { code: string; name: string }) {
  const { inWatchlist, toggle } = useWatchlist();
  const [busy, setBusy] = useState(false);
  const active = inWatchlist(code);

  async function handleClick() {
    if (busy) return;
    setBusy(true);
    try {
      await toggle(code, name);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={handleClick}
      disabled={busy}
      aria-pressed={active}
      aria-label={active ? `从自选移除 ${name}` : `添加 ${name} 到自选`}
      title={active ? "从自选移除" : "添加自选"}
      className={`neo-chip flex items-center gap-1.5 px-3 py-1.5 text-[12px] font-medium disabled:opacity-60 ${
        active ? "text-[var(--neo-amber)]" : "text-neo-primary"
      }`}
    >
      <Star size={14} fill={active ? "currentColor" : "none"} />
      {active ? "已自选" : "加自选"}
    </button>
  );
}
