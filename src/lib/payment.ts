export type AlipayOrderStatus =
  | "WAIT_BUYER_PAY"
  | "TRADE_SUCCESS"
  | "TRADE_FINISHED";

export function isAlipayOrderPaid(status: string | null | undefined): boolean {
  return status === "TRADE_SUCCESS" || status === "TRADE_FINISHED";
}
