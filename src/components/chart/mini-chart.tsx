"use client";

import { memo, useEffect, useRef, useState } from "react";

interface MiniChartProps {
  /** TradingView 符号，如 SZSE:000001 */
  symbol: string;
  /** 显示名称 */
  name: string;
  /** 涨跌幅，用于决定颜色 */
  changePct: number;
}

function MiniChartInner({ symbol, name, changePct }: MiniChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    if (!containerRef.current) return;

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
    script.src = "https://s3.tradingview.com/external-embedding/embed-widget-mini-symbol-overview.js";
    script.async = true;
    script.type = "text/javascript";

    const config = {
      symbol,
      width: "100%",
      height: "100%",
      locale: "zh_CN",
      dateRange: "3M",
      colorTheme: "dark",
      isTransparent: true,
      autosize: true,
      noTimeScale: false,
      chartOnly: false,
      lineWidth: 2,
      lineColor: changePct >= 0 ? "rgba(34,197,94,0.8)" : "rgba(239,68,68,0.8)",
      bottomColor: changePct >= 0 ? "rgba(34,197,94,0.05)" : "rgba(239,68,68,0.05)",
      topColor: changePct >= 0 ? "rgba(34,197,94,0.15)" : "rgba(239,68,68,0.15)",
    };

    script.innerHTML = JSON.stringify(config);
    widgetContainer.appendChild(script);
    containerRef.current.appendChild(widgetContainer);

    const timer = setTimeout(() => setLoaded(true), 1500);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [symbol, changePct]);

  return (
    <div className="relative h-[120px] w-full">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-5 w-5 animate-spin rounded-full border-2 border-[var(--border-subtle)] border-t-brand" />
        </div>
      )}
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}

export const MiniChart = memo(MiniChartInner);
