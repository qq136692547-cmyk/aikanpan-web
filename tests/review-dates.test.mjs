import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { filterDatesInWindow } from "../src/lib/review-window.ts";

// 「日报日期探测不许再退回逐日探针」的护栏。
//
// 背景（2026-11-05 对账，Caddy access.log 全量）：
//   `/api/v1/workbench/daily-review` 共 86,257 次请求，其中 **59,269 次是 404（68.7%）**。
//   原因不是真人访问，是 `/review/` hub 与 sitemap 的日期探针：
//   旧实现为每个候选日期打一次探测，100 个候选里 22~33 天没有快照 → 404。
//   代码里写着「探针 fetch 自带 revalidate: 3600，不会每次渲染都打后端」，
//   **这个假设是错的**：Next 的 fetch 数据缓存不缓存非 2xx 响应。
//
//   现场实测（改前）：连续请求 `/review/` 两次 → 后端新增 44 个 404（22 个空日期 x 2）。
//   每个空日期一天被探 1,084 次，整齐得完全不像真人。
//   这些请求 UA 全是 `node`（SSR 发出），把「AI 接口调用量」污染成 74% 的假量。
//
// 修法：后端新增 `GET /workbench/review-dates`，直接列快照目录，一次请求给出全部日期。
// 语义与旧探针等价（`_daily_review_payload` 对非今天日期只有「文件在=200 / 不在=404」一条判定）。
//
// 这个文件守三件事：
//   1) 窗口裁剪纯函数的边界（跨月、跨年、未来日期、非法格式）；
//   2) 常规路径必须走列表接口，逐日探针只能出现在兜底函数里；
//   3) 常规路径（getExistingReviewDates 函数体）不得直接调用探针。

const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const read = (rel) => readFileSync(join(SRC_ROOT, rel), "utf8");

const DATES = read("lib/review-dates.ts");
const REVIEW_PAGE = read("app/review/page.tsx");
const SITEMAP = read("app/sitemap.ts");

// ---------- 1. 纯函数：窗口裁剪 ----------

test("窗口裁剪：100 天窗口含今天，下界当天的保留、再早一天剔除", () => {
  // 2026-11-05 往前推 99 天 = 2026-07-29
  const out = filterDatesInWindow(["2026-11-05", "2026-07-29", "2026-07-28"], 100, "2026-11-05");
  assert.deepEqual(out, ["2026-11-05", "2026-07-29"]);
});

test("窗口裁剪：跨年边界不会算错", () => {
  // 2027-01-05 往前推 9 天 = 2026-12-27
  const out = filterDatesInWindow(["2027-01-05", "2026-12-27", "2026-12-26"], 10, "2027-01-05");
  assert.deepEqual(out, ["2027-01-05", "2026-12-27"]);
});

test("窗口裁剪：未来日期必须剔除（快照名可能被手工改成未来日期）", () => {
  const out = filterDatesInWindow(["2026-11-06", "2026-11-05"], 100, "2026-11-05");
  assert.deepEqual(out, ["2026-11-05"]);
});

test("窗口裁剪：结果新的在前，且不信任输入顺序", () => {
  const out = filterDatesInWindow(["2026-11-01", "2026-11-05", "2026-11-03"], 10, "2026-11-05");
  assert.deepEqual(out, ["2026-11-05", "2026-11-03", "2026-11-01"]);
});

test("窗口裁剪：非法格式一律剔除，不抛错", () => {
  const out = filterDatesInWindow(
    ["2026-11-05", "2026-11-4", "20261105", "abc", "", "2026-13-01"],
    100,
    "2026-11-05"
  );
  // 2026-13-01 形状合法但月份越界，字符串比较会把它排在 today 之后，被 <= today 挡掉。
  assert.deepEqual(out, ["2026-11-05"]);
});

test("窗口裁剪：空输入 / days 非法时返回空数组而不是崩溃", () => {
  assert.deepEqual(filterDatesInWindow([], 100, "2026-11-05"), []);
  assert.deepEqual(filterDatesInWindow(["2026-11-05"], 0, "2026-11-05"), []);
  assert.deepEqual(filterDatesInWindow(["2026-11-05"], Number.NaN, "2026-11-05"), []);
});

// ---------- 2. 常规路径必须走列表接口 ----------

test("必须优先调用 /workbench/review-dates 列表接口", () => {
  assert.ok(
    DATES.includes("/workbench/review-dates"),
    "review-dates.ts 必须调用后端列表接口；退回逐日探针会再次制造每天 5 万次 404"
  );
});

test("逐日探针只能出现在兜底函数 probeOneByOne 里", () => {
  const body = DATES.slice(DATES.indexOf("async function probeOneByOne"));
  assert.ok(body.includes("hasReviewSnapshot("), "兜底函数应保留探针");
  // 兜底函数结束位置：下一个顶层 async function 或 export
  const end = body.indexOf("/**\n * 只返回", 1);
  assert.ok(end > 0, "找不到兜底函数边界，测试需要更新");
  const outside = body.slice(end);
  assert.ok(
    !outside.includes("hasReviewSnapshot("),
    "probeOneByOne 之外不得再调用探针 —— 那就是旧 bug 的形态"
  );
});

test("getExistingReviewDates 必须先问接口，再考虑兜底", () => {
  const start = DATES.indexOf("export async function getExistingReviewDates");
  assert.ok(start > 0, "找不到 getExistingReviewDates");
  const body = DATES.slice(start);
  const apiAt = body.indexOf("fetchExistingDatesFromApi()");
  const probeAt = body.indexOf("probeOneByOne()");
  assert.ok(apiAt > 0, "常规路径必须调用列表接口");
  assert.ok(probeAt > 0, "必须保留兜底路径");
  assert.ok(apiAt < probeAt, "接口调用必须在兜底之前");
  // 即便走到兜底分支，函数体里也不该直接出现探针调用
  assert.ok(
    !body.includes("hasReviewSnapshot("),
    "getExistingReviewDates 不得直接调探针，只能经由 probeOneByOne"
  );
});

test("接口返回结构不对时要退回兜底，不能当成空列表返回", () => {
  assert.ok(
    DATES.includes("if (!Array.isArray(list)) return null;"),
    "结构异常必须返回 null 触发兜底，否则 sitemap 会突然丢掉全部日报 URL"
  );
});

// ---------- 3. 两个调用点都还在用同一份来源 ----------

test("sitemap 与 /review/ hub 必须共用 getExistingReviewDates", () => {
  assert.ok(SITEMAP.includes("getExistingReviewDates"), "sitemap 必须复用同一份日期来源");
  assert.ok(REVIEW_PAGE.includes("getExistingReviewDates"), "/review/ hub 必须复用同一份日期来源");
});

test("regression: 页面注释不得再声称 404 会被 revalidate 缓存", () => {
  const bad = /revalidate:\s*3600[^\n]{0,40}不会每次渲染都打后端/;
  assert.ok(!bad.test(REVIEW_PAGE), "那句注释是错的前提，已导致 5.9 万次 404，不得复现");
});
