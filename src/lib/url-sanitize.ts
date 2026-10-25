// URL / 文本脱敏工具：任何要发到线上接口的地址都必须先过这里。
//
// 为什么不能直接发 window.location.href：
// 支付宝回跳会把 out_trade_no 放在查询串里（/pay/success?out_trade_no=aikp_...），
// 而恢复码是 out_trade_no 的 sha256 前 8 位（可推导），
// 所以「URL 原文外发」等于把已付款会员的凭据公开。
// 错误上报与访问统计两条链路都踩过这个坑，统一收口在本文件。

const EMBEDDED_URL = /(https?:\/\/[^\s"'<>?#]+)[?#][^\s"'<>]*/gi;
const SENSITIVE_PAIR =
  /\b(out_trade_no|trade_no|recovery_code|recover|token|access_token|refresh_token|api_key|apikey|password|code|state)=[^\s&"'<>]*/gi;
const RECOVERY_CODE = /\bAKP-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}\b/g;

/** 把任意 URL 收敛成「来源 + 路径」，丢弃查询串、hash 与恢复码。 */
export function sanitizeUrl(raw: string | null | undefined, max = 300): string {
  if (!raw) return "";
  let s = String(raw).trim();
  const cut = s.search(/[?#]/);
  if (cut >= 0) s = s.slice(0, cut);
  s = s.replace(/\/AKP-[0-9A-Fa-f]{4}-[0-9A-Fa-f]{4}(?=\/|$)/g, "/<redacted>");
  return s.slice(0, max);
}

/** 错误文案里可能嵌着带查询串的 URL，或直接带着恢复码，一并清掉。 */
export function sanitizeMessage(raw: string | null | undefined, max = 300): string {
  if (!raw) return "";
  return String(raw)
    .replace(EMBEDDED_URL, "$1")
    .replace(SENSITIVE_PAIR, "$1=<redacted>")
    .replace(RECOVERY_CODE, "<redacted-code>")
    .slice(0, max);
}
