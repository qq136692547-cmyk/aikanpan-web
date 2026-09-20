"use client";

import { useState } from "react";
import { Calculator, ChevronDown, ChevronUp, Database, ExternalLink, TriangleAlert } from "lucide-react";
import type { AIEvidence } from "@/lib/api";

export function AIEvidencePanel({ evidence }: { evidence?: AIEvidence }) {
  const [open, setOpen] = useState(false);

  if (!evidence) return null;

  const sourceCount = evidence.sources?.length ?? 0;
  const calculationCount = evidence.calculations?.length ?? 0;
  const warningCount = evidence.warnings?.length ?? 0;

  return (
    <div className="neo-inset mt-3 rounded-lg">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="flex min-h-11 w-full items-center justify-between gap-3 px-3 py-2 text-left"
      >
        <span className="flex min-w-0 items-center gap-2 text-[10px] font-medium text-neo-mid">
          <Database size={12} />
          <span>数据依据</span>
          <span className="text-neo-dim">{sourceCount} 个来源</span>
          <span className="text-neo-dim">{calculationCount} 项计算</span>
          {warningCount > 0 && (
            <span className="flex items-center gap-1 text-neo-down">
              <TriangleAlert size={11} />
              {warningCount}
            </span>
          )}
        </span>
        {open ? <ChevronUp size={13} className="shrink-0 text-neo-dim" /> : <ChevronDown size={13} className="shrink-0 text-neo-dim" />}
      </button>

      {open && (
        <div className="border-t border-[var(--neo-edge)] px-3 py-3">
          <div className="flex flex-wrap gap-x-3 gap-y-1 text-[10px] text-neo-dim">
            <span>数据时间 {evidence.data_as_of || "未标注"}</span>
            <span>模型 {evidence.model || "未标注"}</span>
            <span>{evidence.prompt_version}</span>
          </div>

          {(evidence.sources?.length ?? 0) > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1 text-[10px] font-medium text-neo-mid">
                <Database size={11} />
                数据来源
              </div>
              <div className="mt-1.5 space-y-1.5">
                {evidence.sources?.map((source) => (
                  <div key={source.id} className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[10px]">
                    <span className="font-medium text-neo-ink">{source.name}</span>
                    <span className="text-neo-dim">{source.provider}</span>
                    {source.as_of && <span className="text-neo-dim">{source.as_of}</span>}
                    {source.url && (
                      <a href={source.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-0.5 text-neo-primary hover:underline">
                        原始链接
                        <ExternalLink size={9} />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {(evidence.calculations?.length ?? 0) > 0 && (
            <div className="mt-3">
              <div className="flex items-center gap-1 text-[10px] font-medium text-neo-mid">
                <Calculator size={11} />
                关键计算
              </div>
              <div className="mt-1.5 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {evidence.calculations?.map((item) => (
                  <div key={item.id} className="rounded-md bg-[var(--neo-surface)] px-2 py-1.5">
                    <div className="flex items-baseline justify-between gap-2">
                      <span className="text-[10px] text-neo-dim">{item.label}</span>
                      <span className="text-[11px] font-semibold text-neo-ink">
                        {item.value ?? "N/A"}{item.unit ? ` ${item.unit}` : ""}
                      </span>
                    </div>
                    <div className="mt-0.5 text-[9px] text-neo-dim">{item.formula}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {warningCount > 0 && (
            <div className="mt-3 rounded-md bg-[var(--neo-down-soft)] px-2.5 py-2">
              <div className="flex items-center gap-1 text-[10px] font-medium text-neo-down">
                <TriangleAlert size={11} />
                数据提示
              </div>
              <ul className="mt-1 space-y-0.5 text-[10px] leading-relaxed text-neo-mid">
                {evidence.warnings?.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
