import test from "node:test";
import assert from "node:assert/strict";

import { isAlipayOrderPaid } from "../src/lib/payment.ts";

test("Alipay only treats settled orders as paid", () => {
  assert.equal(isAlipayOrderPaid("TRADE_SUCCESS"), true);
  assert.equal(isAlipayOrderPaid("TRADE_FINISHED"), true);
  assert.equal(isAlipayOrderPaid("WAIT_BUYER_PAY"), false);
  assert.equal(isAlipayOrderPaid(undefined), false);
});
