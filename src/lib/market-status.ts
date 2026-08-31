export type MarketPhase = "pre" | "trading" | "lunch" | "closed" | "unknown";

export function marketPhaseText(phase?: string): string {
  switch (phase) {
    case "pre":
      return "盘前";
    case "trading":
      return "交易中";
    case "lunch":
      return "午休";
    case "closed":
      return "已收盘";
    default:
      return "状态未知";
  }
}

export function marketPhaseLive(phase?: string): boolean {
  return phase === "pre" || phase === "trading";
}
