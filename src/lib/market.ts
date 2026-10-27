export type MarketScope = "all" | "cn" | "hk" | "us";

export const MARKET_OPTIONS: { value: MarketScope; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "cn", label: "A股" },
  { value: "hk", label: "港股" },
  { value: "us", label: "美股" },
];

/**
 * 从 ?market= 参数解析市场范围。
 *
 * 注意：`"all"` **不在白名单里**，这是刻意的——如果放行 "all"，`?market=all`
 * 就会重新触发各页面的 `redirect("/xxx/?market=cn")`，裸 URL 的 canonical 闭环就没修掉。
 * 需要 "all" 的页面（目前只有首页 src/app/page.tsx）显式传 fallback: "all"。
 */
export function marketFromSearchParams(raw?: string | null, fallback: MarketScope = "all"): MarketScope {
  if (raw === "cn" || raw === "hk" || raw === "us") return raw;
  return fallback;
}
