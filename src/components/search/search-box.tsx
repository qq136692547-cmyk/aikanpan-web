"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { api, type HkSearchResult, type StockSearchResult, type UsSearchResult } from "@/lib/api";
import { type MarketScope } from "@/lib/market";
import { Search } from "lucide-react";

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SearchBox({ initialQuery = "", market = "cn" }: { initialQuery?: string; market?: MarketScope }) {
  const isUs = market === "us";
  const isHk = market === "hk";
  const marketParam = isUs ? "us" : isHk ? "hk" : "cn";
  const router = useRouter();
  const boxRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(value, 220);
  const query = debounced.trim();

  const { data, error, isValidating } = useSWR(
    query ? [isUs ? "us-stock-search" : isHk ? "hk-stock-search" : "stock-search", query] : null,
    () => (isUs ? api.searchUsStocks(query) : isHk ? api.searchHkStocks(query) : api.searchStocks(query)),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const results = (data?.list || [])
    .filter((s) => !isUs || !s.code.includes(".") || /^[A-Z]+\.[A-Z]$/i.test(s.code))
    .slice(0, 8);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const q = value.trim();
    if (!q) return;
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(q)}&market=${marketParam}`);
  }

  return (
    <form ref={boxRef} action="/search" onSubmit={handleSubmit} className="relative">
      <div className="neo-card p-1.5 flex items-center gap-2 rounded-2xl">
        <input type="hidden" name="market" value={marketParam} />
        <div className="pl-3 text-neo-dim shrink-0"><Search className="w-4 h-4" /></div>
        <input
          type="text"
          name="q"
          aria-label={isUs ? "搜索美股" : isHk ? "搜索港股" : "搜索股票"}
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder={isUs ? "输入美股代码或名称…" : isHk ? "输入港股代码或名称…" : "输入股票代码、名称或拼音…"}
          autoComplete="off"
          className="min-h-11 flex-1 bg-transparent px-2 py-2 text-sm text-neo-ink placeholder:text-neo-dim focus:outline-none"
        />
        <button type="submit" className="neo-btn min-h-11 px-5 py-2 text-sm font-semibold rounded-xl text-neo-ink hover:text-brand transition-all">
          搜索
        </button>
      </div>

      {open && query && (
        <div className="neo-card absolute left-0 right-0 z-30 mt-2 max-h-[360px] overflow-y-auto neo-scrollbar rounded-2xl p-1.5 shadow-lg">
          {error ? (
            <div className="px-4 py-3 text-xs text-neo-mid">搜索服务暂时不可用，请直接提交查询</div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-[var(--neo-edge)]">
              {results.map((s) => (
                <a
                  key={s.code}
                  href={isUs || isHk ? `/stock/${s.code}/` : `/stock/${s.code.replace(/\./, "")}/`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover:bg-neo-bg-dim rounded-xl"
                >
                  <span className="truncate font-medium text-neo-ink">{s.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-[11px] text-neo-dim">
                    <span style={{ fontFamily: "var(--font-inter), system-ui" }}>{s.code}</span>
                    <span>{isUs ? ((s as UsSearchResult).type || "美股") : isHk ? ((s as HkSearchResult).type || "港股") : ((s as StockSearchResult).pinyin || (s as StockSearchResult).initials || "-")}</span>
                  </span>
                </a>
              ))}
            </div>
          ) : !isValidating ? (
            <div className="px-4 py-3 text-xs text-neo-dim">{isUs ? "未找到匹配的美股，试试完整代码或名称" : isHk ? "未找到匹配的港股，试试 5 位代码或名称" : "未找到匹配的股票，试试完整代码或中文名称"}</div>
          ) : (
            <div className="px-4 py-3 text-xs text-neo-dim">搜索中…</div>
          )}
        </div>
      )}
    </form>
  );
}


