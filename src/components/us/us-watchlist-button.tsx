"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";

export function UsWatchlistButton({ code, name }: { code: string; name?: string }) {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    api
      .getUsWatchlist()
      .then((d) => setState(d.watchlist.some((w) => w.code === code) ? "in" : "out"))
      .catch(() => setState("out"));
  }, [code]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle() {
    if (busy) return;
    setBusy(true);
    try {
      if (state === "in") {
        await api.removeUsWatchlist(code);
        setState("out");
      } else {
        await api.addUsWatchlist(code, name);
        setState("in");
      }
    } catch {
      // keep current state
    } finally {
      setBusy(false);
    }
  }

  if (state === "loading") {
    return <span className="neo-chip px-2 py-1 text-[10px] text-neo-dim">…</span>;
  }

  return (
    <button
      onClick={toggle}
      disabled={busy}
      className={`neo-chip shrink-0 px-2 py-1 text-[10px] transition-colors ${
        state === "in" ? "text-neo-primary" : "text-neo-dim hover:text-neo-primary"
      } disabled:opacity-60`}
    >
      {state === "in" ? "已加自选" : "加自选"}
    </button>
  );
}
