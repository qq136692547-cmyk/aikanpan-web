/**
 * 爱看盘 — 格式化工具
 */

/** 格式化价格 — 保留 2 位小数 */
export function formatPrice(n?: number | null): string {
  if (n == null || !Number.isFinite(n) || n <= 0) return "--";
  return n.toFixed(2);
}

/** 格式化涨跌幅 — +X.XX% */
export function formatPct(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}%`;
}

/** 格式化涨跌额 — +X.XX */
export function formatChange(n: number): string {
  const sign = n >= 0 ? "+" : "";
  return `${sign}${n.toFixed(2)}`;
}

function compactNumber(n: number, small: (abs: number) => string): string {
  const sign = n < 0 ? "-" : "";
  const abs = Math.abs(n);
  if (abs >= 1e8) return `${sign}${(abs / 1e8).toFixed(2)}亿`;
  if (abs >= 1e4) return `${sign}${(abs / 1e4).toFixed(2)}万`;
  return `${sign}${small(abs)}`;
}

/** 格式化成交量 — 万/亿 */
export function formatVolume(n: number): string {
  return compactNumber(n, (abs) => abs.toString());
}

/** 格式化成交额 — 万/亿 */
export function formatAmount(n: number): string {
  return compactNumber(n, (abs) => abs.toFixed(0));
}

/** 格式化市值 — 亿 */
export function formatMarketCap(n: number): string {
  return compactNumber(n, (abs) => abs.toString());
}

/** 根据涨跌返回语义 class */
export function trendClass(n: number): string {
  if (n > 0) return "text-up";
  if (n < 0) return "text-down";
  return "text-flat";
}

/** Normalize stock code: sh.600519 / 600519 -> 600519 */
export function normalizeStockCode(code: string): string {
  return (code || "").toLowerCase().replace(/[^0-9]/g, "");
}

/** 根据涨跌返回背景 class */
export function trendBgClass(n: number): string {
  if (n > 0) return "bg-up-soft";
  if (n < 0) return "bg-down-soft";
  return "bg-flat-soft";
}
