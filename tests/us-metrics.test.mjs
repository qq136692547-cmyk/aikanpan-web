import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// F11 美股估值指标回归测试。
//
// 背景（都是真踩过的）：
//   1. 后端 `fetch_financials` 曾经请求 `/stock/basic_financials`（FMP 的命名，finnhub 没有），
//      自上线起从未成功，6 个指标恒为 "--"。修好后前端必须真的把每个字段都绑上，
//      否则「后端有数据、页面还是空」会再骗人一次。
//   2. 原来有两张卡是**编造值**：市销率用 `pe_ratio * 0.28` 现算，股息率硬编码 `"0.48%"`。
//      这类东西比缺数据更危险 —— 看起来像真数据，且无人能发现。
//   3. 单位有坑：`roe_pct` / `gross_margin_pct` 是**小数**口径（前端 ×100 展示），
//      而 `revenue_yoy_pct` 是**百分数**口径（直接拼 %）。混用会放大/缩小 100 倍。
//
// 钉的是「不变量」，不是现状快照：以后改文案、调顺序、换组件都不该假红；
// 但只要有人重新引入编造值、漏绑字段、或把单位改错，必须立刻变红。

const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const US_DETAIL = fileURLToPath(new URL("../src/components/us/us-stock-detail.tsx", import.meta.url));
const API_TYPES = fileURLToPath(new URL("../src/lib/api.ts", import.meta.url));

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

/** 抹掉注释（保留偏移与换行），避免把注释里的旧端点名当成真调用。 */
function blankComments(src) {
  const out = src.split("");
  const patterns = [/\/\*[\s\S]*?\*\//g, /(^|[^:])\/\/[^\n]*/g];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(src))) {
      const start = m.index + (m[1] ? m[1].length : 0);
      for (let i = start; i < m.index + m[0].length; i++) {
        if (out[i] !== "\n") out[i] = " ";
      }
    }
  }
  return out.join("");
}

const detailSrc = blankComments(readFileSync(US_DETAIL, "utf8"));
const apiSrc = readFileSync(API_TYPES, "utf8");

// 六张估值卡各自应绑定的后端字段
const REQUIRED_FIELDS = [
  "pe_ratio",
  "pb_ratio",
  "ps_ratio",
  "roe_pct",
  "gross_margin_pct",
  "dividend_yield_pct",
];

test("六张估值卡都绑定了后端真实字段", () => {
  const used = new Set(
    [...detailSrc.matchAll(/financials\?\.metrics\?\.([a-z_]+)/g)].map((m) => m[1]),
  );
  for (const field of REQUIRED_FIELDS) {
    assert.ok(used.has(field), `us-stock-detail 没有绑定 metrics.${field}`);
  }
});

test("不允许用「某个字段 × 常数」冒充另一个指标", () => {
  // 曾经的写法：市销率 = pe_ratio * 0.28
  // ×100 是合法的小数→百分数换算，排除掉；其余「字段 × 任意常数」都视为编造值。
  const all = [...detailSrc.matchAll(/metrics\??\.[a-z_]+\s*\*\s*([\d.]+)/g)];
  const fabricated = all.filter((m) => Number(m[1]) !== 100).map((m) => m[0]);
  assert.deepEqual(fabricated, [], `发现编造指标：${fabricated.join(" / ")}`);
});

test("不允许硬编码百分数字面量充当指标值", () => {
  // 曾经的写法：股息率 = roe_pct != null ? "0.48%" : "--"
  const hit = [...detailSrc.matchAll(/\?\s*"\d+(?:\.\d+)?%"\s*:/g)].map((m) => m[0]);
  assert.deepEqual(hit, [], `发现硬编码百分比：${hit.join(" / ")}`);
});

test("小数口径字段必须 ×100 展示（否则会差 100 倍）", () => {
  for (const field of ["roe_pct", "gross_margin_pct"]) {
    assert.ok(
      new RegExp(`metrics\\??\\.${field}\\s*\\*\\s*100`).test(detailSrc),
      `${field} 是小数口径，渲染时必须 ×100`,
    );
  }
});

test("百分数口径字段不得再 ×100", () => {
  // revenue_yoy_pct 走 formatPct（直接拼 %），dividend_yield_pct 直接 toFixed 拼 %
  const offenders = [];
  for (const file of walk(SRC_ROOT)) {
    if (!/\.(ts|tsx)$/.test(file)) continue;
    const src = blankComments(readFileSync(file, "utf8"));
    for (const field of ["revenue_yoy_pct", "dividend_yield_pct"]) {
      const re = new RegExp(`${field}\\s*\\*\\s*100`);
      if (re.test(src)) offenders.push(`${file}: ${field} * 100`);
    }
  }
  assert.deepEqual(offenders, [], `这些地方把百分数口径又乘了 100：${offenders.join(" / ")}`);
});

test("UsFinancials 类型声明了 ps_ratio 与 dividend_yield_pct", () => {
  const start = apiSrc.indexOf("export interface UsFinancials");
  assert.ok(start >= 0, "找不到 UsFinancials 接口");
  const block = apiSrc.slice(start, apiSrc.indexOf("\n}", start));
  for (const field of ["ps_ratio", "dividend_yield_pct"]) {
    assert.ok(block.includes(`${field}?: number`), `UsFinancials 缺少 ${field}`);
  }
});
