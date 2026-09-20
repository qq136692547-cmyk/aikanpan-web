"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

export function HkWatchlistButton({ code, name }: { code: string; name?: string }) {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  const [busy, setBusy] = useState(false);
  const { user, loading: authLoading } = useAuth();
  const ready = !authLoading && !!user;

  const load = useCallback(() => {
    if (!ready) return;
    api
      .getHkWatchlist()
      .then((d) => setState(d.watchlist.some((w) => w.code === code) ? "in" : "out"))
      .catch(() => setState("out"));
  }, [code, ready]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle() {
    if (busy || !ready) return;
    setBusy(true);
    try {
      if (state === "in") {
        await api.removeHkWatchlist(code);
        setState("out");
      } else {
        await api.addHkWatchlist(code, name);
        setState("in");
      }
    } catch {
      // keep current state
    } finally {
      setBusy(false);
    }
  }

  if (authLoading || (ready && state === "loading")) {
    return <span className="neo-chip px-2 py-1 text-[10px] text-neo-dim">…</span>;
  }

  if (!ready) {
    return <button type="button" disabled className="neo-chip shrink-0 px-2 py-1 text-[10px] text-neo-dim opacity-60">暂不可用</button>;
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
