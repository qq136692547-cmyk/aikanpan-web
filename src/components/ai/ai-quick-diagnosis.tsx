"use client";

import { useState, useCallback } from "react";

export function AIQuickDiagnosis() {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSearch = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch(`https://aikanpan.top/api/v1/stocks/search?keyword=${encodeURIComponent(code.trim())}`);
      if (res.ok) {
        const data = await res.json();
        if (data.list && data.list.length > 0) {
          window.location.href = `/stock/${data.list[0].code.replace(/\./, "")}/`;
          return;
        }
      }
      const trimmed = code.trim();
      if (/^\d{6}$/.test(trimmed)) {
        window.location.href = `/stock/${trimmed}/`;
        return;
      }
      setError("未找到匹配的股票");
    } catch {
      const trimmed = code.trim();
      if (/^\d{6}$/.test(trimmed)) {
        window.location.href = `/stock/${trimmed}/`;
      } else {
        setError("请输入 6 位股票代码");
      }
    } finally {
      setLoading(false);
    }
  }, [code]);

  return (
    <div className="neo-card-sm h-full p-5 flex flex-col">
      <div className="flex items-center gap-2">
        <span className="rounded-md bg-neo-primary-soft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-neo-primary">
          AI 诊断
        </span>
        <span className="text-[11px] text-neo-dim">输入代码秒出报告</span>
      </div>

      <form onSubmit={handleSearch} className="mt-4 flex gap-2">
        <input
          type="text"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          placeholder="000001"
          className="neo-inset w-full rounded-md px-3 py-1.5 text-[14px] text-neo-ink placeholder:text-neo-dim transition-colors focus:outline-none"
          style={{ fontFamily: 'var(--font-inter), system-ui' }}
          disabled={loading}
        />
        <button
          type="submit"
          disabled={loading || !code.trim()}
          className="neo-btn-primary shrink-0 rounded-md px-4 py-1.5 text-[13px] font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? <span className="h-3 w-3 animate-spin rounded-full border-2 border-current border-t-transparent" /> : "→"}
        </button>
      </form>

      {error && <p className="mt-2 text-[11px] text-neo-down">{error}</p>}

      <div className="mt-auto pt-3 flex flex-wrap gap-1.5">
        {[
          { code: "000001", label: "平安银行" },
          { code: "600519", label: "贵州茅台" },
          { code: "300750", label: "宁德时代" },
        ].map((s) => (
          <button
            key={s.code}
            onClick={() => setCode(s.code)}
            className="neo-inset rounded px-2 py-0.5 text-[11px] text-neo-mid transition-colors hover-neo-inset hover:text-neo-primary"
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
