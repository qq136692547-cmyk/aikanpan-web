"use client";

import { useEffect, useMemo, useState } from "react";
import { RefreshCw } from "lucide-react";
import { api, type KlineData } from "@/lib/api";

interface TradingViewChartProps {
  code: string;
  name?: string;
}

const PERIODS = [
  { days: 30, label: "30日" },
  { days: 60, label: "60日" },
  { days: 120, label: "120日" },
] as const;

function CandleChart({ bars }: { bars: KlineData[] }) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);

  const layout = useMemo(() => {
    const validBars = bars.filter(
      (bar) =>
        Number.isFinite(bar.open) &&
        Number.isFinite(bar.close) &&
        Number.isFinite(bar.high) &&
        Number.isFinite(bar.low) &&
        Number.isFinite(bar.volume)
    );
    if (!validBars.length) return null;

    const prices = validBars.flatMap((bar) => [bar.open, bar.close, bar.high, bar.low]);
    const min = Math.min(...prices);
    const max = Math.max(...prices);
    const range = max - min || Math.abs(max) * 0.01 || 1;
    const paddedMin = min - range * 0.08;
    const paddedMax = max + range * 0.08;
    const priceRange = paddedMax - paddedMin;
    const step = 800 / validBars.length;
    const bodyWidth = Math.max(1.6, Math.min(6.5, step * 0.58));
    const maxVolume = Math.max(...validBars.map((bar) => bar.volume), 1);

    const priceY = (value: number) => 18 + (1 - (value - paddedMin) / priceRange) * 254;
    const volumeY = (value: number) => 384 - (value / maxVolume) * 60;

    return {
      bars: validBars,
      step,
      bodyWidth,
      priceY,
      volumeY,
      min,
      max,
    };
  }, [bars]);

  if (!layout) return null;
  const active = activeIndex != null ? layout.bars[activeIndex] : layout.bars[layout.bars.length - 1];
  const dateStep = Math.max(1, Math.floor(layout.bars.length / 6));

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
        <div className="text-[11px] text-neo-dim">
          {active ? `${active.date} · 开 ${active.open} · 高 ${active.high} · 低 ${active.low} · 收 ${active.close}` : ""}
        </div>
        <div className="flex items-center gap-3 text-[10px] text-neo-dim">
          <span>上涨</span>
          <span className="h-2 w-3 rounded-sm" style={{ background: "var(--neo-up-text)" }} aria-hidden />
          <span>下跌</span>
          <span className="h-2 w-3 rounded-sm" style={{ background: "var(--neo-down-text)" }} aria-hidden />
        </div>
      </div>

      <svg
        viewBox="0 0 800 400"
        className="h-[280px] w-full sm:h-[420px]"
        role="img"
        aria-label="A股日K线图"
        onPointerLeave={() => setActiveIndex(null)}
      >
        {[0, 0.25, 0.5, 0.75, 1].map((ratio) => {
          const y = 18 + ratio * 254;
          const value = layout.max - (layout.max - layout.min) * ratio;
          return (
            <g key={ratio}>
              <line x1="0" x2="800" y1={y} y2={y} stroke="var(--neo-surface-inset)" strokeWidth="1" />
              <text x="6" y={y - 4} fill="var(--neo-dim)" fontSize="10">
                {value.toFixed(2)}
              </text>
            </g>
          );
        })}

        {layout.bars.map((bar, index) => {
          const x = index * layout.step + layout.step / 2;
          const up = bar.close >= bar.open;
          const color = up ? "var(--neo-up-text)" : "var(--neo-down-text)";
          const top = layout.priceY(Math.max(bar.open, bar.close));
          const bottom = layout.priceY(Math.min(bar.open, bar.close));
          const bodyTop = Math.min(top, bottom);
          const bodyHeight = Math.max(1, Math.abs(bottom - top));
          const volumeTop = layout.volumeY(bar.volume);

          return (
            <g key={bar.date} onPointerEnter={() => setActiveIndex(index)}>
              <rect x={x - layout.step / 2} y={0} width={layout.step} height={400} fill="transparent" />
              <line x1={x} x2={x} y1={layout.priceY(bar.high)} y2={layout.priceY(bar.low)} stroke={color} strokeWidth="1" />
              <rect
                x={x - layout.bodyWidth / 2}
                y={bodyTop}
                width={layout.bodyWidth}
                height={bodyHeight}
                fill={color}
                stroke={color}
                strokeWidth="1"
              />
              <rect
                x={x - layout.bodyWidth / 2}
                y={volumeTop}
                width={layout.bodyWidth}
                height={384 - volumeTop}
                fill={color}
                opacity="0.32"
              />
              {index % dateStep === 0 && (
                <text x={x} y={397} fill="var(--neo-dim)" fontSize="9" textAnchor="middle">
                  {bar.date.slice(5)}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function TradingViewChartInner({ code }: TradingViewChartProps) {
  const [bars, setBars] = useState<KlineData[]>([]);
  const [days, setDays] = useState<number>(60);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError(null);

      try {
        const data = await api.getStockHistory(code);
        if (cancelled) return;
        setBars(data.bars || data.klines || []);
      } catch {
        if (!cancelled) {
          setBars([]);
          setError("K 线数据加载失败");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [code, days, reloadKey]);

  const visibleBars = bars.slice(-days);

  return (
    <div className="neo-card p-5">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-[14px] font-semibold text-neo-ink">K 线图</h3>
        <div className="flex flex-wrap items-center gap-1.5">
          {PERIODS.map((item) => (
            <button
              key={item.days}
              type="button"
              onClick={() => setDays(item.days)}
              className={`rounded-full px-3 py-1 text-[12px] font-medium transition-all ${
                days === item.days ? "neo-chip-active" : "neo-chip"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="neo-inset flex h-[280px] items-center justify-center rounded-xl sm:h-[420px]">
          <span className="text-[12px] text-neo-dim">加载 K 线图...</span>
        </div>
      ) : error ? (
        <div className="neo-inset flex h-[280px] flex-col items-center justify-center gap-3 rounded-xl sm:h-[420px]">
          <p className="text-[13px] text-neo-dim">{error}</p>
          <button
            type="button"
            onClick={() => setReloadKey((current) => current + 1)}
            className="neo-btn-primary flex items-center gap-1.5 rounded-md px-4 py-1.5 text-[13px] font-medium"
          >
            <RefreshCw size={13} />
            重新加载
          </button>
        </div>
      ) : visibleBars.length ? (
        <CandleChart bars={visibleBars} />
      ) : (
        <div className="neo-inset flex h-[280px] items-center justify-center rounded-xl sm:h-[420px]">
          <span className="text-[12px] text-neo-dim">暂无 K 线数据</span>
        </div>
      )}
    </div>
  );
}

export const TradingViewChart = TradingViewChartInner;
