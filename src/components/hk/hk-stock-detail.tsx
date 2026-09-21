\"use client\";

import { useEffect, useState } from \"react\";
import { Sparkline } from \"@/components/chart/sparkline\";
import { HkWatchlistButton } from \"./hk-watchlist-button\";
import { StockThesisPanel } from \"@/components/research/stock-thesis-panel\";
import { AIHistoryPanel } from \"@/components/ai/ai-history-panel\";
import { AIComment as StockAIComment } from \"@/components/ai/ai-comment\";
import { formatPct, formatPrice, formatVolume } from \"@/lib/format\";
import { useAuth } from \"@/lib/auth\";
import {
  api,
  type AIComment,
  type HkFinancials,
  type HkHistory,
  type HkNewsItem,
  type HkQuote,
  type StockIndicators,
} from \"@/lib/api\";
import { TrendingUp, TrendingDown, Activity, ArrowUpRight, ShieldAlert, BarChart3, LineChart } from \"lucide-react\";

export type HkStockDetailInitialData = {
  quote?: HkQuote | null;
  history?: HkHistory | null;
  financials?: HkFinancials | null;
  news?: HkNewsItem[];
  indicators?: StockIndicators | null;
  ai?: AIComment | null;
};

function formatHkMarketCap(val: number | null | undefined): string {
  if (val == null || !Number.isFinite(val)) return \"--\";
  if (val >= 1e12) return (val / 1e12).toFixed(2) + \"万亿\";
  if (val >= 1e8) return (val / 1e8).toFixed(2) + \"亿\";
  if (val >= 1e4) return (val / 1e4).toFixed(0) + \"万\";
  return val.toLocaleString();
}

function latestValue(value: number | number[] | null | undefined): number {
  if (value == null) return 0;
  if (Array.isArray(value)) {
    const vals = value.filter((v) => typeof v === \"number\" && Number.isFinite(v));
    return vals.length ? vals[vals.length - 1] : 0;
  }
  return Number.isFinite(value) ? value : 0;
}

export function HkStockDetail({
  symbol,
  initialData,
}: {
  symbol: string;
  initialData?: HkStockDetailInitialData;
}) {
  const { isAuthenticated } = useAuth();
  const [quote, setQuote] = useState<HkQuote | null>(initialData?.quote ?? null);
  const [history, setHistory] = useState<HkHistory | null>(initialData?.history ?? null);
  const [financials, setFinancials] = useState<HkFinancials | null>(initialData?.financials ?? null);
  const [news, setNews] = useState<HkNewsItem[]>(initialData?.news ?? []);
  const [indicators, setIndicators] = useState<StockIndicators | null>(initialData?.indicators ?? null);
  const [ai, setAi] = useState<AIComment | null>(initialData?.ai ?? null);
  const [, setAiLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setAiLoading(true);
    Promise.allSettled([
      api.getHkQuote(symbol),
      api.getHkHistory(symbol, 120),
      api.getHkFinancials(symbol),
      api.getHkNews(symbol, 8),
      api.getHkIndicators(symbol, 120),
      isAuthenticated ? api.getHkAI(symbol) : Promise.resolve(null),
    ]).then(([q, h, f, n, ind, a]) => {
      if (cancelled) return;
      if (q.status === \"fulfilled\") setQuote(q.value);
      if (h.status === \"fulfilled\") setHistory(h.value);
      if (f.status === \"fulfilled\") setFinancials(f.value);
      if (n.status === \"fulfilled\") setNews(n.value.news);
      if (ind.status === \"fulfilled\") setIndicators(ind.value);
      if (a.status === \"fulfilled\") setAi(a.value);
      setAiLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [symbol, isAuthenticated]);

  const trend = (quote?.change_pct ?? 0) > 0 ? 1 : (quote?.change_pct ?? 0) < 0 ? -1 : 0;
  const metrics = financials?.metrics;

  return (
    <div className=\"space-y-4\">
      {/* 顶部行情核心看板：采用现代金融终端 Hero Bento 布局 */}
      <section className=\"relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#101216]/90 p-6 shadow-2xl backdrop-blur-xl transition-all duration-300 hover:border-white/[0.12]\">
        {/* 背景微光氛围光环 */}
        <div
          className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl transition-opacity duration-700 ${
            trend > 0 ? \"bg-red-500/10\" : trend < 0 ? \"bg-emerald-500/10\" : \"bg-indigo-500/5\"
          }`}
        />

        <div className=\"relative flex flex-wrap items-start justify-between gap-4\">
          <div>
            <div className=\"flex flex-wrap items-center gap-2.5\">
              <h1 className=\"text-2xl font-black tracking-tight text-neutral-100 sm:text-3xl\">
                {quote?.name || symbol}
              </h1>
              <span className=\"inline-flex items-center rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-purple-400\">
                {symbol} · 港股
              </span>
              <span className=\"inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-neutral-400\">
                {quote?.currency || \"HKD\"}
              </span>
            </div>

            <div className=\"mt-3 flex flex-wrap items-baseline gap-3.5\">
              <span className=\"font-mono text-4xl font-extrabold tracking-tight text-neutral-100 sm:text-5xl tabular-nums\">
                {formatPrice(quote?.last ?? 0)}
              </span>

              {/* 涨跌幅胶囊微标 */}
              <div
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-sm font-bold tracking-tight shadow-sm ${
                  trend > 0
                    ? \"border border-red-500/25 bg-red-500/15 text-red-400\"
                    : trend < 0
                    ? \"border border-emerald-500/25 bg-emerald-500/15 text-emerald-400\"
                    : \"border border-white/10 bg-white/5 text-neutral-300\"
                }`}
              >
                {trend > 0 ? <TrendingUp size={15} /> : trend < 0 ? <TrendingDown size={15} /> : null}
                <span>
                  {quote?.change != null ? (quote.change >= 0 ? `+${quote.change.toFixed(2)}` : quote.change.toFixed(2)) : \"--\"}
                </span>
                <span className=\"opacity-80\">({formatPct(quote?.change_pct ?? 0)})</span>
              </div>
            </div>

            <div className=\"mt-2 flex items-center gap-3 text-xs text-neutral-500\">
              <span>{quote?.source === \"unavailable\" ? \"数据暂不可用\" : `实时源：${quote?.source ?? \"腾讯行情\"}`}</span>
              <span>•</span>
              <span>{quote?.date ? `最后交易日：${quote.date}` : \"日内实时更新\"}</span>
            </div>
          </div>

          <HkWatchlistButton code={symbol} name={quote?.name || symbol} />
        </div>

        {/* 优雅平滑走势图 */}
        <div className=\"mt-5 pt-2\">
          <Sparkline data={history?.closes ?? []} trend={trend} height={52} className=\"w-full opacity-90 transition-opacity hover:opacity-100\" />
        </div>
      </section>

      {/* 六宫格日内盘口指标网格 (Bento Inset Grid) */}
      {quote && (
        <section className=\"rounded-2xl border border-white/[0.08] bg-[#101216]/80 p-5 shadow-xl backdrop-blur-md\">
          <div className=\"flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400\">
            <Activity size={14} className=\"text-indigo-400\" />
            <span>日内核心盘口</span>
          </div>

          <div className=\"mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6\">
            {[
              { label: \"今开\", value: quote.open ?? 0, fmt: formatPrice, raw: quote.open },
              { label: \"最高\", value: quote.high ?? 0, fmt: formatPrice, color: \"text-red-400\", raw: quote.high },
              { label: \"最低\", value: quote.low ?? 0, fmt: formatPrice, color: \"text-emerald-400\", raw: quote.low },
              { label: \"昨收\", value: quote.prev_close ?? 0, fmt: formatPrice, raw: quote.prev_close },
              { label: \"成交量\", value: quote.volume ?? 0, fmt: formatVolume, raw: quote.volume },
              { label: \"成交额\", value: quote.amount ?? 0, fmt: formatHkMarketCap, raw: quote.amount },
            ].map((item) => (
              <div
                key={item.label}
                className=\"group rounded-xl border border-white/[0.05] bg-[#0C0E11]/80 px-3.5 py-3 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#14171C]\"
              >
                <div className=\"text-[11px] font-medium text-neutral-500 group-hover:text-neutral-400\">{item.label}</div>
                <div className={`mt-1 font-mono text-[15px] font-bold tracking-tight ${item.color || \"text-neutral-100\"} tabular-nums`}>
                  {item.raw ? item.fmt(item.value) : \"--\"}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* 港股专属深度估值与财务看板 (含股息率/EPS/BPS/振幅) */}
      {financials?.available && metrics && (
        <section className=\"rounded-2xl border border-white/[0.08] bg-[#101216]/80 p-5 shadow-xl backdrop-blur-md\">
          <div className=\"flex items-center justify-between\">
            <div className=\"flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400\">
              <BarChart3 size={14} className=\"text-purple-400\" />
              <span>港股特色财务与估值</span>
            </div>
            <span className=\"font-mono text-[11px] text-neutral-500\">
              总市值：{formatHkMarketCap(metrics.market_cap)}
            </span>
          </div>

          <div className=\"mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-3 lg:grid-cols-6\">
            {/* 股息率微标高亮 */}
            <div className=\"group rounded-xl border border-purple-500/20 bg-purple-500/[0.04] px-3.5 py-3 transition-all duration-200 hover:border-purple-500/40 hover:bg-purple-500/[0.08]\">
              <div className=\"flex items-center justify-between text-[11px] font-semibold text-purple-300\">
                <span>股息率 (TTM)</span>
                <span className=\"h-1.5 w-1.5 rounded-full bg-purple-400\" />
              </div>
              <div className=\"mt-1 font-mono text-[16px] font-black text-purple-300 tabular-nums\">
                {metrics.dividend_yield != null
                  ? `${metrics.dividend_yield.toFixed(2)}%`
                  : quote?.dividend_yield != null
                  ? `${quote.dividend_yield.toFixed(2)}%`
                  : \"--\"}
              </div>
            </div>

            <div className=\"group rounded-xl border border-white/[0.05] bg-[#0C0E11]/80 px-3.5 py-3 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#14171C]\">
              <div className=\"text-[11px] font-medium text-neutral-500\">市盈率 (PE)</div>
              <div className=\"mt-1 font-mono text-[15px] font-bold text-neutral-100 tabular-nums\">{metrics.pe ?? \"--\"}</div>
            </div>

            <div className=\"group rounded-xl border border-white/[0.05] bg-[#0C0E11]/80 px-3.5 py-3 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#14171C]\">
              <div className=\"text-[11px] font-medium text-neutral-500\">市净率 (PB)</div>
              <div className=\"mt-1 font-mono text-[15px] font-bold text-neutral-100 tabular-nums\">{metrics.pb ?? \"--\"}</div>
            </div>

            <div className=\"group rounded-xl border border-white/[0.05] bg-[#0C0E11]/80 px-3.5 py-3 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#14171C]\">
              <div className=\"text-[11px] font-medium text-neutral-500\">每股收益 EPS</div>
              <div className=\"mt-1 font-mono text-[15px] font-bold text-neutral-200 tabular-nums\">
                {metrics.eps != null ? `HK$${metrics.eps.toFixed(3)}` : quote?.eps != null ? `HK$${quote.eps.toFixed(3)}` : \"--\"}
              </div>
            </div>

            <div className=\"group rounded-xl border border-white/[0.05] bg-[#0C0E11]/80 px-3.5 py-3 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#14171C]\">
              <div className=\"text-[11px] font-medium text-neutral-500\">每股净资产 BPS</div>
              <div className=\"mt-1 font-mono text-[15px] font-bold text-neutral-200 tabular-nums\">
                {metrics.bps != null ? `HK$${metrics.bps.toFixed(3)}` : quote?.bps != null ? `HK$${quote.bps.toFixed(3)}` : \"--\"}
              </div>
            </div>

            <div className=\"group rounded-xl border border-amber-500/20 bg-amber-500/[0.04] px-3.5 py-3 transition-all duration-200 hover:border-amber-500/40 hover:bg-amber-500/[0.08]\">
              <div className=\"text-[11px] font-medium text-amber-400/80\">日振幅 (Amp)</div>
              <div className=\"mt-1 font-mono text-[15px] font-bold text-amber-300 tabular-nums\">
                {metrics.amplitude != null
                  ? `${metrics.amplitude.toFixed(2)}%`
                  : quote?.amplitude != null
                  ? `${quote.amplitude.toFixed(2)}%`
                  : \"--\"}
              </div>
            </div>
          </div>

          <div className=\"mt-3 flex flex-wrap items-center justify-between gap-2 border-t border-white/[0.05] pt-2.5 text-[11px] text-neutral-500\">
            <span>
              52周波动区间：
              <strong className=\"font-mono font-normal text-neutral-300\">
                {metrics.low_52w != null ? formatPrice(metrics.low_52w) : \"--\"} ~ {metrics.high_52w != null ? formatPrice(metrics.high_52w) : \"--\"}
              </strong>
            </span>
            <span>财报及盘口数据源：腾讯行情（实时同步）</span>
          </div>
        </section>
      )}

      {/* 港股量化技术指标诊断网格 (MACD / KDJ / RSI / BOLL) */}
      {indicators && (
        <section className=\"rounded-2xl border border-white/[0.08] bg-[#101216]/80 p-5 shadow-xl backdrop-blur-md\">
          <div className=\"flex items-center justify-between\">
            <div className=\"flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-neutral-400\">
              <LineChart size={14} className=\"text-cyan-400\" />
              <span>量化技术指标分析</span>
            </div>
            <span className=\"font-mono text-[11px] text-neutral-500\">日线级别 · 120日 K 线推演</span>
          </div>

          <div className=\"mt-3.5 grid grid-cols-2 gap-2.5 sm:grid-cols-4\">
            {indicators.macd && (
              <div className=\"rounded-xl border border-white/[0.05] bg-[#0C0E11]/80 p-3.5\">
                <div className=\"text-[11px] font-bold text-neutral-400\">MACD (12, 26, 9)</div>
                <div className=\"mt-2 space-y-1 font-mono text-xs\">
                  <div className=\"flex justify-between\">
                    <span className=\"text-neutral-500\">DIF</span>
                    <span className=\"text-neutral-200 tabular-nums\">{latestValue(indicators.macd.dif).toFixed(3)}</span>
                  </div>
                  <div className=\"flex justify-between\">
                    <span className=\"text-neutral-500\">DEA</span>
                    <span className=\"text-neutral-200 tabular-nums\">{latestValue(indicators.macd.dea).toFixed(3)}</span>
                  </div>
                  <div className=\"flex justify-between border-t border-white/[0.04] pt-1 font-semibold\">
                    <span className=\"text-neutral-500\">MACD 柱</span>
                    <span
                      className={`tabular-nums ${
                        latestValue(indicators.macd.macd) >= 0 ? \"text-red-400\" : \"text-emerald-400\"
                      }`}
                    >
                      {latestValue(indicators.macd.macd).toFixed(3)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {indicators.kdj && (
              <div className=\"rounded-xl border border-white/[0.05] bg-[#0C0E11]/80 p-3.5\">
                <div className=\"text-[11px] font-bold text-neutral-400\">KDJ (9, 3, 3)</div>
                <div className=\"mt-2 space-y-1 font-mono text-xs\">
                  <div className=\"flex justify-between\">
                    <span className=\"text-neutral-500\">K</span>
                    <span className=\"text-neutral-200 tabular-nums\">{latestValue(indicators.kdj.k).toFixed(2)}</span>
                  </div>
                  <div className=\"flex justify-between\">
                    <span className=\"text-neutral-500\">D</span>
                    <span className=\"text-neutral-200 tabular-nums\">{latestValue(indicators.kdj.d).toFixed(2)}</span>
                  </div>
                  <div className=\"flex justify-between border-t border-white/[0.04] pt-1 font-semibold\">
                    <span className=\"text-neutral-500\">J</span>
                    <span
                      className={`tabular-nums ${
                        latestValue(indicators.kdj.j) >= 0 ? \"text-red-400\" : \"text-emerald-400\"
                      }`}
                    >
                      {latestValue(indicators.kdj.j).toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {indicators.rsi != null && (
              <div className=\"rounded-xl border border-white/[0.05] bg-[#0C0E11]/80 p-3.5\">
                <div className=\"text-[11px] font-bold text-neutral-400\">RSI 相对强弱 (14)</div>
                <div className=\"mt-2 font-mono text-2xl font-black text-neutral-100 tabular-nums\">
                  {latestValue(indicators.rsi).toFixed(2)}
                </div>
                <div className=\"mt-1 text-[11px] font-medium text-neutral-500\">
                  {latestValue(indicators.rsi) >= 80 ? (
                    <span className=\"text-red-400\">超买区间 (警惕调整)</span>
                  ) : latestValue(indicators.rsi) <= 20 ? (
                    <span className=\"text-emerald-400\">超卖区间 (逢低关注)</span>
                  ) : (
                    \"中性蓄势运行\"
                  )}
                </div>
              </div>
            )}

            {indicators.boll && (
              <div className=\"rounded-xl border border-white/[0.05] bg-[#0C0E11]/80 p-3.5\">
                <div className=\"text-[11px] font-bold text-neutral-400\">BOLL 布林带 (20, 2)</div>
                <div className=\"mt-2 space-y-1 font-mono text-xs\">
                  <div className=\"flex justify-between\">
                    <span className=\"text-neutral-500\">上轨</span>
                    <span className=\"text-neutral-200 tabular-nums\">{latestValue(indicators.boll.upper).toFixed(2)}</span>
                  </div>
                  <div className=\"flex justify-between\">
                    <span className=\"text-neutral-500\">中轨</span>
                    <span className=\"text-neutral-200 tabular-nums\">{latestValue(indicators.boll.mid).toFixed(2)}</span>
                  </div>
                  <div className=\"flex justify-between\">
                    <span className=\"text-neutral-500\">下轨</span>
                    <span className=\"text-neutral-200 tabular-nums\">{latestValue(indicators.boll.lower).toFixed(2)}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* 相关资讯流 (Bento News List) */}
      {news.length > 0 && (
        <section className=\"rounded-2xl border border-white/[0.08] bg-[#101216]/80 p-5 shadow-xl backdrop-blur-md\">
          <h2 className=\"text-xs font-bold uppercase tracking-wider text-neutral-400\">港股权威研报与快讯</h2>
          <div className=\"mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2\">
            {news.slice(0, 6).map((n) => (
              <a
                key={n.id || n.title}
                href={n.url || \"#\"}
                target=\"_blank\"
                rel=\"noopener noreferrer\"
                className=\"group rounded-xl border border-white/[0.04] bg-[#0C0E11]/70 p-3.5 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#14171C]\"
              >
                <div className=\"flex items-start justify-between gap-2\">
                  <h3 className=\"text-[13px] font-semibold text-neutral-200 group-hover:text-indigo-400 line-clamp-1 transition-colors\">
                    {n.title}
                  </h3>
                  <ArrowUpRight size={14} className=\"shrink-0 text-neutral-600 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-indigo-400\" />
                </div>
                {n.summary && <p className=\"mt-1.5 line-clamp-2 text-xs leading-relaxed text-neutral-400\">{n.summary}</p>}
                <div className=\"mt-2 font-mono text-[10px] text-neutral-500\">
                  {n.source} · {n.time}
                </div>
              </a>
            ))}
          </div>
        </section>
      )}

      {/* 投资论点分析抽屉 */}
      <StockThesisPanel code={symbol} market=\"hk\" />

      {/* 统一架构的高级量化 AI 终端解读面板 */}
      <StockAIComment code={symbol} market=\"hk\" initialData={ai} />

      {/* AI 历史回顾面板 */}
      <AIHistoryPanel code={symbol} kind=\"hk_stock_ai\" />
    </div>
  );
}
