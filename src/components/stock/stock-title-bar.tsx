"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { api, type StockQuote } from "@/lib/api";
import { formatChange, formatPct, formatPrice } from "@/lib/format";
import { WatchlistButton } from "@/components/stock/watchlist-button";

function seededRandom(seed: number) {
  let t = seed + 0x6d2b79f5;
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface ChartShape {
  points: string;
  area: string;
  bars: { x: number; y: number; h: number; up: boolean }[];
}

function buildChart(code: string, quote: StockQuote): ChartShape {
  const seed = Number(code.replace(/[^0-9]/g, "").slice(-6)) || 301366;
  const rand = seededRandom(seed);
  const count = 18;
  const start = quote.prev_close || quote.last;
  const end = quote.last || start;
  const lo = quote.low || Math.min(start, end);
  const hi = quote.high || Math.max(start, end);
  const span = Math.max(hi - lo, Math.abs(end - start), 0.01);
  const closes: number[] = [];
  let value = start;
  for (let i = 0; i < count; i += 1) {
    const progress = i / (count - 1);
    const target = start + (end - start) * progress;
    const noise = (rand() - 0.5) * span * 0.55;
    value = Math.min(hi, Math.max(lo, target + noise));
    closes.push(value);
  }
  closes[count - 1] = end;
  const min = Math.min(...closes, lo);
  const max = Math.max(...closes, hi);
  const range = max - min || 1;
  const yFor = (v: number) => 220 - ((v - min) / range) * 180 - 10;
  const points = closes
    .map((v, i) => {
      const x = (i / (count - 1)) * 800;
      return `${x.toFixed(1)},${yFor(v).toFixed(1)}`;
    })
    .join(" ");
  const area = `0,230 ${points} 800,230`;
  const bars = closes.slice(0, -1).map((open, i) => {
    const close = closes[i + 1];
    const x = (i / (count - 1)) * 800 + 10;
    const yOpen = yFor(open);
    const yClose = yFor(close);
    const top = Math.min(yOpen, yClose);
    const h = Math.max(Math.abs(yClose - yOpen), 2);
    return { x, y: top, h, up: close >= open };
  });
  return { points, area, bars };
}

function trendClass(n: number) {
  if (n > 0) return "text-neo-up";
  if (n < 0) return "text-neo-down";
  return "text-neo-mid";
}

export function StockTitleBar({ code, initial }: { code: string; initial: StockQuote | null }) {
  const { data } = useSWR(
    `stock-title-${code}`,
    () => api.getStockQuote(code),
    { refreshInterval: 30000, fallbackData: initial || undefined }
  );
  const quote = data || initial;
  const chart = useMemo(() => (quote ? buildChart(code, quote) : null), [code, quote]);
  const pct = quote?.change_pct || 0;
  const lineColor = pct > 0 ? "#ff4d5e" : pct < 0 ? "#22b07d" : "#9aa4b5";
  const barColor = pct < 0 ? "#22b07d" : lineColor;
  const idSafe = code.replace(/[^a-zA-Z0-9]/g, "");

  return (
    <div className="neo-card scanline relative mb-4 overflow-hidden p-6 neo-fade-up">
      {chart && (
        <svg
          viewBox="0 0 800 240"
          preserveAspectRatio="none"
          aria-hidden
          className="pointer-events-none absolute inset-0 h-full w-full opacity-20"
        >
          <defs>
            <linearGradient id={`stock-fill-${idSafe}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={lineColor} stopOpacity="0.26" />
              <stop offset="100%" stopColor={lineColor} stopOpacity="0" />
            </linearGradient>
            <filter id={`stock-glow-${idSafe}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
          </defs>
          <polygon points={chart.area} fill={`url(#stock-fill-${idSafe})`} />
          <polyline
            points={chart.points}
            fill="none"
            stroke={lineColor}
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="kline-glow"
            filter={`url(#stock-glow-${idSafe})`}
          />
          <polyline
            points={chart.points}
            fill="none"
            stroke={lineColor}
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="kline-draw"
          />
          {chart.bars.map((b, i) => (
            <rect key={i} x={b.x} y={b.y} width="6" height={b.h} rx="1.5" fill={b.up ? barColor : "#22b07d"} opacity="0.4" />
          ))}
        </svg>
      )}
      <span className="pointer-events-none absolute bottom-3 left-3 z-10 rounded bg-[var(--neo-surface-inset)]/80 px-1.5 py-0.5 text-[10px] text-neo-dim">
        示例走势
      </span>
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-bold text-neo-ink">{quote?.name || code}</h1>
            {quote && <span className="pulse-dot h-1.5 w-1.5 rounded-full bg-[var(--neo-up)]" />}
          </div>
          <p className="mt-0.5 text-[12px] text-neo-dim">{code}</p>
        </div>
        {quote && (
          <div className="flex items-center gap-3">
            <div className="text-right whitespace-nowrap">
              <div
                key={quote.last}
                className={`price-tick text-[26px] font-bold leading-none sm:text-[36px] ${trendClass(pct)}`}
                style={{ fontFamily: 'var(--font-inter), system-ui' }}
              >
                {formatPrice(quote.last)}
              </div>
              <div className={`mt-1 text-[14px] ${trendClass(pct)}`} style={{ fontFamily: 'var(--font-inter), system-ui' }}>
                {formatChange(quote.change)} ({formatPct(quote.change_pct)})
              </div>
            </div>
            <WatchlistButton code={code} name={quote.name || code} />
          </div>
        )}
      </div>
    </div>
  );
}
