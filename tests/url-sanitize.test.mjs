import test from "node:test";
import assert from "node:assert/strict";

import { sanitizeMessage, sanitizeUrl } from "../src/lib/url-sanitize.ts";

// 这些断言守的是 P0-2：支付回跳 URL 里的 out_trade_no 不能随错误上报/访问统计外发。
// 教训是「订单号一旦落进公开接口，等于把已付款会员的找回凭据送人」。

test("sanitizeUrl 丢弃查询串", () => {
  assert.equal(
    sanitizeUrl("https://aikanpan.top/pay/success?out_trade_no=aikp_1&trade_no=2026"),
    "https://aikanpan.top/pay/success"
  );
  assert.equal(sanitizeUrl("/upgrade/?market=cn&token=abc"), "/upgrade/");
});

test("sanitizeUrl 丢弃 hash", () => {
  assert.equal(sanitizeUrl("/stock/sh.600519/#ai"), "/stock/sh.600519/");
});

test("sanitizeUrl 抹掉路径中的恢复码", () => {
  assert.equal(sanitizeUrl("/recover/AKP-B086-6968"), "/recover/<redacted>");
});

test("sanitizeUrl 处理空值且不抛错", () => {
  assert.equal(sanitizeUrl(""), "");
  assert.equal(sanitizeUrl(undefined), "");
  assert.equal(sanitizeUrl(null), "");
});

test("sanitizeMessage 清掉文案内嵌 URL 的查询串", () => {
  assert.equal(
    sanitizeMessage("Failed to fetch https://aikanpan.top/pay?out_trade_no=aikp_9"),
    "Failed to fetch https://aikanpan.top/pay"
  );
});

test("sanitizeMessage 打码敏感参数与恢复码", () => {
  const out = sanitizeMessage("bad out_trade_no=aikp_9 token=abc123 AKP-B086-6968");
  assert.ok(!out.includes("aikp_9"), out);
  assert.ok(!out.includes("abc123"), out);
  assert.ok(!out.includes("AKP-B086-6968"), out);
  assert.ok(out.includes("out_trade_no=<redacted>"), out);
});

test("sanitizeMessage 保留可读的诊断信息", () => {
  const out = sanitizeMessage("TypeError: Cannot read properties of undefined (reading 'map')");
  assert.equal(out, "TypeError: Cannot read properties of undefined (reading 'map')");
});

test("两个函数都按上限截断", () => {
  assert.equal(sanitizeUrl("/" + "a".repeat(500), 50).length, 50);
  assert.equal(sanitizeMessage("b".repeat(500), 50).length, 50);
});
