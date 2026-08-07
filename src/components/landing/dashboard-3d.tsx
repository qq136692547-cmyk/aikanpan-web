"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 3D 透视看板 — 1200px perspective, 20° RotateX, scroll-driven tilt-to-flat
 */
export function Dashboard3D() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState(20);
  const [scale, setScale] = useState(0.9);

  useEffect(() => {
    function onScroll() {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const vh = window.innerHeight;
      // 看板从底部进入视口到完全居中
      const progress = Math.max(0, Math.min(1, (vh - rect.top) / (vh + rect.height)));
      // progress 0→1 时 tilt 20→0, scale 0.9→1
      setTilt(20 * (1 - progress));
      setScale(0.9 + 0.1 * progress);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div className="relative flex justify-center" style={{ perspective: "1200px" }}>
      <div
        ref={ref}
        className="w-full max-w-[1200px] transition-[transform] duration-100 ease-out"
        style={{
          transform: `rotateX(${tilt}deg) scale(${scale})`,
          transformStyle: "preserve-3d",
        }}
      >
        <div className="overflow-hidden rounded-2xl border border-[var(--edge)] bg-[var(--panel)] shadow-[0_60px_120px_-40px_rgba(0,0,0,0.8)]">
          <div className="flex">
            {/* 侧边栏 */}
            <div className="hidden w-48 shrink-0 flex-col gap-1 border-r border-[var(--edge-faint)] bg-[var(--panel-inset)] p-3 md:flex">
              <div className="mb-3 flex items-center gap-2 px-2">
                <span className="h-3 w-3 rounded bg-[var(--flux)]" />
                <span className="text-[13px] font-bold text-[var(--ink)]">爱看盘</span>
              </div>
              {["仪表盘", "市场总览", "每日复盘", "个股诊断", "智能盯盘", "搜索"].map((item, i) => (
                <div
                  key={item}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-1.5 text-[12px] ${
                    i === 0 ? "bg-[var(--panel-hover)] text-[var(--ink)]" : "text-[var(--ink-dim)]"
                  }`}
                >
                  <span className="h-1 w-1 rounded-full bg-current opacity-40" />
                  {item}
                </div>
              ))}
              <div className="mt-auto rounded-md bg-[var(--flux-soft)] px-2.5 py-2">
                <div className="text-[10px] font-semibold uppercase tracking-wider text-[var(--flux-text)]">AI 复盘</div>
                <div className="mt-0.5 text-[11px] text-[var(--ink-dim)]">每日 17:30 生成</div>
              </div>
            </div>

            {/* 主内容区 */}
            <div className="flex-1 p-5">
              {/* 顶部数据卡 */}
              <div className="grid grid-cols-3 gap-3">
                {[
                  { label: "上证指数", value: "3,284.73", pct: "+0.82%", up: true },
                  { label: "深证成指", value: "10,492.15", pct: "+1.15%", up: true },
                  { label: "创业板指", value: "2,156.38", pct: "-0.34%", up: false },
                ].map((idx) => (
                  <div key={idx.label} className="rounded-lg border border-[var(--edge-faint)] bg-[var(--panel-inset)] p-3">
                    <div className="text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">{idx.label}</div>
                    <div className={`font-num mt-1 text-[20px] font-bold ${idx.up ? "text-up" : "text-down"}`}>{idx.value}</div>
                    <div className={`font-num text-[11px] ${idx.up ? "text-up" : "text-down"}`}>{idx.pct}</div>
                  </div>
                ))}
              </div>

              {/* 数据表格 */}
              <div className="mt-3 overflow-hidden rounded-lg border border-[var(--edge-faint)]">
                <div className="border-b border-[var(--edge-faint)] px-4 py-2">
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--ink-dim)]">涨停板</span>
                </div>
                <div className="grid grid-cols-[1fr_80px_64px_48px] gap-2 border-b border-[var(--edge-faint)] px-4 py-1.5 text-[10px] uppercase tracking-wider text-[var(--ink-dim)]">
                  <span>名称</span>
                  <span className="text-right">价格</span>
                  <span className="text-right">涨幅</span>
                  <span className="text-right">AI</span>
                </div>
                {[
                  { name: "中际旭创", price: "156.20", pct: "+20.00%", score: "8.5" },
                  { name: "寒武纪", price: "892.40", pct: "+20.00%", score: "9.1" },
                  { name: "海光信息", price: "134.56", pct: "+19.98%", score: "7.8" },
                  { name: "新易盛", price: "68.30", pct: "+20.00%", score: "8.2" },
                  { name: "天孚通信", price: "215.80", pct: "+15.43%", score: "7.5" },
                ].map((s) => (
                  <div key={s.name} className="grid grid-cols-[1fr_80px_64px_48px] items-center gap-2 border-b border-[var(--edge-faint)] px-4 py-2 text-[12px] last:border-b-0">
                    <span className="font-medium text-[var(--ink)]">{s.name}</span>
                    <span className="font-num text-right text-up">{s.price}</span>
                    <span className="font-num text-right text-up">{s.pct}</span>
                    <span className="font-num text-right text-[var(--flux-text)]">{s.score}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
