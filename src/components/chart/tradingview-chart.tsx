"use client";

import { memo, useEffect, useRef, useState } from "react";

interface TradingViewChartProps {
  /** 股票代码，格式 sz.300414 或 sh.600518 */
  code: string;
  /** 显示名称 */
  name?: string;
}

/**
 * 将后端代码格式转为 TradingView 符号
 * sz.300414 → SZSE:300414
 * sh.600518 → SSE:600518
 */
function toTvSymbol(code: string): string {
  const match = code.match(/^(sz|sh)\.(.+)$/);
  if (!match) return code;
  const [, exchange, symbol] = match;
  return exchange === "sz" ? `SZSE:${symbol}` : `SSE:${symbol}`;
}

function TradingViewChartInner({ code, name }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

    // Clear any previous content
    containerRef.current.innerHTML = "";

    const widgetContainer = document.createElement("div");
    widgetContainer.className = "tradingview-widget-container";
    widgetContainer.style.height = "100%";
    widgetContainer.style.width = "100%";

    const widget = document.createElement("div");
    widget.className = "tradingview-widget-container__widget";
    widget.style.height = "100%";
    widget.style.width = "100%";
    widgetContainer.appendChild(widget);

    const script = document.createElement("script");
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-advanced-chart.js";
    script.async = true;
    script.type = "text/javascript";

    const tvSymbol = toTvSymbol(code);
    const config = {
      autosize: true,
      symbol: tvSymbol,
      interval: "D",
      timezone: "Asia/Shanghai",
      theme: "dark",
      style: "1",
      locale: "zh_CN",
      enable_publishing: false,
      hide_side_toolbar: false,
      allow_symbol_change: true,
      studies: [
        "MAS@tv-basicstudies",
        "MACD@tv-basicstudies",
        "RSI@tv-basicstudies",
      ],
      support_host: "https://www.tradingview.com",
    };

    script.innerHTML = JSON.stringify(config);
    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);

    // Mark loaded after script injects
    const timer = setTimeout(() => setLoaded(true), 1500);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [code]);

  return (
    <div className="relative h-[500px] w-full overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-t-brand" />
            <span className="text-xs text-[var(--text-tertiary)]">加载 K 线图...</span>
          </div>
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartInner);
