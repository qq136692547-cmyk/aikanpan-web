"use client";

import useSWR from "swr";
import { api, type StockQuote } from "@/lib/api";
import { formatChange, formatPct, formatPrice } from "@/lib/format";
import { WatchlistButton } from "@/components/stock/watchlist-button";

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
  const pct = quote?.change_pct || 0;

  return (
    <div className="neo-card scanline relative mb-4 overflow-hidden p-6 neo-fade-up">
      <div className="relative z-10 flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[20px] font-bold text-neo-ink">{quote?.name || code}</h1>
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
