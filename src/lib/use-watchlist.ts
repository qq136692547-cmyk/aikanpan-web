"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { api, type WatchlistItem } from "@/lib/api";
import { useSync } from "@/lib/use-sync";

const WATCHLIST_KEY = "watchlist-items";

/**
 * 自选股共享状态：后端按 token 隔离存储，增删后整包同步。
 */
export function useWatchlist() {
  const { data, error, mutate } = useSWR<{ watchlist: WatchlistItem[]; count: number }>(
    WATCHLIST_KEY,
    () => api.getWatchlist(),
    { refreshInterval: 30000 }
  );
  const { pushData } = useSync();
  const watchlist = useMemo(() => data?.watchlist || [], [data]);
  const codes = useMemo(() => new Set(watchlist.map((w) => w.code)), [watchlist]);

  const inWatchlist = useCallback(
    (code: string) => codes.has(code),
    [codes]
  );

  const toggle = useCallback(
    async (code: string, name: string) => {
      const current = data?.watchlist || [];
      const exists = current.some((w) => w.code === code);
      const next: WatchlistItem[] = exists
        ? current.filter((w) => w.code !== code)
        : [{ code, name, price: 0, change_pct: 0 }, ...current];
      mutate({ watchlist: next, count: next.length }, { revalidate: false });
      try {
        await pushData("watchlist", next.map((w) => ({ code: w.code, name: w.name })));
      } catch (err) {
        console.error("[watchlist] sync failed:", err);
      } finally {
        mutate();
      }
    },
    [data, mutate, pushData]
  );

  return { watchlist, error, inWatchlist, toggle, mutate };
}
