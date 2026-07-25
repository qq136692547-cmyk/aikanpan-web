/**
 * 爱看盘 — 通用类型
 */

/** 涨跌趋势 */
export type Trend = "up" | "down" | "flat";

/** 页面路由 */
export const ROUTES = {
  HOME: "/",
  MARKET: "/market",
  STOCK: "/stock",
  REVIEW: "/review",
  PORTFOLIO: "/portfolio",
  ETF: "/etf",
  FUND: "/fund",
} as const;

/** 导航项 */
export interface NavItem {
  label: string;
  href: string;
  icon: string;
}
