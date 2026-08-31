/**
 * 爱看盘 Web — API Client
 * 后端: https://aikanpan.top/api/v1
 * APP 与 Web 共用同一套后端 API
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://aikanpan.top/api/v1";

/** 获取认证 token（客户端侧，从 localStorage） */
function getAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("aikanpan_auth");
    if (!raw) return null;
    const data = JSON.parse(raw);
    return data?.token ?? null;
  } catch {
    return null;
  }
}

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
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(options?.headers as Record<string, string>),
    };

    // 客户端请求自动带 token
    const token = getAuthToken();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      throw new Error(`API ${res.status}: ${res.statusText} — ${url}`);
    }

    return res.json() as Promise<T>;
  }

  /** 工作台 Dashboard — 指数 + 涨停跌停 + 强势行业 */
  getDashboard(options?: Pick<RequestInit, "signal">) {
    return this.request<Dashboard>("/workbench/dashboard", {
      ...options,
      next: { revalidate: 30 },
    });
  }

  /** 每日复盘 */
  getDailyReview(date?: string) {
    return this.request<DailyReview>(`/workbench/daily-review${date ? `?date=${encodeURIComponent(date)}` : ""}`, {
      next: { revalidate: 60 },
    });
  }

  /** 市场洞察 — focus + hot_sectors + news + reports */
  getInsights() {
    return this.request<Insights>("/workbench/insights", {
      next: { revalidate: 60 },
    });
  }

  getMarketTemperature(ai = false) {
    return this.request<MarketTemperature>(`/workbench/temperature${ai ? "?ai=true" : ""}`, {
      next: { revalidate: ai ? 900 : 30 },
    });
  }

  getNewsRadar() {
    return this.request<NewsRadar>("/ai/news-radar", { method: "POST", body: "{}", next: { revalidate: 900 } });
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

  /** 个股财务数据 */
  getStockFinancials(code: string) {
    return this.request<StockFinancials>(`/stocks/${code}/financials`, {
      next: { revalidate: 3600 },
    });
  }
  /** 搜索股票 */
  searchStocks(keyword: string) {
    return this.request<{ list: StockSearchResult[]; total: number }>(`/stocks/search?q=${encodeURIComponent(keyword)}`);
  }

  /** 自选股列表 */
  getWatchlist() {
    return this.request<{ watchlist: WatchlistItem[]; count: number }>("/stocks/watchlist");
  }

  getWatchlistByCodes(codes: string[], options?: Pick<RequestInit, "signal">) {
    return this.request<{ watchlist: WatchlistItem[]; count: number }>(
      `/stocks/watchlist?codes=${encodeURIComponent(codes.join(","))}`,
      { ...options, next: { revalidate: 30 } }
    );
  }

  /** 游客登录 */
  guestLogin() {
    return this.request<GuestLoginResp>("/auth/guest-login", { method: "POST", body: JSON.stringify({}) });
  }

  /** 发送短信验证码 */
  sendSms(phone: string) {
    return this.request<{ ok: boolean; expires_in: number }>("/auth/sms-send", { method: "POST", body: JSON.stringify({ phone }) });
  }

  /** 校验短信验证码并登录/注册 */
  verifySms(phone: string, code: string, guestToken?: string | null) {
    return this.request<SmsVerifyResp>("/auth/sms-verify", { method: "POST", body: JSON.stringify({ phone, code, guest_token: guestToken || undefined }) });
  }

  /** 当前账号信息 */
  getMe() {
    return this.request<AuthMe>("/auth/me");
  }
  /** 会员状态与当日 AI 额度 */
  getMembershipStatus() {
    return this.request<MembershipStatus>("/membership/status", { cache: "no-store" as RequestCache });
  }

  /** 人工收款后使用激活码开通/续费 Pro */
  activateMembership(code: string) {
    return this.request<MembershipStatus>("/membership/activate", { method: "POST", body: JSON.stringify({ code }) });
  }

  /** 管理员：激活码列表 */
  adminListMembershipCodes(adminToken: string) {
    return this.request<AdminMembershipCodesResp>("/admin/membership/codes", {
      headers: { "X-Admin-Token": adminToken },
      cache: "no-store" as RequestCache,
    });
  }

  /** 管理员：生成激活码 */
  adminCreateMembershipCodes(adminToken: string, body: AdminMembershipCodeCreateReq) {
    return this.request<AdminMembershipCodesResp>("/admin/membership/codes", {
      method: "POST",
      body: JSON.stringify(body),
      headers: { "X-Admin-Token": adminToken },
    });
  }

  /** 管理员：作废未使用激活码 */
  adminRevokeMembershipCode(adminToken: string, code: string) {
    return this.request<AdminMembershipCode>("/admin/membership/codes/revoke", {
      method: "POST",
      body: JSON.stringify({ code }),
      headers: { "X-Admin-Token": adminToken },
    });
  }

  /** 持仓列表 */
  getPositions() {
    return this.request<{ positions: Position[]; count: number }>("/portfolio/positions");
  }

  /** 持仓汇总 */
  getPortfolioSummary() {
    return this.request<PortfolioSummary>("/portfolio/summary");
  }

  // ============================================
  // US Market
  // ============================================

  getUsDashboard() {
    return this.request<UsDashboard>("/us/dashboard", { next: { revalidate: 30 } });
  }

  getUsQuote(symbol: string) {
    return this.request<UsQuote>(`/us/stocks/${encodeURIComponent(symbol)}/quote`, { next: { revalidate: 30 } });
  }

  getUsHistory(symbol: string, days = 120) {
    return this.request<UsHistory>(`/us/stocks/${encodeURIComponent(symbol)}/history?days=${days}`, { next: { revalidate: 60 } });
  }

  getUsFinancials(symbol: string) {
    return this.request<UsFinancials>(`/us/stocks/${encodeURIComponent(symbol)}/financials`, { next: { revalidate: 3600 } });
  }

  getUsEarnings(symbol: string) {
    return this.request<UsEarnings>(`/us/stocks/${encodeURIComponent(symbol)}/earnings`, { next: { revalidate: 3600 } });
  }

  getUsNews(symbol: string, limit = 8) {
    return this.request<{ news: UsNewsItem[]; count: number }>(`/us/stocks/${encodeURIComponent(symbol)}/news?limit=${limit}`, { next: { revalidate: 900 } });
  }

  searchUsStocks(q: string) {
    return this.request<{ list: UsSearchResult[]; total: number }>(`/us/stocks/search?q=${encodeURIComponent(q)}`, { next: { revalidate: 600 } });
  }

  getUsWatchlist() {
    return this.request<{ watchlist: UsQuote[]; count: number }>("/us/watchlist", { cache: "no-store" as RequestCache });
  }

  addUsWatchlist(code: string, name?: string) {
    return this.request<{ ok: boolean; code: string; count: number }>("/us/watchlist", {
      method: "POST",
      body: JSON.stringify({ code, name }),
    });
  }

  removeUsWatchlist(code: string) {
    return this.request<{ deleted: boolean; code: string; count: number }>(`/us/watchlist/${encodeURIComponent(code)}`, { method: "DELETE" });
  }

  getUsPositions() {
    return this.request<{ positions: UsPosition[]; count: number; usd_cny: number }>("/us/portfolio/positions", { cache: "no-store" as RequestCache });
  }

  upsertUsPosition(data: { code: string; name?: string; shares: number; cost_price: number }) {
    return this.request<PositionUpsert>("/us/portfolio/positions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  deleteUsPosition(id: string) {
    return this.request<{ deleted: boolean; id: string }>(`/us/portfolio/positions/${id}`, { method: "DELETE" });
  }

  getUsPortfolioSummary() {
    return this.request<UsPortfolioSummary>("/us/portfolio/summary", { cache: "no-store" as RequestCache });
  }

  getUsTransactions() {
    return this.request<{ transactions: TransactionItem[]; count: number; total: number; currency: string }>("/us/portfolio/transactions", { cache: "no-store" as RequestCache });
  }

  createUsTransaction(data: { code: string; name?: string; type: "buy" | "sell" | "dividend"; shares: number; price: number; date?: string; note?: string }) {
    return this.request<TransactionItem>("/us/portfolio/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateUsTransaction(id: string, data: { code: string; name?: string; type: "buy" | "sell" | "dividend"; shares: number; price: number; date?: string; note?: string }) {
    return this.request<TransactionItem>(`/us/portfolio/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteUsTransaction(id: string) {
    return this.request<{ deleted: boolean; id: string }>(`/us/portfolio/transactions/${id}`, { method: "DELETE" });
  }

  getUsAI(symbol: string) {
    return this.request<AIComment>(`/us/stocks/${encodeURIComponent(symbol)}/ai`, { method: "POST", body: JSON.stringify({}) });
  }

  getUsDailyReview() {
    return this.request<AIReview>("/us/daily-review", { method: "POST", body: JSON.stringify({}) });
  }

  /** 新增/更新持仓 */
  upsertPosition(data: { code: string; name?: string; shares: number; cost_price: number }) {
    return this.request<PositionUpsert>("/portfolio/positions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  /** 删除持仓 */
  deletePosition(id: string) {
    return this.request<{ deleted: boolean; id: string }>(`/portfolio/positions/${id}`, {
      method: "DELETE",
    });
  }

  /** 交易流水 */
  getTransactions() {
    return this.request<{ transactions: TransactionItem[]; count: number; total: number }>("/portfolio/transactions", {
      cache: "no-store" as RequestCache,
    });
  }

  createTransaction(data: { code: string; name?: string; type: "buy" | "sell" | "dividend"; shares: number; price: number; date?: string; note?: string }) {
    return this.request<TransactionItem>("/portfolio/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  }

  updateTransaction(id: string, data: { code: string; name?: string; type: "buy" | "sell" | "dividend"; shares: number; price: number; date?: string; note?: string }) {
    return this.request<TransactionItem>(`/portfolio/transactions/${id}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  }

  deleteTransaction(id: string) {
    return this.request<{ deleted: boolean; id: string }>(`/portfolio/transactions/${id}`, {
      method: "DELETE",
    });
  }

  // ============================================
  // AI 接口
  // ============================================

  /** AI 个股诊断 — LLM 生成结构化分析 */
  getAIComment(code: string) {
    return this.request<AIComment>("/ai/comment", {
      method: "POST",
      body: JSON.stringify({ code }),
    });
  }

  /** AI 批量评分 — 并发评分 */
  getAIScoreBatch(codes: string[], market: "cn" | "us" = "cn") {
    return this.request<AIScoreBatch>("/ai/score-batch", {
      method: "POST",
      body: JSON.stringify({ codes, market }),
    });
  }

  /** AI 每日复盘 — LLM 生成市场复盘报告 */
  getAIReview(date?: string) {
    return this.request<AIReview>("/ai/daily-review", {
      method: "POST",
      body: JSON.stringify({ trade_date: date || undefined }),
    });
  }

  /** AI 组合诊断 */
  getPortfolioReview() {
    return this.request<PortfolioReview>("/ai/portfolio-review", {
      method: "POST",
      body: JSON.stringify({}),
    });
  }

  /** AI 盘前计划关注要点 */
  getPlanFocus(plans: Array<Record<string, unknown>>, market: "cn" | "us" = "cn") {
    return this.request<PlanFocus>("/ai/plan-focus", {
      method: "POST",
      body: JSON.stringify({ plans, market }),
    });
  }

  /** AI 诊断历史列表 */
  getAIHistory(code: string) {
    return this.request<{ history: AIHistoryItem[]; count: number }>(`/ai/history?code=${encodeURIComponent(code)}`, { cache: "no-store" as RequestCache });
  }

  /** 保存 AI 诊断历史 */
  saveAIHistory(data: { code: string; name?: string; content: string; model?: string; generated_at?: string }) {
    return this.request<AIHistoryItem>("/ai/history", { method: "POST", body: JSON.stringify(data) });
  }

  /** 删除 AI 诊断历史 */
  deleteAIHistory(id: string) {
    return this.request<{ deleted: boolean; id: string }>(`/ai/history/${id}`, { method: "DELETE" });
  }

  /** 定时复盘任务状态 */
  getReviewStatus() {
    return this.request<ReviewStatus>("/workbench/review-status", { cache: "no-store" as RequestCache });
  }

  // ============================================
  // 盯盘接口
  // ============================================

  /** NLP 解析盯盘条件 — 自然语言 → 结构化条件 */
  parseAlert(text: string, market: "cn" | "us" = "cn") {
    return this.request<AlertParseResult>("/alerts/parse", {
      method: "POST",
      body: JSON.stringify({ text, market }),
    });
  }

  /** 获取盯盘任务列表 */
  getAlerts(market?: "cn" | "us") {
    const qs = market ? `?market=${market}` : "";
    return this.request<{ alerts: AlertItem[]; count: number }>(`/alerts${qs}`, {
      cache: "no-store" as RequestCache,
    });
  }

  /** 创建盯盘任务 */
  createAlert(data: {
    code: string;
    name?: string;
    condition?: string;
    threshold?: number;
    conditions?: AlertCondition[];
    market?: "cn" | "us";
    note?: string;
  }) {
    const body: Record<string, unknown> = { code: data.code, note: data.note };
    if (data.market) body.market = data.market;
    if (data.conditions && data.conditions.length > 0) {
      body.conditions = data.conditions;
    } else {
      body.condition = data.condition;
      body.threshold = data.threshold;
    }
    return this.request<AlertItem>("/alerts", {
      method: "POST",
      body: JSON.stringify(body),
    });
  }

  /** 删除盯盘任务 */
  deleteAlert(id: string) {
    return this.request<{ ok: boolean; id: string }>(`/alerts/${id}`, {
      method: "DELETE",
    });
  }

  /** 获取盯盘触发历史 */
  getAlertHistory(market?: "cn" | "us") {
    const qs = market ? `?market=${market}` : "";
    return this.request<{ alerts: AlertHistoryItem[]; count: number }>(`/alerts/triggered${qs}`, {
      cache: "no-store" as RequestCache,
    });
  }

  /** 获取通知设置 */
  getAlertSettings() {
    return this.request<AlertSettings>("/alerts/settings", { cache: "no-store" as RequestCache });
  }

  /** 更新通知设置 */
  updateAlertSettings(data: { browser_enabled?: boolean; sms_enabled?: boolean }) {
    return this.request<AlertSettings>("/alerts/settings", { method: "PATCH", body: JSON.stringify(data) });
  }
}

export const api = new ApiClient();

// ============================================
// Types — 匹配后端 OpenAPI 结构
// ============================================

/** 指数数据 */
export interface IndexData {
  code?: string;
  name?: string;
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
  market_phase?: string;
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
  cached?: boolean;
  historical?: boolean;
}

/** 市场洞察 */
export interface Insights {
  focus: string;
  hot_sectors: StrongIndustry[];
  news: NewsItem[];
  reports: ReportItem[];
  generated_at: string;
}

export interface TemperatureDimension {
  score: number;
  label: string;
  detail: string;
}

export interface MarketTemperature {
  score: number;
  label: string;
  dimensions: {
    index: TemperatureDimension;
    sector: TemperatureDimension;
    limit: TemperatureDimension;
    ai: TemperatureDimension;
  };
  focus: string;
  hot_sectors: StrongIndustry[];
  market_status: string;
  market_updated_at: string;
  generated_at: string;
  ai?: {
    summary: string;
    model: string;
    generated_at: string;
    cached: boolean;
  };
}

export interface NewsRadar {
  radar: string;
  news_count: number;
  model: string;
  generated_at: string;
  cached: boolean;
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
  bars: KlineData[];
  closes: number[];
  klines?: KlineData[];
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
  macd?: { dif: number | number[]; dea: number | number[]; macd: number | number[] };
  kdj?: { k: number | number[]; d: number | number[]; j: number | number[] };
  rsi?: number | number[];
  boll?: { upper: number | number[]; mid: number | number[]; lower: number | number[] };
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

/** 个股财务数据 */
export interface StockFinancialDimension {
  key: string;
  label: string;
  value: number;
  status: string;
  color: string;
  score: number;
}

export interface StockFinancials {
  code: string;
  name?: string;
  period?: string;
  source?: string;
  metrics?: {
    revenue_yoy_pct?: number;
    profit_yoy_pct?: number;
    roe_pct?: number;
    gross_margin_pct?: number;
  };
  evaluation?: {
    dimensions: StockFinancialDimension[];
    summary: { color: string; green_count: number; yellow_count: number; red_count: number; total: number };
    disclaimer?: string;
  };
  available?: boolean;
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
  initials?: string;
  market?: string;
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
  shares: number;
  cost: number;
  current: number;
  market_value: number;
  pnl: number;
  pnl_pct: number;
  date?: string;
}

/** 持仓新增/更新结果 */
export interface PositionUpsert {
  id: string;
  code: string;
  name: string;
  shares: number;
  cost: number;
  date: string;
  updated: boolean;
}

/** 交易流水 */
export interface TransactionItem {
  id: string;
  code: string;
  name: string;
  type: "buy" | "sell" | "dividend";
  shares: number;
  price: number;
  date: string;
  note?: string;
  created_at?: string;
}

/** 游客登录响应 */
export interface GuestLoginResp {
  user_id: string;
  token: string;
  created: boolean;
}

/** 短信登录/注册响应 */
export interface SmsVerifyResp {
  user_id: string;
  token: string;
  created: boolean;
  phone_verified: boolean;
  phone_masked: string;
}

/** 当前账号信息 */
export interface AuthMe {
  user_id: string;
  phone_verified: boolean;
  phone_masked: string;
}

export interface MembershipStatus {
  user_id: string;
  plan: "free" | "pro";
  expires_at: string;
  ai_daily_limit: number;
  ai_used_today: number;
  ai_remaining: number;
  last_ai_call_at?: string;
  features?: string[];
}

export interface AdminMembershipCode {
  code: string;
  status: "active" | "used" | "revoked";
  days: number;
  note: string;
  created_at: string;
  used_by: string;
  used_at: string;
  revoked_at: string;
}

export interface AdminMembershipCodeCreateReq {
  count: number;
  days: number;
  note?: string;
}

export interface AdminMembershipCodesResp {
  codes: AdminMembershipCode[];
  count: number;
  total: number;
}

/** 持仓汇总 */
export interface UsQuote {
  code: string;
  name?: string;
  last: number;
  change: number;
  change_pct: number;
  open?: number;
  high?: number;
  low?: number;
  prev_close?: number;
  volume?: number;
  market_cap?: number | null;
  currency?: string;
  source?: string;
  date?: string;
  usd_cny?: number;
}

export interface UsHistory {
  code: string;
  bars: KlineData[];
  closes: number[];
  source?: string;
}

export interface UsFinancials {
  code: string;
  available: boolean;
  source?: string;
  metrics?: {
    pe_ratio?: number;
    pb_ratio?: number;
    roe_pct?: number;
    revenue_yoy_pct?: number;
    profit_yoy_pct?: number;
    gross_margin_pct?: number;
    market_cap?: number;
  };
}

export interface UsEarningsItem {
  period: string;
  year?: number;
  quarter?: number;
  estimate?: number;
  actual?: number;
  surprise?: number;
  surprise_percent?: number;
}

export interface UsEarningsUpcoming {
  date: string;
  hour?: string;
  quarter?: number;
  year?: number;
  eps_estimate?: number;
  revenue_estimate?: number;
}

export interface UsEarnings {
  earnings: UsEarningsItem[];
  upcoming?: UsEarningsUpcoming | null;
  count: number;
  source?: string;
}

export interface UsDashboard {
  indices: UsQuote[];
  stocks: UsQuote[];
  generated_at: string;
  source?: string;
  usd_cny?: number;
  market?: string;
}

export interface UsNewsItem {
  id: string;
  title: string;
  summary?: string;
  source?: string;
  time?: string;
  url?: string;
}

export interface UsSearchResult {
  code: string;
  name: string;
  type?: string;
  market?: string;
}

export interface UsPosition {
  id: string;
  code: string;
  name: string;
  shares: number;
  cost: number;
  current: number;
  market_value: number;
  rmb_market_value: number;
  pnl: number;
  pnl_pct: number;
  currency?: string;
  date?: string;
}

export interface UsPortfolioSummary {
  total_cost: number;
  total_value: number;
  total_rmb_value: number;
  total_pnl: number;
  total_pnl_pct: number;
  position_count: number;
  usd_cny: number;
}

export interface PortfolioSummary {
  total_value: number;
  total_cost: number;
  total_pnl: number;
  total_pnl_pct: number;
  position_count: number;
}

// ============================================
// AI Types
// ============================================

/** AI 个股诊断响应 */
export interface AIComment {
  code: string;
  name: string;
  content: string;
  model: string;
  generated_at: string;
  cached: boolean;
}

/** AI 诊断历史条目 */
export interface AIHistoryItem {
  id: string;
  code: string;
  name: string;
  content: string;
  model: string;
  generated_at: string;
  updated_at?: string;
}

/** AI 批量评分单项 */
export interface AIScoreItem {
  code: string;
  name: string;
  score: number;
  status: string;
  note: string;
  cached: boolean;
  updated_at?: string;
}

/** AI 批量评分响应 */
export interface AIScoreBatch {
  items: AIScoreItem[];
  generated_at: string;
}

/** AI 每日复盘响应 */
export interface AIReview {
  content: string;
  model: string;
  generated_at: string;
  cached: boolean;
}

/** 定时复盘任务状态 */
export interface ReviewStatus {
  next_run: string;
  last_success_at: string;
  last_error: string;
  cached: boolean;
}

/** AI 组合诊断响应 */
export interface PortfolioReview {
  content: string;
  model: string;
  generated_at: string;
  cached: boolean;
  items: Position[];
}

/** AI 盘前计划关注要点 */
export interface PlanFocus {
  content: string;
  model: string;
  generated_at: string;
  cached: boolean;
}

// ============================================
// Alert Types
// ============================================

/** 盯盘条件 */
export interface AlertCondition {
  field: "price" | "change_pct" | "volume";
  op: "above" | "below";
  threshold?: number;
}

/** NLP 解析结果 */
export interface AlertParseResult {
  code: string;
  name: string;
  market?: "cn" | "us";
  condition?: string;
  threshold: number;
  conditions?: AlertCondition[];
  note: string;
  confidence: number;
  model: string;
  cached: boolean;
  raw_text: string;
}

/** 盯盘任务 */
export interface AlertItem {
  id: string;
  code: string;
  name: string;
  market?: "cn" | "us";
  condition: string;
  threshold: number;
  conditions?: AlertCondition[];
  active?: boolean;
  note?: string;
  status: "active" | "triggered" | "disabled";
  created_at: string;
  last_check?: string;
  triggered_at?: string;
}

/** 盯盘触发历史 */
export interface AlertHistoryItem {
  id: string;
  alert_id?: string;
  code: string;
  name: string;
  market?: "cn" | "us";
  condition: string;
  threshold: number;
  conditions?: AlertCondition[];
  triggered_at: string;
  price_at_trigger?: number;
  last_value?: number;
  note?: string;
}

/** 盯盘通知设置 */
export interface AlertSettings {
  browser_enabled: boolean;
  sms_enabled: boolean;
  updated_at: string;
  phone_masked: string;
  phone_verified: boolean;
}
