"use client";

import { useCallback, useMemo } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { normalizeStockCode } from "@/lib/format";

export function useLimitPersonalization() {
  const { isAuthenticated } = useAuth();
  const { data: watchData } = useSWR(
    isAuthenticated ? "limit-personal-watchlist" : null,
    () => api.getWatchlist(),
    { refreshInterval: 30000 }
  );
  const { data: positionsData } = useSWR(
    isAuthenticated ? "limit-personal-positions" : null,
    () => api.getPositions(),
    { refreshInterval: 30000 }
  );

  const watchCodes = useMemo(
    () => new Set((watchData?.watchlist || []).map((w) => normalizeStockCode(w.code))),
    [watchData]
  );
  const holdingCodes = useMemo(
    () => new Set((positionsData?.positions || []).map((p) => normalizeStockCode(p.code))),
    [positionsData]
  );

  const isMine = useCallback(
    (code: string) => {
      const n = normalizeStockCode(code);
      return watchCodes.has(n) || holdingCodes.has(n);
    },
    [watchCodes, holdingCodes]
  );

  const badges = useCallback(
    (code: string) => {
      const n = normalizeStockCode(code);
      const tags: string[] = [];
      if (holdingCodes.has(n)) tags.push("持仓");
      if (watchCodes.has(n)) tags.push("自选");
      return tags;
    },
    [watchCodes, holdingCodes]
  );

  return { isAuthenticated, isMine, badges };
}
