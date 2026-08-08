import test from "node:test";
import assert from "node:assert/strict";
import { formatAmount, formatMarketCap, formatPct, formatVolume } from "../src/lib/format.ts";

test("formatAmount handles negative compact values", () => {
  assert.equal(formatAmount(-5963487), "-596.35万");
  assert.equal(formatAmount(5963487), "596.35万");
  assert.equal(formatAmount(-1234567890), "-12.35亿");
  assert.equal(formatAmount(-596), "-596");
});

test("formatVolume handles negative values", () => {
  assert.equal(formatVolume(-15000), "-1.50万");
  assert.equal(formatVolume(-200000000), "-2.00亿");
  assert.equal(formatVolume(15000), "1.50万");
});

test("formatMarketCap handles negative values", () => {
  assert.equal(formatMarketCap(-100000000), "-1.00亿");
  assert.equal(formatMarketCap(-12345), "-1.23万");
  assert.equal(formatMarketCap(100000000), "1.00亿");
});

test("formatPct keeps explicit sign", () => {
  assert.equal(formatPct(-1.5), "-1.50%");
  assert.equal(formatPct(1.5), "+1.50%");
});
