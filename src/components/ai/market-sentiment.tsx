"use client";

import { useMemo } from "react";

export function MarketSentiment({ upCount, downCount }: { upCount: number; downCount: number }) {
  const { score, label, color } = useMemo(() => {
    const total = upCount + downCount;
    if (total === 0) return { score: 50, label: "观望", color: "var(--neo-ink-mid)" };
    const s = Math.round((upCount / total) * 100);
    if (s >= 80) return { score: s, label: "亢奋", color: "var(--neo-up-text)" };
    if (s >= 60) return { score: s, label: "偏多", color: "var(--neo-up-text)" };
    if (s >= 40) return { score: s, label: "中性", color: "var(--neo-ink-mid)" };
    if (s >= 20) return { score: s, label: "偏空", color: "var(--neo-down-text)" };
    return { score: s, label: "恐慌", color: "var(--neo-down-text)" };
  }, [upCount, downCount]);

  const angle = (score / 100) * 180;
  const arcX = 50 + 40 * Math.cos((180 - angle) * Math.PI / 180);
  const arcY = 50 - 40 * Math.sin((180 - angle) * Math.PI / 180);
  const largeArc = angle > 180 ? 1 : 0;

  return (
    <div>
      <div className="text-[10px] uppercase tracking-wider text-neo-dim">情绪</div>
      <div className="mt-1.5 flex items-center gap-2.5">
        <svg width="64" height="40" viewBox="0 0 100 56">
          <path d="M 10 50 A 40 40 0 0 1 90 50" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="4" strokeLinecap="round" />
          <path
            d={`M 10 50 A 40 40 0 ${largeArc} 1 ${arcX} ${arcY}`}
            fill="none" stroke={color} strokeWidth="4" strokeLinecap="round"
          />
          <circle cx="50" cy="50" r="2" fill={color} />
        </svg>
        <div>
          <div className="text-[22px] font-bold leading-none" style={{ color, fontFamily: 'var(--font-inter), system-ui' }}>{score}</div>
          <div className="mt-0.5 text-[10px] font-medium" style={{ color }}>{label}</div>
        </div>
      </div>
    </div>
  );
}
