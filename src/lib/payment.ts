/**
 * 支付宝订单状态口径。
 *
 * ⚠️ 两套状态不要混用：
 *  - 后端 `/pay/alipay/order-status` 的 `status` 是**归一化对外状态**（PAID / REFUSED / WAIT_BUYER_PAY），
 *    主要给不关心支付宝内部状态的调用方使用；
 *  - 支付宝**原始交易状态**在 `raw_status` 字段（TRADE_SUCCESS / TRADE_FINISHED /
 *    REFUSED_TRIAL_LIMIT / WAIT_BUYER_PAY）。
 *
 * 判定订单是否真正成交，必须走 `resolveAlipayOrderStatus()` 后再判断，
 * 只看归一化的 `status` 会在后端返回 PAID 时被判成"未支付"。
 */

/** 支付宝原始交易状态（含我方业务终态） */
export type AlipayOrderStatus =
  | "WAIT_BUYER_PAY"
  | "TRADE_SUCCESS"
  | "TRADE_FINISHED"
  | "REFUSED_TRIAL_LIMIT";

/** 后端归一化后的对外状态 */
export type AlipayNormalizedStatus = "PAID" | "REFUSED" | "WAIT_BUYER_PAY";

/** 取订单的真实状态：优先 raw_status，回退到归一化 status（兼容旧后端） */
export function resolveAlipayOrderStatus(
  status: string | null | undefined,
  rawStatus: string | null | undefined
): string {
  const raw = typeof rawStatus === "string" ? rawStatus.trim() : "";
  if (raw) return raw;
  return typeof status === "string" ? status.trim() : "";
}

/** 订单是否已成交（已实付且已发货） */
export function isAlipayOrderPaid(status: string | null | undefined): boolean {
  return status === "TRADE_SUCCESS" || status === "TRADE_FINISHED" || status === "PAID";
}

/** 已实付但被拒发（体验卡每支付宝账户限购一次），需走原路退回 */
export function isAlipayOrderRefused(status: string | null | undefined): boolean {
  return status === "REFUSED_TRIAL_LIMIT" || status === "REFUSED";
}
