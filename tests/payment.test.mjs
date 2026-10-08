import test from "node:test";
import assert from "node:assert/strict";

import {
  isAlipayOrderPaid,
  isAlipayOrderRefused,
  resolveAlipayOrderStatus,
} from "../src/lib/payment.ts";

test("Alipay only treats settled orders as paid", () => {
  assert.equal(isAlipayOrderPaid("TRADE_SUCCESS"), true);
  assert.equal(isAlipayOrderPaid("TRADE_FINISHED"), true);
  assert.equal(isAlipayOrderPaid("WAIT_BUYER_PAY"), false);
  assert.equal(isAlipayOrderPaid(undefined), false);
});

test("normalized PAID is treated as paid (order-status 契约回归)", () => {
  // 后端 /order-status 的 status 字段返回归一化值 PAID，不能判成未支付
  assert.equal(isAlipayOrderPaid("PAID"), true);
  assert.equal(isAlipayOrderPaid("REFUSED"), false);
});

test("refused trial order is detected and never reported as paid", () => {
  assert.equal(isAlipayOrderRefused("REFUSED_TRIAL_LIMIT"), true);
  assert.equal(isAlipayOrderRefused("REFUSED"), true);
  assert.equal(isAlipayOrderRefused("TRADE_SUCCESS"), false);
  assert.equal(isAlipayOrderPaid("REFUSED_TRIAL_LIMIT"), false);
});

test("resolveAlipayOrderStatus prefers raw_status", () => {
  // 归一化 status=PAID 但 raw_status=TRADE_SUCCESS → 取真实状态
  assert.equal(resolveAlipayOrderStatus("PAID", "TRADE_SUCCESS"), "TRADE_SUCCESS");
  // 归一化 status=REFUSED + raw_status=REFUSED_TRIAL_LIMIT → 取被拒终态
  assert.equal(resolveAlipayOrderStatus("REFUSED", "REFUSED_TRIAL_LIMIT"), "REFUSED_TRIAL_LIMIT");
  // 旧后端无 raw_status → 回退到 status
  assert.equal(resolveAlipayOrderStatus("WAIT_BUYER_PAY", undefined), "WAIT_BUYER_PAY");
  assert.equal(resolveAlipayOrderStatus(undefined, undefined), "");
});

