import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { INDEXABLE_STOCK_CODES, isIndexableStockCode } from "../src/lib/stock-seo.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

const publicRoutes = [
  ["src/app/page.tsx", "/"],
  ["src/app/market/page.tsx", "/market/"],
  ["src/app/review/page.tsx", "/review/"],
  ["src/app/research/page.tsx", "/research/"],
  ["src/app/portfolio/page.tsx", "/portfolio/"],
  ["src/app/alerts/page.tsx", "/alerts/"],
  ["src/app/stocks/page.tsx", "/stocks/"],
  ["src/app/market/temperature/page.tsx", "/market/temperature/"],
  ["src/app/market/limit-up/page.tsx", "/market/limit-up/"],
  ["src/app/market/fund-flow/page.tsx", "/market/fund-flow/"],
  ["src/app/about/page.tsx", "/about/"],
  ["src/app/api-docs/page.tsx", "/api-docs/"],
  ["src/app/privacy/page.tsx", "/privacy/"],
  ["src/app/terms/page.tsx", "/terms/"],
];

test("root layout does not force every page to the homepage canonical", () => {
  const layout = read("src/app/layout.tsx");
  assert.doesNotMatch(layout, /alternates:\s*\{\s*canonical:\s*"\/"/);
});

test("public pages declare their own canonical URL", () => {
  for (const [path, canonical] of publicRoutes) {
    const source = read(path);
    assert.ok(
      source.includes(`canonical: "${canonical}"`),
      `${path} should declare ${canonical}`
    );
  }
});

test("private and discovery pages stay out of search results", () => {
  for (const path of [
    "src/app/account/layout.tsx",
    "src/app/admin/layout.tsx",
    "src/app/search/page.tsx",
    "src/app/upgrade/page.tsx",
  ]) {
    assert.ok(
      read(path).includes("robots: { index: false, follow: true }"),
      `${path} should be noindex`
    );
  }
});

test("sitemap includes terms but excludes private and pending routes", () => {
  const sitemap = read("src/app/sitemap.ts");
  assert.ok(sitemap.includes('SITE_URL + "/terms/"'));
  assert.ok(sitemap.includes('SITE_URL + "/stocks/"'));
  assert.ok(sitemap.includes('SITE_URL + "/market/temperature/"'));
  assert.ok(sitemap.includes('SITE_URL + "/market/limit-up/"'));
  assert.ok(sitemap.includes('SITE_URL + "/market/fund-flow/"'));
  assert.ok(sitemap.includes("getRecentReviewDates"));
  assert.ok(!sitemap.includes('SITE_URL + "/account/"'));
  assert.ok(!sitemap.includes('SITE_URL + "/upgrade/"'));
  assert.ok(sitemap.includes("INDEXABLE_STOCK_CODES.map"));
  assert.ok(!sitemap.includes("TSLA"));
});

test("stock indexing uses a covered, unique stock list", () => {
  const cn = INDEXABLE_STOCK_CODES.filter((code) => /^(sh|sz|bj)\d{6}$/.test(code));
  const us = INDEXABLE_STOCK_CODES.filter((code) => /^[A-Z][A-Z0-9.-]{0,9}$/.test(code));
  assert.ok(cn.length >= 60);
  assert.ok(us.length >= 3);
  assert.equal(new Set(INDEXABLE_STOCK_CODES).size, INDEXABLE_STOCK_CODES.length);
  assert.equal(isIndexableStockCode("sh.600519"), true);
  assert.equal(isIndexableStockCode("AAPL"), true);
  assert.equal(isIndexableStockCode("TSLA"), false);

  const page = read("src/app/stock/[code]/page.tsx");
  assert.ok(page.includes("robots: { index: indexable, follow: true }"));
  assert.ok(page.includes("api.getUsQuote(routeCode)"));
  assert.ok(page.includes("<UsStockDetail symbol={routeCode} initialData={initialData} />"));
});

test("dated review pages have canonical metadata and sitemap coverage", () => {
  const page = read("src/app/review/[date]/page.tsx");
  assert.ok(page.includes("canonical: `/review/${date}/`"));
  assert.ok(page.includes("getRecentReviewDates"));
  assert.ok(page.includes("robots") === false || page.includes("notFound"));
});

test("pricing copy is consistent and no longer says the site is free", () => {
  const about = read("src/app/about/page.tsx");
  const home = read("src/components/home/home-content.tsx");
  const homepage = read("src/app/page.tsx");
  assert.ok(!about.includes("网站不收费"));
  assert.ok(about.includes("季卡 ¥49/90 天"));
  assert.ok(home.includes("季卡 ¥49/90 天"));
  assert.ok(homepage.includes("季卡 ¥49/90 天"));
  assert.ok(!about.includes("闲鱼"));
  assert.ok(!home.includes("闲鱼"));
  assert.ok(!homepage.includes("闲鱼"));
  assert.ok(!about.includes("¥199"));
  assert.ok(!home.includes("¥199"));
  assert.ok(!homepage.includes("¥199"));
});
