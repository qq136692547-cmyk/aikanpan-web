import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { api, type StockQuote, type StockMoneyflow, type StockEvents, type Dashboard } from "@/lib/api";
import { formatPrice, formatPct, formatChange, formatVolume, formatAmount, trendClass, trendBgClass } from "@/lib/format";
import { notFound } from "next/navigation";

export const revalidate = 30;

function parseCode(raw: string): string {
  // Accept formats like "sz300414", "sz.300414", "sh600518"
  const lower = raw.toLowerCase();
  if (lower.match(/^(sz|sh)\d{6}$/)) {
    return `${lower.slice(0, 2)}.${lower.slice(2)}`;
  }
  if (lower.match(/^(sz|sh)\.\d{6}$/)) {
    return lower;
  }
  return raw;
}

export default async function StockDetailPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code: rawCode } = await params;
  const code = parseCode(rawCode);
  if (!code.match(/^(sz|sh)\.\d{6}$/)) {
    notFound();
  }

  let quote: StockQuote | null = null;
  let moneyflow: StockMoneyflow | null = null;
  let events: StockEvents | null = null;
  let dashboard: Dashboard | null = null;

  try {
    [quote, moneyflow, events, dashboard] = await Promise.all([
      api.getStockQuote(code),
      api.getStockMoneyflow(code),
      api.getStockEvents(code),
      api.getDashboard(),
    ]);
  } catch (e) {
    console.error("Failed to fetch stock data:", e);
  }

  if (!quote) {
    return (
      <>
        <Navbar />
        <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-20 text-center">
          <p className="text-[var(--text-secondary)]">数据加载中</p>
        </main>
        <Footer />
      </>
    );
  }

  const trend = trendClass(quote.change_pct);
  const bgTrend = trendBgClass(quote.change_pct);
  const stockName = quote.name === quote.code ? quote.code.split(".")[1] : quote.name;
  const isMock = quote._mock || moneyflow?._mock;

  // Find stock in limit_up/limit_down for name
  const limitStock = dashboard?.limit_up.find(s => s.code === code) || dashboard?.limit_down.find(s => s.code === code);
  const displayName = limitStock?.name || stockName;

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        {/* Breadcrumb */}
        <nav className="mb-4 flex items-center gap-2 text-xs text-[var(--text-tertiary)]">
          <a href="/" className="transition-fast hover:text-[var(--text-secondary)]">首页</a>
          <span>/</span>
          <span className="text-[var(--text-secondary)]">个股详情</span>
          <span>/</span>
          <span className="font-num">{code}</span>
        </nav>

        {/* Header */}
        <section className="animate-fade-up">
          <div className="flex flex-wrap items-end gap-4">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-[var(--text-primary)]">{displayName}</h1>
                <span className="font-num rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-sm text-[var(--text-secondary)]">{code}</span>
                {isMock && (
                  <span className="rounded bg-[var(--bg-elevated)] px-2 py-0.5 text-[10px] text-[var(--text-tertiary)]">模拟数据</span>
                )}
              </div>
            </div>
            <div className="flex items-baseline gap-4">
              <span className={`font-num text-4xl font-bold ${trend}`}>{formatPrice(quote.last)}</span>
              <span className={`font-num text-lg ${trend}`}>{formatChange(quote.change)}</span>
              <span className={`rounded px-2 py-0.5 text-sm font-medium ${bgTrend} ${trend}`}>{formatPct(quote.change_pct)}</span>
            </div>
          </div>
        </section>

        {/* Quote Grid */}
        <section className="mt-6 animate-fade-up" style={{ animationDelay: "60ms" }}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            <QuoteCell label="今开" value={formatPrice(quote.open)} />
            <QuoteCell label="最高" value={formatPrice(quote.high)} trend={1} />
            <QuoteCell label="最低" value={formatPrice(quote.low)} trend={-1} />
            <QuoteCell label="昨收" value={formatPrice(quote.prev_close)} />
            <QuoteCell label="成交量" value={formatVolume(quote.volume)} />
            <QuoteCell label="成交额" value={formatAmount(quote.amount)} />
          </div>
        </section>

        {/* AI Summary + Money Flow */}
        <section className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-3">
          {/* AI Summary */}
          {events && (
            <div className="animate-fade-up lg:col-span-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5" style={{ animationDelay: "120ms" }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded bg-brand-soft px-2 py-1 text-[11px] font-medium text-brand">AI 摘要</span>
                <span className="font-num text-[11px] text-[var(--text-tertiary)]">{events.generated_at}</span>
              </div>
              <p className="text-sm leading-relaxed text-[var(--text-primary)]">{events.summary}</p>
              {events.signals.length > 0 && (
                <div className="mt-4 space-y-2">
                  {events.signals.map((sig, i) => (
                    <div key={i} className="flex items-start gap-3 rounded-md border border-[var(--border-subtle)] bg-[var(--bg-elevated)] px-3 py-2">
                      <span className={`mt-0.5 h-2 w-2 shrink-0 rounded-full ${sig.tone === "up" ? "bg-up" : sig.tone === "down" ? "bg-down" : "bg-flat"}`} />
                      <div className="flex-1">
                        <div className="text-xs font-medium text-[var(--text-primary)]">{sig.title}</div>
                        <div className="mt-0.5 text-xs text-[var(--text-secondary)]">{sig.desc}</div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Money Flow */}
          {moneyflow && (
            <div className="animate-fade-up rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-5" style={{ animationDelay: "180ms" }}>
              <div className="mb-3 flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-brand pulse-dot" />
                <h3 className="text-sm font-semibold text-[var(--text-primary)]">资金流向</h3>
                {moneyflow._mock && <span className="text-[10px] text-[var(--text-tertiary)]">(模拟)</span>}
              </div>
              <div className="space-y-3">
                <MoneyRow label="主力净流入" value={moneyflow.main_net_inflow} pct={moneyflow.main_net_inflow_pct} />
                <div className="border-t border-[var(--border-subtle)] pt-3">
                  <div className="mb-2 text-xs text-[var(--text-secondary)]">资金分布</div>
                  <MoneyBar label="超大单" value={moneyflow.super_large_ratio} />
                  <MoneyBar label="大单" value={moneyflow.large_ratio} />
                </div>
              </div>
            </div>
          )}
        </section>

        {/* Market Context */}
        {dashboard && (
          <section className="mt-6 animate-fade-up" style={{ animationDelay: "240ms" }}>
            <h3 className="mb-3 text-base font-semibold text-[var(--text-primary)]">市场环境</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              {dashboard.indices.map((idx) => (
                <a
                  key={idx.code}
                  href="/market/"
                  className="card-hover rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-4"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-[var(--text-secondary)]">{idx.name}</span>
                    <span className={`font-num text-sm font-medium ${trendClass(idx.change_pct)}`}>{formatPct(idx.change_pct)}</span>
                  </div>
                  <div className={`font-num mt-2 text-2xl font-bold ${trendClass(idx.change_pct)}`}>{formatPrice(idx.last)}</div>
                </a>
              ))}
            </div>
          </section>
        )}
      </main>
      <Footer />
    </>
  );
}

function QuoteCell({ label, value, trend }: { label: string; value: string; trend?: number }) {
  return (
    <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-3">
      <div className="text-xs text-[var(--text-tertiary)]">{label}</div>
      <div className={`font-num mt-1 text-sm font-medium ${trend !== undefined ? trendClass(trend) : "text-[var(--text-primary)]"}`}>
        {value}
      </div>
    </div>
  );
}

function MoneyRow({ label, value, pct }: { label: string; value: number; pct: number }) {
  const isPositive = value >= 0;
  return (
    <div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-[var(--text-secondary)]">{label}</span>
        <span className={`font-num font-medium ${isPositive ? "text-up" : "text-down"}`}>
          {isPositive ? "+" : ""}{formatAmount(value)}
        </span>
      </div>
      <div className="mt-1 flex items-center gap-2">
        <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
          <div
            className={`h-full rounded-full ${isPositive ? "bg-up" : "bg-down"}`}
            style={{ width: `${Math.min(Math.abs(pct) * 20, 100)}%` }}
          />
        </div>
        <span className={`font-num text-xs ${isPositive ? "text-up" : "text-down"}`}>{pct.toFixed(2)}%</span>
      </div>
    </div>
  );
}

function MoneyBar({ label, value }: { label: string; value: number }) {
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between text-xs">
        <span className="text-[var(--text-tertiary)]">{label}</span>
        <span className="font-num text-[var(--text-secondary)]">{value.toFixed(1)}%</span>
      </div>
      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[var(--bg-elevated)]">
        <div className="h-full rounded-full bg-brand" style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}
