"use client";

import { useCallback } from "react";
import { useAuth } from "./auth";
import { api } from "./api";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://aikanpan.top/api/v1";

/**
 * 数据同步 hook — push/pull watchlist, alerts, notes, portfolio
 * 使用后端 /api/v1/sync/push 和 /api/v1/sync/pull
 */
export function useSync() {
  const { user, isAuthenticated } = useAuth();

  const pushData = useCallback(
    async (type: "watchlist" | "notes" | "portfolio" | "alerts", data: unknown) => {
      if (!isAuthenticated || !user) throw new Error("not authenticated");

      const res = await fetch(`${API_BASE}/sync/push`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${user.token}`,
        },
        body: JSON.stringify({ type, data }),
      });

      if (!res.ok) throw new Error(`sync push failed: ${res.status}`);
      return res.json();
    },
    [user, isAuthenticated]
  );

  const pullData = useCallback(
    async (type: "watchlist" | "notes" | "portfolio" | "alerts") => {
      if (!isAuthenticated || !user) throw new Error("not authenticated");

      const res = await fetch(`${API_BASE}/sync/pull?type=${type}`, {
        headers: {
          Authorization: `Bearer ${user.token}`,
        },
      });

      if (!res.ok) throw new Error(`sync pull failed: ${res.status}`);
      const result = await res.json();
      return result.data;
    },
    [user, isAuthenticated]
  );

  return { pushData, pullData };
}
