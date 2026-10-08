import React from "react";
import { WatchlistButton } from "@/components/stock/watchlist-button";

interface BentoHeroProps {
  name: string;
  code: string;
  marketTag: string;
  price: string;
  changeStr: string;
  trend: "up" | "down" | "neutral";
  currencySymbol?: string;
  extraBadge?: string;
  actions?: React.ReactNode;
}

/**
 * 1:1 镜像 Figma 画布中的 Hero 核心报价便当盒
 */
export function BentoHero({
  name,
  code,
  marketTag,
  price,
  changeStr,
  trend,
  currencySymbol = "¥",
  extraBadge,
  actions,
}: BentoHeroProps) {
  let changeBg = "bg-white/[0.05] text-[#9AA3B2]";
  let priceColor = "text-[#EDEFF3]";
  if (trend === "up") {
    changeBg = "bg-[#FF5C61]/15 text-[#FF5C61] border border-[#FF5C61]/30";
    priceColor = "text-[#FF5C61]";
  } else if (trend === "down") {
    changeBg = "bg-[#46D993]/15 text-[#46D993] border border-[#46D993]/30";
    priceColor = "text-[#46D993]";
  }

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* 左侧：股票名称与代码徽章 */}
      <div className="flex flex-col gap-1.5">
        <div className="flex flex-wrap items-center gap-2.5">
          <h1 className="text-[24px] font-extrabold tracking-tight text-white sm:text-[28px]">
            {name}
          </h1>
          <span
            className="flex items-center rounded-[6px] border border-white/[0.05] bg-[#0C0E11] px-2 py-0.5 font-mono text-[11px] font-semibold text-[#A7B6FA]"
            style={{
              boxShadow:
                "inset 2px 2px 4px rgba(0,0,0,0.6), inset -1px -1px 3px rgba(255,255,255,0.04)",
            }}
          >
            {code}
          </span>
          <span className="rounded-[6px] border border-white/[0.08] bg-white/[0.04] px-2 py-0.5 text-[10px] font-medium text-[#9AA3B2]">
            {marketTag}
          </span>
          {extraBadge && (
            <span className="rounded-[6px] border border-[#F5A623]/30 bg-[#F5A623]/10 px-2 py-0.5 text-[10px] font-medium text-[#F5A623]">
              {extraBadge}
            </span>
          )}
        </div>
      </div>

      {/* 右侧：现价、涨跌幅胶囊与加自选操作 */}
      <div className="flex flex-wrap items-center gap-3.5">
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono text-[18px] font-bold text-[#9AA3B2]">
            {currencySymbol}
          </span>
          <span
            className={`font-mono text-[28px] font-extrabold tracking-tight sm:text-[34px] ${priceColor}`}
          >
            {price}
          </span>
        </div>

        <div
          className={`rounded-full px-2.5 py-1 font-mono text-[12px] font-bold tracking-tight shadow-sm ${changeBg}`}
        >
          {changeStr}
        </div>

        {actions !== undefined ? (
          actions
        ) : (
          <WatchlistButton code={code} name={name} />
        )}
      </div>
    </div>
  );
}