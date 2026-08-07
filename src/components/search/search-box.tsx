"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent } from "react";
import useSWR from "swr";
import { api } from "@/lib/api";

function useDebounced<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}

export function SearchBox({ initialQuery = "" }: { initialQuery?: string }) {
  const router = useRouter();
  const boxRef = useRef<HTMLFormElement>(null);
  const [value, setValue] = useState(initialQuery);
  const [open, setOpen] = useState(false);
  const debounced = useDebounced(value, 220);
  const query = debounced.trim();

  const { data, error, isValidating } = useSWR(
    query ? ["stock-search", query] : null,
    () => api.searchStocks(query),
    { revalidateOnFocus: false, dedupingInterval: 30_000 }
  );

  const results = (data?.list || []).slice(0, 8);

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
    router.push(`/search?q=${encodeURIComponent(q)}`);
  }

  return (
    <form ref={boxRef} action="/search" onSubmit={handleSubmit} className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          name="q"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          placeholder="输入股票代码、名称或拼音…"
          autoComplete="off"
          className="neo-input flex-1 px-4 py-3 text-sm"
        />
        <button type="submit" className="neo-btn-primary px-5 py-3 text-sm font-medium">
          搜索
        </button>
      </div>

      {open && query && (
        <div className="neo-card-sm absolute left-0 right-0 z-30 mt-2 max-h-[360px] overflow-y-auto neo-scrollbar">
          {error ? (
            <div className="px-4 py-3 text-xs text-neo-mid">搜索服务暂时不可用，请直接提交查询</div>
          ) : results.length > 0 ? (
            <div className="divide-y divide-[var(--neo-edge)]">
              {results.map((s) => (
                <a
                  key={s.code}
                  href={`/stock/${s.code.replace(/\./, "")}/`}
                  onClick={() => setOpen(false)}
                  className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm transition-colors hover-neo-inset"
                >
                  <span className="truncate font-medium text-neo-ink">{s.name}</span>
                  <span className="flex shrink-0 items-center gap-2 text-[11px] text-neo-dim">
                    <span style={{ fontFamily: "var(--font-inter), system-ui" }}>{s.code}</span>
                    <span>{s.pinyin || s.initials || "-"}</span>
                  </span>
                </a>
              ))}
            </div>
          ) : !isValidating ? (
            <div className="px-4 py-3 text-xs text-neo-dim">未找到匹配的股票，试试完整代码或中文名称</div>
          ) : (
            <div className="px-4 py-3 text-xs text-neo-dim">搜索中…</div>
          )}
        </div>
      )}
    </form>
  );
}
