"use client";

import { useCallback, useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { AuthRetryNotice } from "@/components/system/auth-retry-notice";

export function UsWatchlistButton({ code, name }: { code: string; name?: string }) {
  const [state, setState] = useState<"loading" | "in" | "out">("loading");
  const [busy, setBusy] = useState(false);
  const { user, loading: authLoading, retry: retryAuth } = useAuth();
  const ready = !authLoading && !!user;
  /** 游客登录失败：ready 永久 false，按钮会变成死键，必须给重试入口 */
  const authFailed = !authLoading && !user;

  const load = useCallback(() => {
    if (!ready) return;
    api
      .getUsWatchlist()
      .then((d) => setState(d.watchlist.some((w) => w.code === code) ? "in" : "out"))
      .catch(() => setState("out"));
  }, [code, ready]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggle() {
    // 未就绪时不再静默 return：静默点击等于「按钮坏了」，用户没有任何反馈。
    // 这里直接触发一次重试，等于把失败态的修复入口放进了按钮本身。
    if (busy) return;
    if (!ready) {
      retryAuth();
      return;
    }
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

  if (authLoading || (ready && state === "loading")) {
    return <span className="neo-chip px-2 py-1 text-[10px] text-neo-dim">…</span>;
  }

  // 初始化失败：不再给「暂不可用」的禁用键——它既说不出原因，也没有出路
  if (authFailed) {
    return <AuthRetryNotice onRetry={retryAuth} compact />;
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
