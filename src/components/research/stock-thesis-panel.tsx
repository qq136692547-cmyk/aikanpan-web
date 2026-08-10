"use client";

import { useEffect, useState } from "react";

interface ThesisItem {
  id: string;
  name: string;
  code: string;
  market?: "cn" | "us";
  reason: string;
  trigger: string;
  status: "active" | "watching" | "closed";
}

function normalize(code: string) {
  return (code || "").toLowerCase().replace(/[^a-z0-9]/g, "");
}

const STATUS_TEXT: Record<ThesisItem["status"], string> = {
  active: "跟踪中",
  watching: "观察中",
  closed: "已关闭",
};

function statusClass(status: ThesisItem["status"]) {
  if (status === "active") return "neo-up-soft text-neo-up";
  if (status === "watching") return "bg-[var(--neo-amber-soft)] text-[var(--neo-amber)]";
  return "bg-[var(--neo-surface-inset)] text-neo-dim";
}

export function StockThesisPanel({ code, market }: { code: string; market?: string }) {
  const [items, setItems] = useState<ThesisItem[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("aikanpan_research_theses");
      if (!raw) return;
      const all = JSON.parse(raw) as ThesisItem[];
      const target = normalize(code);
      setItems(
        all.filter(
          (t) =>
            (market ? (t.market || "cn") === market : true) &&
            (normalize(t.code) === target ||
              normalize(t.code).endsWith(target) ||
              target.endsWith(normalize(t.code)))
        )
      );
    } catch {
      setItems([]);
    }
  }, [code, market]);

  if (items.length === 0) return null;

  return (
    <section className="neo-card mb-4 p-5 neo-fade-up">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-[14px] font-semibold text-neo-ink">我的投资论点</h3>
        <a href="/research/" className="text-[11px] text-neo-primary hover:underline">研究台 →</a>
      </div>
      <div className="space-y-3">
        {items.map((t) => (
          <div key={t.id} className="neo-inset px-4 py-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-medium text-neo-ink">{t.name}</span>
              <span style={{ fontFamily: "var(--font-inter), system-ui" }} className="text-[10px] text-neo-dim">{t.code}</span>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusClass(t.status)}`}>
                {STATUS_TEXT[t.status]}
              </span>
            </div>
            <p className="mt-1 text-[12px] leading-relaxed text-neo-mid">{t.reason}</p>
            {t.trigger && <p className="mt-1 text-[11px] text-neo-dim">卖出触发：{t.trigger}</p>}
          </div>
        ))}
      </div>
    </section>
  );
}
