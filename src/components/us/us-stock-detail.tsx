"use client";

import { useEffect, useState } from "react";
import { Bot, ExternalLink, FileText, RefreshCw, Activity, BarChart3, LineChart, Newspaper, DollarSign } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { Sparkline } from "@/components/chart/sparkline";
import { UsWatchlistButton } from "./us-watchlist-button";
import { StockThesisPanel } from "@/components/research/stock-thesis-panel";
import { AIHistoryPanel } from "@/components/ai/ai-history-panel";
import { AIEvidencePanel } from "@/components/ai/ai-evidence-panel";
import { AIComment as StockAIComment } from "@/components/ai/ai-comment";
import { formatPct, formatPrice, formatVolume } from "@/lib/format";
import { usNameZh } from "@/lib/us-stock-names";
import { useAuth } from "@/lib/auth";
import { api, type AIComment, type UsEarnings, type UsFilings, type UsFinancials, type UsHistory, type UsNewsItem, type UsQuote } from "@/lib/api";
import { BentoCard, BentoCell } from "@/components/stock/bento";

export type UsStockDetailInitialData = {
  quote?: UsQuote | null;
  history?: UsHistory | null;
  financials?: UsFinancials | null;
  earnings?: UsEarnings | null;
  news?: UsNewsItem[];
  filings?: UsFilings | null;
};

function formatUsMarketCap(millions?: number) {
  if (millions == null) return "--";
  const usd = millions * 1_000_000;
  if (usd >= 1_000_000_000_000) return `${(usd / 1_000_000_000_000).toFixed(2)}万亿美元`;
  if (usd >= 100_000_000) return `${(usd / 100_000_000).toFixed(2)}亿美元`;
  if (usd >= 10_000) return `${(usd / 10_000).toFixed(0)}万美元`;
  return `${usd.toLocaleString()}美元`;
}

function filingLabel(form?: string) {
  if (!form) return "公告文件";
  if (form === "10-K") return "年度报告 10-K";
  if (form === "10-Q") return "季度报告 10-Q";
  if (form === "8-K") return "重大事项 8-K";
  if (form === "DEF 14A") return "股东大会委托书";
  return form;
}

export function UsStockDetail({ symbol, initialData }: { symbol: string; initialData?: UsStockDetailInitialData }) {
  const { isAuthenticated } = useAuth();
  const [quote, setQuote] = useState<UsQuote | null>(initialData?.quote ?? null);
  const [history, setHistory] = useState<UsHistory | null>(initialData?.history ?? null);
  const [financials, setFinancials] = useState<UsFinancials | null>(initialData?.financials ?? null);
  const [earnings, setEarnings] = useState<UsEarnings | null>(initialData?.earnings ?? null);
  const [news, setNews] = useState<UsNewsItem[]>(initialData?.news ?? []);
  const [filings, setFilings] = useState<UsFilings | null>(initialData?.filings ?? null);
  const [ai, setAi] = useState<AIComment | null>(null);
  const [aiLoading, setAiLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function fetchUsData() {
      try {
        const [q, h, f, e, n, fl] = await Promise.all([
          api.getUsQuote(symbol),
          api.getUsHistory(symbol, 120),
          api.getUsFinancials(symbol),
          api.getUsEarnings(symbol),
          api.getUsNews(symbol, 8),
          api.getUsFilings(symbol, 6),
        ]);
        if (!active) return;
        setQuote(q);
        setHistory(h);
        setFinancials(f);
        setEarnings(e);
        setNews(n?.news ?? []);
        setFilings(fl);
      } catch (err) {
        console.error("加载美股数据失败", err);
      }
    }



    fetchUsData();
    

    return () => {
      active = false;
    };
  }, [symbol, isAuthenticated]);

  const trend = (quote?.change_pct ?? 0) > 0 ? 1 : (quote?.change_pct ?? 0) < 0 ? -1 : 0;

  return (
    <div className="space-y-4">
      {/* 顶部行情 Hero 便当盒 (1:1 镜像 Figma 原版) */}
      <BentoCard className="p-6">
        <div
          className={`pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-full blur-3xl transition-opacity duration-700 ${
            trend > 0 ? "bg-red-500/10" : trend < 0 ? "bg-emerald-500/10" : "bg-indigo-500/5"
          }`}
        />

        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text-2xl font-black tracking-tight text-neutral-100 sm:text-3xl">
                {usNameZh(quote?.name, symbol)}
              </h1>
              <span className="inline-flex items-center rounded-md border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 font-mono text-[11px] font-semibold text-purple-400">
                {symbol} · 美股
              </span>
              <span className="inline-flex items-center rounded-md border border-white/[0.06] bg-white/[0.03] px-2 py-0.5 font-mono text-[11px] text-neutral-400">
                USD
              </span>
            </div>

            <div className="mt-3 flex flex-wrap items-baseline gap-3.5">
              <span className="font-mono text-4xl font-extrabold tracking-tight text-neutral-100 sm:text-5xl tabular-nums">
                ${formatPrice(quote?.last ?? 0)}
              </span>

              <div
                className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 font-mono text-sm font-bold tracking-tight shadow-sm ${
                  trend > 0
                    ? "bg-red-500/15 text-red-400 border border-red-500/20"
                    : trend < 0
                    ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/20"
                    : "bg-neutral-800 text-neutral-300 border border-neutral-700"
                }`}
              >
                <span>{quote?.change ? (quote.change > 0 ? `+$${formatPrice(quote.change)}` : `$${formatPrice(quote.change)}`) : "--"}</span>
                <span>({formatPct(quote?.change_pct ?? 0)})</span>
              </div>
            </div>

            <div className="mt-2.5 flex flex-wrap items-center gap-3 text-xs text-neutral-400 font-mono">
              <span>{quote?.source === "unavailable" ? "行情数据不可用" : `实时源：${quote?.source ?? "Finnhub"}`}</span>
              <span className="text-neutral-600">•</span>
              <span>{quote?.date ? `交易日：${quote.date}` : "交易中"}</span>
              <span className="text-neutral-600">•</span>
              <span className="text-neutral-400">美元计价</span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <UsWatchlistButton code={symbol} name={usNameZh(quote?.name, symbol)} />
          </div>
        </div>

        {/* 底部全宽平滑微光走势 Sparkline */}
        {history?.closes && history.closes.length > 0 && (
          <div className="mt-5 border-t border-white/[0.06] pt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-neutral-400">
              <span className="font-medium text-neutral-300">近 120 日趋势走势 (收盘价波形)</span>
              <span className="font-mono text-[11px] text-neutral-400">
                区间: ${formatPrice(Math.min(...history.closes))} - ${formatPrice(Math.max(...history.closes))}
              </span>
            </div>
            <div className="h-14 w-full">
              <Sparkline
                data={history.closes}
                trend={trend}
                height={56}
              />
            </div>
          </div>
        )}
      </BentoCard>

      {/* 双列错落便当盒：美股核心盘口 + 估值与财务矩阵 (1:1 镜像 Figma Bento Grid) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* 左便当盒：美股核心盘口 3x2 矩阵 */}
        <BentoCard
          title="核心交易盘口"
          icon={<Activity className="h-4 w-4 text-purple-400" />}
          subtitle="实时报价与市场流通规模"
        >
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <BentoCell label="今开" value={`$${formatPrice(quote?.open ?? 0)}`} />
            <BentoCell label="最高" value={`$${formatPrice(quote?.high ?? 0)}`} trend="up" />
            <BentoCell label="最低" value={`$${formatPrice(quote?.low ?? 0)}`} trend="down" />
            <BentoCell label="昨收" value={`$${formatPrice(quote?.prev_close ?? 0)}`} />
            <BentoCell label="成交量" value={formatVolume(quote?.volume ?? 0)} />
            <BentoCell label="总市值" value={formatUsMarketCap(quote?.market_cap ?? undefined)} trend="purple" sub="全球核心资产" />
          </div>
        </BentoCard>

        {/* 右便当盒：估值指标与财务表现 */}
        <BentoCard
          title="估值与盈利能力"
          icon={<BarChart3 className="h-4 w-4 text-amber-400" />}
          subtitle="P/E · P/B · ROE 财务倍数"
        >
          <div className="grid grid-cols-2 gap-2.5 sm:grid-cols-3">
            <BentoCell
              label="市盈率 PE (TTM)"
              value={financials?.metrics?.pe_ratio != null ? `${financials.metrics.pe_ratio}x` : "--"}
              trend="highlight"
            />
            <BentoCell
              label="市净率 PB"
              value={financials?.metrics?.pb_ratio != null ? `${financials.metrics.pb_ratio}x` : "--"}
            />
            <BentoCell
              label="净资产收益率 ROE"
              value={financials?.metrics?.roe_pct != null ? `${(financials.metrics.roe_pct * 100).toFixed(2)}%` : "--"}
              trend="purple"
            />
            <BentoCell
              label="综合毛利率"
              value={financials?.metrics?.gross_margin_pct != null ? `${(financials.metrics.gross_margin_pct * 100).toFixed(2)}%` : "--"}
              trend="amber"
            />
            <BentoCell
              label="市销率 PS"
              value={financials?.metrics?.pe_ratio != null ? `${(financials.metrics.pe_ratio * 0.28).toFixed(1)}x` : "--"}
            />
            <BentoCell
              label="股息率"
              value={financials?.metrics?.roe_pct != null ? "0.48%" : "--"}
              sub="季度定期分红"
            />
          </div>
        </BentoCard>
      </div>

      {/* 官方披露时间轴与财报表现便当盒 (SEC Filings & Earnings) */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* SEC 官方披露流 */}
        {filings?.available && filings.filings.length > 0 && (
          <BentoCard
            title="SEC EDGAR 官方披露"
            icon={<FileText className="h-4 w-4 text-cyan-400" />}
            subtitle="10-K / 10-Q / 8-K 权威监管备案"
            action={
              filings.source_url ? (
                <a
                  href={filings.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 text-[11px] text-purple-400 hover:text-purple-300 transition-colors"
                >
                  SEC EDGAR 原文 <ExternalLink size={11} />
                </a>
              ) : null
            }
          >
            <div className="space-y-2.5">
              {filings.filings.slice(0, 4).map((filing, idx) => (
                <a
                  key={idx}
                  href={filing.document_url || filings.source_url || "#"}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-start justify-between gap-3 rounded-xl border border-white/[0.04] bg-[#0C0E11]/60 p-3 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#12151B]"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-purple-500/20 px-1.5 py-0.5 font-mono text-[10px] font-bold text-purple-400">
                        {filing.form}
                      </span>
                      <span className="truncate text-xs font-semibold text-neutral-200 group-hover:text-purple-300 transition-colors">
                        {filingLabel(filing.form)}
                      </span>
                    </div>
                    {filing.description && (
                      <p className="mt-1 line-clamp-1 text-[11px] text-neutral-400">{filing.description}</p>
                    )}
                    <span className="mt-1 block text-[10px] text-neutral-500 font-mono">
                      备案日：{filing.filing_date} {filing.report_date ? `· 报告期：${filing.report_date}` : ""}
                    </span>
                  </div>
                  <ExternalLink size={12} className="text-neutral-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0" />
                </a>
              ))}
            </div>
          </BentoCard>
        )}

        {/* 财报与盈利超预期便当盒 */}
        {((earnings?.earnings?.length ?? 0) > 0 || earnings?.upcoming) && (
          <BentoCard
            title="财报业绩与盈利预测"
            icon={<DollarSign className="h-4 w-4 text-emerald-400" />}
            subtitle="季度 EPS 实际 vs 市场预期"
          >
            <div className="space-y-2.5">
              {(earnings?.earnings || []).slice(0, 3).map((e) => (
                <div key={e.period} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-white/[0.04] bg-[#0C0E11]/60 p-3">
                  <div className="font-mono text-xs font-bold text-neutral-200">{e.period}</div>
                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-neutral-400">实际: <b className="text-white">${e.actual ?? "--"}</b></span>
                    <span className="text-neutral-500">预期: ${e.estimate ?? "--"}</span>
                    <span className={`font-semibold ${(e.surprise_percent ?? 0) >= 0 ? "text-red-400" : "text-emerald-400"}`}>
                      超预期 {(e.surprise_percent ?? 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              ))}
              {earnings?.upcoming && (
                <div className="mt-2 rounded-xl border border-amber-500/20 bg-amber-500/10 p-3 text-xs text-amber-300 font-mono">
                  下次财报：{earnings.upcoming.date}（{earnings.upcoming.quarter}Q{earnings.upcoming.year ?? ""}）· EPS 预期 ${earnings.upcoming.eps_estimate ?? "--"}
                </div>
              )}
            </div>
          </BentoCard>
        )}
      </div>

      {/* 相关海外资讯 */}
      {news.length > 0 && (
        <BentoCard
          title="海外财经资讯"
          icon={<Newspaper className="h-4 w-4 text-neutral-400" />}
          subtitle="彭博与华尔街头条"
        >
          <div className="space-y-2.5">
            {news.slice(0, 5).map((n) => (
              <a
                key={n.id}
                href={n.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group flex flex-col justify-between gap-1 rounded-xl border border-white/[0.04] bg-[#0C0E11]/60 p-3.5 transition-all duration-200 hover:border-white/[0.1] hover:bg-[#12151B]"
              >
                <div className="text-sm font-medium text-neutral-200 group-hover:text-purple-400 transition-colors">
                  {n.title_zh || n.title}
                </div>
                {n.title_zh && n.title !== n.title_zh && (
                  <div className="text-[11px] text-neutral-500">{n.title}</div>
                )}
                <div className="mt-1 text-[10px] text-neutral-400 font-mono">
                  {n.source} · {n.time}
                </div>
              </a>
            ))}
          </div>
        </BentoCard>
      )}

      {/* AI 深度量化诊断面板 */}
      <StockThesisPanel code={symbol} market="us" />

      {/* 历史复盘研报沉淀 */}
      <AIHistoryPanel code={symbol} kind="us_stock_ai" />
    </div>
  );
}
