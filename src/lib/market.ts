export type MarketScope = "all" | "cn" | "hk" | "us";

export const MARKET_OPTIONS: { value: MarketScope; label: string }[] = [
  { value: "all", label: "全部" },
  { value: "cn", label: "A股" },
  { value: "hk", label: "港股" },
  { value: "us", label: "美股" },
];

export function marketFromSearchParams(raw?: string | null): MarketScope {
  if (raw === "cn" || raw === "hk" || raw === "us") return raw;
  return "all";
}
