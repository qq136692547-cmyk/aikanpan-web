"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { api, type StockSearchResult } from "@/lib/api";

export function GlobalSearch() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<StockSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((v) => !v);
      }
      if (e.key === "Escape") setOpen(false);
    }
    function onOpen() { setOpen(true); }
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("open-global-search", onOpen);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("open-global-search", onOpen);
    };
  }, []);

  useEffect(() => {
    if (open) {
      setQuery("");
      setResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const q = query.trim();
    if (!q) {
      setResults([]);
      return;
    }
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
      <div className="neo-card w-full max-w-xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[var(--neo-edge)] px-4 py-3">
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="搜索股票代码 / 名称 / 拼音"
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
