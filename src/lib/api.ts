/**
 * 爱看盘 Web — API Client
 * 后端: https://aikanpan.top/api/v1
 * APP 与 Web 共用同一套后端 API
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://aikanpan.top/api/v1";

export class ApiClient {
  private base: string;

  constructor(base?: string) {
    this.base = base || API_BASE;
  }

  private async request<T>(
    path: string,
    options?: RequestInit & { next?: { revalidate?: number } }
  ): Promise<T> {
    const url = `${this.base}${path}`;
    const res = await fetch(url, {
      ...options,
      headers: {
        "Content-Type": "application/json",
        ...options?.headers,
      },
    });

    if (!res.ok) {
      throw new Error(`API ${res.status}: ${res.statusText} — ${url}`);
    }

    return res.json() as Promise<T>;
  }

  /** 工作台 Dashboard — 指数 + 涨停跌停 + 强势行业 */
  getDashboard() {
    return this.request<Dashboard>("/workbench/dashboard", {
      next: { revalidate: 30 },
    });
  }

  /** 每日复盘 */
  getDailyReview() {
    return this.request<DailyReview>("/workbench/daily-review", {
      next: { revalidate: 60 },
    });
  }

  /** 市场洞察 — focus + hot_sectors + news + reports */
  getInsights() {
    return this.request<Insights>("/workbench/insights", {
      next: { revalidate: 60 },
    });
  }

  /** 板块行情 */
  getSectors() {
    return this.request<{ sectors: Sector[]; count: number }>("/market/sectors", {
      next: { revalidate: 60 },
    });
  }

  /** 板块成分股 */
  getSectorStocks(sectorCode: string) {
    return this.request<{ sector_code: string; stocks: SectorStock[]; count: number }>(`/market/sectors/${sectorCode}/stocks`, {
      next: { revalidate: 60 },
    });
  }

  /** 个股行情 */
  getStockQuote(code: string) {
    return this.request<StockQuote>(`/stocks/${code}/quote`, {
      next: { revalidate: 30 },
    });
  }

  /** 个股事件/AI摘要 */
  getStockEvents(code: string) {
    return this.request<StockEvents>(`/stocks/${code}/events`, {
      next: { revalidate: 60 },
    });
  }

  /** 个股历史K线 */
  getStockHistory(code: string) {
    return this.request<StockHistory>(`/stocks/${code}/history`, {
      next: { revalidate: 60 },
    });
  }

  /** 个股技术指标 */
  getStockIndicators(code: string) {
    return this.request<StockIndicators>(`/stocks/${code}/indicators`, {
      next: { revalidate: 60 },
    });
  }

  /** 个股资金流 */
  getStockMoneyflow(code: string) {
    return this.request<StockMoneyflow>(`/stocks/${code}/moneyflow`, {
      next: { revalidate: 60 },
    });
  }

  /** 搜索股票 */
  searchStocks(keyword: string) {
    return this.request<{ list: StockSearchResult[]; total: number }>(`/stocks/search?keyword=${encodeURIComponent(keyword)}`);
  }

  /** 自选股列表 */
  getWatchlist() {
    return this.request<WatchlistItem[]>("/stocks/watchlist");
  }

  /** 持仓列表 */
  getPositions() {
    return this.request<Position[]>("/portfolio/positions");
  }

  /** 持仓汇总 */
  getPortfolioSummary() {
    return this.request<PortfolioSummary>("/portfolio/summary");
  }
}

export const api = new ApiClient();

// ============================================
// Types — 匹配后端 OpenAPI 结构
// ============================================

/** 指数数据 */
export interface IndexData {
  code: string;
  name: string;
  last: number;
  change: number;
  change_pct: number;
  date: string;
  source: string;
}

/** 涨停/跌停个股 */
export interface LimitStock {
  code: string;
  name: string;
  pct: number;
  price: number;
  prev_close: number;
  time: string;
  type: "up" | "down";
  tag: string;
}

/** 强势行业 */
export interface StrongIndustry {
  name: string;
  change_pct: number;
}

/** Dashboard 响应 */
export interface Dashboard {
  index: IndexData;
  indices: IndexData[];
  market_status: string;
  market_updated_at: string;
  limit_up_count: number;
  limit_down_count: number;
  limit_up: LimitStock[];
  limit_down: LimitStock[];
  strong_industries: StrongIndustry[];
}

/** 板块 */
export interface Sector {
  code: string;
  name: string;
  price: number;
  change_pct: number;
  change: number;
  turnover_rate: number;
}

/** 每日复盘 */
export interface DailyReview {
  date: string;
  dashboard: Dashboard;
}

/** 市场洞察 */
export interface Insights {
  focus: string;
  hot_sectors: StrongIndustry[];
  news: NewsItem[];
  reports: ReportItem[];
  generated_at: string;
}

export interface NewsItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  time?: string;
  url?: string;
}

export interface ReportItem {
  id: string;
  title: string;
  summary?: string;
  source: string;
  time?: string;
  publish_at?: string;
  url?: string;
  code?: string;
  stock_name?: string;
  org_name?: string;
  rating_name?: string;
}

/** 个股行情 — 匹配后端实际返回结构 */
export interface StockQuote {
  code: string;
  name: string;
  last: number;
  last_price: number;
  open: number;
  high: number;
  low: number;
  prev_close: number;
  change: number;
  change_pct: number;
  volume: number;
  amount: number;
  _mock?: boolean;
}

/** 个股历史 */
export interface StockHistory {
  code: string;
  name: string;
  klines: KlineData[];
}

export interface KlineData {
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  volume: number;
  amount: number;
}

/** 个股技术指标 */
export interface StockIndicators {
  code: string;
  name: string;
  macd?: { dif: number; dea: number; macd: number };
  kdj?: { k: number; d: number; j: number };
  rsi?: { rsi6: number; rsi12: number; rsi24: number };
  boll?: { upper: number; mid: number; lower: number };
}

/** 个股资金流 — 匹配后端实际返回结构 */
export interface StockMoneyflow {
  code: string;
  name: string;
  main_net_inflow: number;
  main_net_inflow_pct: number;
  super_large_ratio: number;
  large_ratio: number;
  _mock?: boolean;
}

/** 个股事件/AI摘要 */
export interface StockEvents {
  code: string;
  name: string;
  summary: string;
  signals: StockSignal[];
  reports: ReportItem[];
  generated_at: string;
}

export interface StockSignal {
  type: string;
  title: string;
  desc: string;
  tone: string;
}

/** 板块成分股 */
export interface SectorStock {
  code: string;
  name: string;
  price: number;
  change_pct: number;
}

/** 搜索结果 */
export interface StockSearchResult {
  code: string;
  name: string;
  pinyin?: string;
}

/** 自选股 */
export interface WatchlistItem {
  code: string;
  name: string;
  price: number;
  change_pct: number;
}

/** 持仓 */
export interface Position {
  id: string;
  code: string;
  name: string;
  qty: number;
  cost_price: number;
  current_price: number;
  market_value: number;
  profit: number;
  profit_pct: number;
}

/** 持仓汇总 */
export interface PortfolioSummary {
  total_market_value: number;
  total_cost: number;
  total_profit: number;
  total_profit_pct: number;
  today_profit: number;
  today_profit_pct: number;
}
