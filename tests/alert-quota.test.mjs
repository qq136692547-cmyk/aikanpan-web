import test from "node:test";
import assert from "node:assert/strict";

import { ALERT_QUOTA_EXHAUSTED_CODE, isAlertQuotaError } from "../src/lib/alert-quota.ts";

// 盯盘配额是 403（不是 429），且文案里也含「升级 Pro」——
// 与 AI 额度是两套口径，混判会把两种配额算进同一个漏斗。

function err(message, code) {
  const e = new Error(message);
  if (code) e.code = code;
  return e;
}

test("按错误码识别盯盘满额", () => {
  assert.equal(isAlertQuotaError(err("随便什么文案", ALERT_QUOTA_EXHAUSTED_CODE)), true);
});

test("按文案识别免费档满额", () => {
  assert.equal(isAlertQuotaError(err("免费用户最多同时 1 条盯盘任务，升级 Pro 可创建 10 条")), true);
});

test("按文案识别 Pro 档满额", () => {
  assert.equal(isAlertQuotaError(err("盯盘任务最多同时 10 条")), true);
});

test("不把 AI 额度耗尽误判成盯盘满额", () => {
  assert.equal(isAlertQuotaError(err("今日 AI 次数已用完，升级 Pro 可获得更多额度")), false);
});

test("不把参数校验错误误判成满额", () => {
  assert.equal(isAlertQuotaError(err("code is required")), false);
  assert.equal(isAlertQuotaError(err("请填写股票代码和至少一条有效条件")), false);
});

test("空值不抛错", () => {
  assert.equal(isAlertQuotaError(null), false);
  assert.equal(isAlertQuotaError(undefined), false);
});
