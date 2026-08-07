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

const PERIODS = [
  { key: "D", label: "日K" },
  { key: "W", label: "周K" },
  { key: "M", label: "月K" },
] as const;

function TradingViewChartInner({ code, name }: TradingViewChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);
  const [interval, setInterval] = useState<string>("D");

  useEffect(() => {
    if (!containerRef.current) return;

    setLoaded(false);
    setError(false);
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
    script.onerror = () => setError(true);

    const tvSymbol = toTvSymbol(code);
    const config = {
      autosize: true,
      symbol: tvSymbol,
      interval,
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

    const timer = setTimeout(() => {
      setLoaded(true);
    }, 10000);

    return () => {
      clearTimeout(timer);
      if (containerRef.current) {
        containerRef.current.innerHTML = "";
      }
    };
  }, [code, interval]);

  const handleRetry = () => {
    setLoaded(false);
    setError(false);
    if (containerRef.current) {
      containerRef.current.innerHTML = "";
      setTimeout(() => {
        const event = new Event("retry");
        window.dispatchEvent(event);
      }, 100);
    }
    window.location.reload();
  };

  if (error) {
    return (
      <div className="neo-inset relative h-[500px] w-full overflow-hidden rounded-xl">
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-4">
          <div className="text-[14px] text-neo-dim">图表加载失败</div>
          <button onClick={handleRetry} className="neo-btn-primary rounded-md px-4 py-1.5 text-[13px] font-medium">
            重新加载
          </button>
          <p className="text-[11px] text-neo-dim">网络问题或 TradingView 服务不可用</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setInterval(p.key)}
            className={`rounded-full px-3 py-1.5 text-[12px] font-medium transition-all duration-200 ${
              interval === p.key ? "neo-chip-active" : "neo-chip"
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
      <div className="neo-inset relative h-[500px] w-full overflow-hidden rounded-xl">
        {!loaded && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
              <div className="neo-skeleton h-8 w-8 rounded-full" />
              <span className="text-xs text-neo-dim">加载 K 线图...</span>
              <span className="text-[10px] text-neo-dim">如长时间无响应请刷新页面</span>
            </div>
          </div>
        )}
        <div ref={containerRef} className={`h-full w-full ${!loaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-500`} />
      </div>
    </div>
  );
}

export const TradingViewChart = memo(TradingViewChartInner);
