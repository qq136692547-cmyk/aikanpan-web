import assert from "node:assert/strict";
import test from "node:test";

import {
  getNavigationSubnav,
  marketModeHref,
  resolveNavigationContext,
} from "../src/lib/navigation.ts";

test("stock details inherit their own market context", () => {
  const context = resolveNavigationContext("/stock/aapl/");
  assert.equal(context.scope, "us");
  assert.equal(context.activePath, "/market");
  assert.equal(context.breadcrumb.map((item) => item.label).join(" › "), "美股 › 市场 › 个股 AAPL");
  assert.equal(context.showBreadcrumb, true);
});

test("cn stock details stay in the cn context", () => {
  const context = resolveNavigationContext("/stock/sh600519/");
  assert.equal(context.scope, "cn");
  assert.equal(context.activePath, "/market");
  assert.equal(context.breadcrumb[0].label, "A股");
});

test("market pages keep the selected market and highlight their own tab", () => {
  const context = resolveNavigationContext("/research/", "market=us");
  assert.equal(context.scope, "us");
  assert.equal(context.activePath, "/research");
  assert.equal(context.showBreadcrumb, false);
  assert.deepEqual(getNavigationSubnav(context.scope).map((item) => item.label), [
    "市场",
    "复盘",
    "研究",
    "搜索",
    "盯盘",
  ]);
});

test("portfolio belongs to research and preserves market switching", () => {
  const context = resolveNavigationContext("/portfolio/", "market=us");
  assert.equal(context.scope, "us");
  assert.equal(context.activePath, "/research");
  assert.equal(marketModeHref(context, "cn"), "/portfolio?market=cn");
});

test("all mode only exposes home and about", () => {
  const context = resolveNavigationContext("/upgrade");
  assert.equal(context.scope, "all");
  assert.deepEqual(getNavigationSubnav("all").map((item) => item.label), ["首页", "关于"]);
  assert.equal(marketModeHref(context, "cn"), "/market/?market=cn");
});
