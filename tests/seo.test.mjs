import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import test from "node:test";
import { INDEXABLE_STOCK_CODES, isIndexableStockCode } from "../src/lib/stock-seo.ts";

function read(path) {
  return readFileSync(new URL(`../${path}`, import.meta.url), "utf8");
}

/** 断言源码形态的测试必须先剥注释，否则「描述历史 bug」的注释会把断言打成假失败。 */
function readCode(path) {
  return read(path)
    .replace(/\/\/[^\n]*/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");
}

/** 递归收集 src/app 下的 tsx/ts 文件（相对仓库根的 posix 路径）。 */
function walkApp(dir = "src/app") {
  const base = new URL("../", import.meta.url);
  const out = [];
  for (const entry of readdirSync(new URL(dir, base), { withFileTypes: true })) {
    const child = `${dir}/${entry.name}`;
    if (entry.isDirectory()) out.push(...walkApp(child));
    else if (/\.tsx?$/.test(entry.name)) out.push(child);
  }
  return out;
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
    "src/app/api-docs/page.tsx",
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
  // 2026-10-27（D13）：日报日期来源从「sitemap 本地探针」抽到 src/lib/review-dates.ts，
  // 与 /review/ hub 共用同一份。断言随之改为钉住**不变量**：sitemap 必须走存在性探针，
  // 且不得退回纯日历滚动窗口（后者会把断档日塞进 sitemap，进 GSC 就是一堆 404）。
  assert.ok(sitemap.includes("getExistingReviewDates"), "sitemap 必须用存在性探针挑日报日期");
  assert.ok(!sitemap.includes("getRecentReviewDates("), "sitemap 不得退回纯日历窗口枚举日报");
  assert.ok(!sitemap.includes('SITE_URL + "/account/"'));
  assert.ok(!sitemap.includes('SITE_URL + "/upgrade/"'));
  // G10（2026-10-27）：/api-docs/ 加 noindex 并移出 sitemap，防止回流。
  assert.ok(!sitemap.includes('SITE_URL + "/api-docs/"'));
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
  // 2026-10-26 变更（D2/D12/周末 canonical）：
  // canonical 不再写死当日，而是经 resolveCanonicalReviewDate 解析 ——
  // 工作日指向自身，周六/周日指向同周周五（后端周末快照与周五完全相同，属重复内容）。
  assert.ok(page.includes("canonical: `/review/${await resolveCanonicalReviewDate(date)}/`"));
  assert.ok(page.includes("getRecentReviewDates"));
  // 断档日改为 200 说明页 + noindex（站主决定），故此处必须保留 notFound 用于非法日期格式。
  assert.ok(page.includes("notFound"));
  assert.ok(page.includes('robots: { index: false, follow: true }'));
});

test("structured data never declares the whole site free", () => {
  // 2026-10-26（D4）：根 layout 的 WebApplication 与 /alerts/ 各有一份 JSON-LD，
  // 原本 offers 写的是 price:"0"，等于向每个页面声明全站免费。
  // 改为 AggregateOffer 后正确形态是 lowPrice/highPrice，且不得再出现真正的 price:"0"。
  // 注意：注释里会提到 price:"0" 这段历史，所以断言前必须剥掉注释，否则会误伤。
  for (const file of ["src/app/layout.tsx", "src/app/alerts/page.tsx"]) {
    const raw = read(file);
    const code = raw.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
    assert.ok(!/price:\s*"0"/.test(code), `${file} 仍在结构化数据里声明 price:"0"`);
    assert.ok(/"@type":\s*"AggregateOffer"/.test(code), `${file} 的 offers 不是 AggregateOffer`);
    assert.ok(/lowPrice:\s*"19\.9"/.test(code), `${file} 缺真实低价 lowPrice`);
    assert.ok(/highPrice:\s*"49"/.test(code), `${file} 缺真实高价 highPrice`);
  }
});

/** 从源码里抠出 `key: { ... }` 这个对象字面量（花括号计数，够用于 metadata 这种浅对象）。 */
function extractObject(code, key) {
  const at = code.indexOf(`${key}:`);
  if (at === -1) return null;
  const start = code.indexOf("{", at);
  if (start === -1) return null;
  let depth = 0;
  for (let i = start; i < code.length; i += 1) {
    if (code[i] === "{") depth += 1;
    else if (code[i] === "}") {
      depth -= 1;
      if (depth === 0) return code.slice(start, i + 1);
    }
  }
  return null;
}

test("root layout leaves twitter title empty so pages inherit their own openGraph", () => {
  // 2026-10-26（④-2）：Next 的 resolve-metadata.js:628 只在 twitter **缺** title 时才从
  // openGraph 继承（hasTwTitle）。根 layout 写死过全站标题，于是 17 个页面的 og:title
  // 都是对的、twitter 卡片却一律是全站默认。这里把它钉死：根 layout 的 twitter 只许
  // 保留 card 与 images，一旦有人为了「看得见」把 title 加回来，分享卡片就会重新全错。
  const code = readCode("src/app/layout.tsx");
  const twitter = extractObject(code, "twitter");
  assert.ok(twitter, "layout.tsx 必须有 twitter 对象，否则卡片没有 card 类型");
  assert.match(twitter, /card:\s*"summary_large_image"/);
  assert.match(twitter, /images:/);
  assert.doesNotMatch(twitter, /\btitle:/, "twitter.title 会盖掉所有页面的 og:title");
  assert.doesNotMatch(twitter, /\bdescription:/, "twitter.description 会盖掉所有页面的 og:description");
});

test("every page builds openGraph through the shared builder", () => {
  // 2026-10-26（D3/④-1）：Next 的 openGraph 是整体替换而非深合并，页面只写 { url } 就会把
  // 父级 og:image 冲掉。收敛到 buildOpenGraph() 后，title/description/url/siteName/locale/images
  // 六项天生齐全，任何人都没法再漏掉其中一项。根 layout 自己是全站默认，可以手写。
  const offenders = walkApp()
    .filter((file) => file !== "src/app/layout.tsx")
    .filter((file) => {
      const code = readCode(file);
      return code.includes("openGraph") && !code.includes("buildOpenGraph(");
    });
  assert.deepEqual(offenders, [], `这些页面绕过了 buildOpenGraph：${offenders.join(", ")}`);

  const builder = readCode("src/lib/open-graph.ts");
  for (const field of ["siteName", "locale", "images:", "url"]) {
    assert.ok(builder.includes(field), `buildOpenGraph 缺 ${field}，该字段会被父级冲掉`);
  }
});

test("review hub links to every real snapshot date, not a calendar window", () => {
  // 2026-10-27（D13）：原来 hub 只链最近 10 天（getRecentReviewDates(10)），而真实有快照的
  // 日期远不止 10 个 —— 几十个日报页只靠前后翻页互链，站内链接图几乎断掉。
  // 现在 hub 与 sitemap 共用 getExistingReviewDates()：既覆盖全部真实日期，又不会链到断档日的
  // noindex 说明页（把内链权重导向 noindex 是浪费）。
  const hub = readCode("src/app/review/page.tsx");
  assert.ok(hub.includes("getExistingReviewDates"), "hub 必须用存在性探针取日期");
  assert.ok(!hub.includes("getRecentReviewDates(10)"), "hub 不得退回 10 天滚动窗口");
  assert.ok(hub.includes("href={`/review/${date}/`}"), "hub 的日期必须是真链接，不能只渲染文本");

  const lib = readCode("src/lib/review-dates.ts");
  // 窗口必须够长：站点真实日报页约 60~75 个，30 天窗口只能覆盖 30 个。
  const lookback = Number(lib.match(/REVIEW_LOOKBACK_DAYS\s*=\s*(\d+)/)?.[1]);
  assert.ok(lookback >= 90, `REVIEW_LOOKBACK_DAYS=${lookback}，覆盖不到全部日报页`);
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
