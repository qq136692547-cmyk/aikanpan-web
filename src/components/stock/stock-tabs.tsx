"use client";

import { useState } from "react";
import type { StockEvents, StockFinancials } from "@/lib/api";

const TABS = [
  { key: "news", label: "新闻/事件" },
  { key: "announcements", label: "公告/研报" },
  { key: "financials", label: "财务数据" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

function toneClass(tone: string): string {
  if (tone === "up") return "text-neo-up";
  if (tone === "down") return "text-neo-down";
  return "text-neo-mid";
}

function statusClass(color: string): string {
  if (color === "green") return "neo-up-soft text-neo-up";
  if (color === "red") return "neo-down-soft text-neo-down";
  return "bg-[var(--neo-amber-soft)] text-[var(--neo-amber)]";
}

export function StockTabs({
  events,
  financials,
}: {
  events: StockEvents | null;
  financials: StockFinancials | null;
}) {
  const [tab, setTab] = useState<TabKey>("news");

  return (
    <div className="neo-card p-5 mb-4 neo-fade-up">
      <div className="mb-4 flex flex-wrap gap-2">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
              tab === t.key ? "neo-chip-active" : "neo-chip"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {tab === "news" && (
        <div className="space-y-3">
          {events?.summary && (
            <div className="neo-inset rounded-lg px-4 py-3 text-[13px] leading-relaxed text-neo-mid">
              {events.summary}
            </div>
          )}
          {(events?.signals?.length || 0) > 0 ? (
            events!.signals.map((s, i) => (
              <div key={`${s.type}-${i}`} className="flex gap-3 rounded-lg px-1 py-1.5">
                <span className={`mt-1 h-2 w-2 shrink-0 rounded-full ${s.tone === "up" ? "bg-neo-up" : s.tone === "down" ? "bg-neo-down" : "bg-neo-ink-faint"}`} />
                <div>
                  <div className={`text-[13px] font-medium ${toneClass(s.tone)}`}>{s.title}</div>
                  <div className="mt-0.5 text-[12px] leading-relaxed text-neo-mid">{s.desc}</div>
                </div>
              </div>
            ))
          ) : (
            <div className="py-6 text-center text-xs text-neo-dim">暂无事件摘要</div>
          )}
        </div>
      )}

      {tab === "announcements" && (
        <div>
          {(events?.reports?.length || 0) > 0 ? (
            <div className="space-y-2">
              {events!.reports.map((r) => (
                <a
                  key={r.id}
                  href={r.url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover-neo-inset"
                >
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-neo-ink">{r.title}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-[11px] text-neo-dim">
                      <span className="font-medium text-neo-primary">{r.source || r.org_name}</span>
                      <span>·</span>
                      <span>{r.time || r.publish_at || ""}</span>
                      {r.rating_name && <span className="neo-up-soft rounded px-1.5 py-0.5 text-neo-up">{r.rating_name}</span>}
                    </div>
                  </div>
                </a>
              ))}
            </div>
          ) : (
            <div className="py-6 text-center text-xs text-neo-dim">暂无公告/研报</div>
          )}
        </div>
      )}

      {tab === "financials" && (
        <div>
          {financials?.available === false || !financials?.metrics ? (
            <div className="py-6 text-center text-xs text-neo-dim">暂无财务数据</div>
          ) : (
            <div>
              <div className="mb-3 flex flex-wrap items-center gap-2 text-[11px] text-neo-dim">
                <span>报告期 {financials.period || "-"}</span>
                <span>·</span>
                <span>{financials.source || "-"}</span>
                {financials.evaluation?.summary && (
                  <span className="ml-auto">
                    优 {financials.evaluation.summary.green_count} · 中 {financials.evaluation.summary.yellow_count} · 差 {financials.evaluation.summary.red_count}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {(financials.evaluation?.dimensions || []).map((d) => (
                  <div key={d.key} className="neo-inset-sm px-3 py-2.5">
                    <div className="text-[10px] uppercase tracking-wider text-neo-dim">{d.label}</div>
                    <div className="mt-1 text-[16px] font-semibold text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                      {d.value.toFixed(2)}%
                    </div>
                    <span className={`mt-1 inline-block rounded px-1.5 py-0.5 text-[10px] font-medium ${statusClass(d.color)}`}>
                      {d.status}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
