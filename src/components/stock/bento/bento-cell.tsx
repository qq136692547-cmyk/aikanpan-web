import React from "react";

export interface BentoCellProps {
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
  sub?: React.ReactNode;
  trend?: "up" | "down" | "neutral" | "highlight" | "amber" | "purple" | "gold" | "default";
  variant?: "up" | "down" | "neutral" | "highlight" | "amber" | "purple" | "gold" | "default";
  className?: string;
}

export function BentoCell({
  label,
  value,
  hint,
  sub,
  trend,
  variant,
  className = "",
}: BentoCellProps) {
  const effectiveTrend = variant || trend || "neutral";
  let valColor = "text-[#EDEFF3]";
  if (effectiveTrend === "up") valColor = "text-[#FF5C61]";
  if (effectiveTrend === "down") valColor = "text-[#46D993]";
  if (effectiveTrend === "highlight") valColor = "text-[#38BDF8]";
  if (effectiveTrend === "amber" || effectiveTrend === "gold") valColor = "text-[#F5A623]";
  if (effectiveTrend === "purple") valColor = "text-[#A7B6FA]";

  const subText = hint || sub;

  return (
    <div
      className={`group relative flex flex-col justify-between overflow-hidden rounded-[10px] border border-white/[0.05] bg-[#0C0E11] px-3.5 py-2.5 transition-all duration-200 hover:border-white/[0.12] hover:bg-[#111418] ${className}`}
      style={{
        boxShadow:
          "inset 3px 3px 7px rgba(0, 0, 0, 0.65), inset -2px -2px 5px rgba(255, 255, 255, 0.045)",
      }}
    >
      <div className="flex items-center justify-between gap-1 text-[11px] font-medium text-[#9AA3B2]">
        <span>{label}</span>
      </div>
      <div
        className={`truncate font-mono text-[15px] font-bold tracking-tight ${valColor}`}
      >
        {value}
      </div>
      {subText && (
        <div className="mt-0.5 truncate text-[10px] text-[#7C8595]">{subText}</div>
      )}
    </div>
  );
}
