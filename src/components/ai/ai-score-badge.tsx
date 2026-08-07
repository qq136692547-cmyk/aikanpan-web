"use client";

import { type AIScoreItem } from "@/lib/api";

const scoreConfig = (score: number) => {
  if (score >= 8) return { bg: "neo-up-soft", text: "text-neo-up" };
  if (score >= 5) return { bg: "bg-[var(--neo-amber-soft)]", text: "text-[var(--neo-amber)]" };
  return { bg: "neo-down-soft", text: "text-neo-down" };
};

export function AIScoreBadge({ item }: { item: AIScoreItem }) {
  const sc = scoreConfig(item.score);
  return (
    <div
      className={`group relative inline-flex items-center gap-1 rounded-md ${sc.bg} px-1.5 py-0.5 cursor-default`}
      title={item.note}
    >
      <span className={`text-xs font-bold ${sc.text}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{item.score}</span>
      {/* Hover tooltip */}
      <div className="neo-card-sm pointer-events-none absolute right-0 top-full z-10 mt-1 hidden w-48 rounded-md p-2 text-xs shadow-lg group-hover:block">
        <div className="flex items-center gap-1.5">
          <span className={`font-bold ${sc.text}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>{item.score}/10</span>
          <span className="text-neo-mid">{item.status}</span>
        </div>
        {item.note && (
          <p className="mt-1 text-neo-dim">{item.note}</p>
        )}
        {item.cached && (
          <span className="mt-1 block text-[10px] text-neo-dim">缓存命中</span>
        )}
      </div>
    </div>
  );
}

export function AIScoreBadgeSkeleton() {
  return (
    <div className="neo-skeleton inline-flex h-5 w-7 rounded-md" />
  );
}

export function AIScoreBadgeEmpty() {
  return (
    <div className="neo-inset inline-flex items-center rounded-md px-1.5 py-0.5">
      <span className="text-xs text-neo-dim">-</span>
    </div>
  );
}
