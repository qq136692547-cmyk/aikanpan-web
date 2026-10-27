"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type StockSearchResult } from "@/lib/api";
import { useDialogFocus } from "@/lib/use-dialog-focus";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  // 打开时焦点进输入框、Esc 关闭、Tab 焦点循环、关闭后焦点归位
  const { containerRef, focusRef } = useDialogFocus<HTMLDivElement, HTMLInputElement>(
    open,
    () => setOpen(false)
  );

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => {
          if (!v) {
            setQuery("");
            setResults([]);
          }
          return !v;
        });
      }
    }
    function onOpen() {
      setQuery("");
      setResults([]);
      setOpen(true);
    }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-global-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-global-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) return;
    // Loading state tracks the debounced remote search started by this effect.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const data = await api.searchStocks(q);
        setResults(data.list.slice(0, 8));
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 250);
    return () => clearTimeout(timer);
  }, [query, open]);

  function go(code: string) {
    setOpen(false);
    router.push(`/stock/${code.replace(/\./, "")}/`);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-start justify-center bg-black/50 px-4 pt-[12vh]" onClick={() => setOpen(false)}>
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-label="全局搜索"
        className="neo-card w-full max-w-xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b border-[var(--neo-edge)] px-4 py-3">
          <input
            ref={focusRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索股票代码 / 名称 / 拼音"
            aria-label="搜索股票代码、名称或拼音"
            className="w-full bg-transparent text-[15px] text-neo-ink outline-none placeholder:text-neo-dim"
          />
        </div>
        <div className="max-h-[360px] overflow-y-auto neo-scrollbar">
          {loading && <div className="px-4 py-4 text-[12px] text-neo-dim">搜索中…</div>}
          {!loading && results.length === 0 && query.trim() && (
            <div className="px-4 py-6 text-center text-[12px] text-neo-dim">未找到匹配股票</div>
          )}
          {results.map((r) => (
            <button
              key={r.code}
              onClick={() => go(r.code)}
              className="flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors hover-neo-inset"
            >
              <span className="min-w-0">
                <span className="block truncate text-[13px] font-medium text-neo-ink">{r.name}</span>
                <span className="block text-[10px] text-neo-dim">{r.code}</span>
              </span>
              <span className="shrink-0 text-[11px] text-neo-primary">进入 →</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
