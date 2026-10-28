import test from "node:test";
import assert from "node:assert/strict";
import { friendlyDataSource, NEUTRAL_QUOTE_SOURCE } from "../src/lib/data-source.ts";

// friendlyDataSource() 的单测（技术债清单里的「无非空单测」）。
//
// 这个函数看起来只有 4 个分支，但它承担一条**合规**职责（F7）：
// 后端 quote.source 是内部代号，展示层绝不能把它原样透给用户，
// 否则页面上会出现第三方数据源的商标名 / 无意义的内部标记。
//
// 所以这里不满足于「每个分支返回什么」——
// 核心是一条闭集断言：**任何输入，输出都必须落在这 4 个中性串里**。
// 以后谁想加 `case "sina": return "新浪"`，会立刻变红，被迫回头想合规问题。

const ALLOWED = new Set([
  "行情数据不可用",
  "历史行情数据",
  "公开数据接口",
  NEUTRAL_QUOTE_SOURCE,
]);

/** 输出里绝不允许出现的数据源商标 / 内部代号 */
const FORBIDDEN_SUBSTRINGS = [
  "新浪", "腾讯", "东方财富", "东财", "雪球", "网易", "百度", "同花顺",
  "sina", "tencent", "eastmoney", "finnhub", "eodhd", "xueqiu", "gtimg", "push2",
];

test("三个已知语义标记各自映射到固定文案", () => {
  assert.equal(friendlyDataSource("unavailable"), "行情数据不可用");
  assert.equal(friendlyDataSource("history"), "历史行情数据");
  assert.equal(friendlyDataSource("web"), "公开数据接口");
});

test("空值返回中性兜底：非空、不是占位符", () => {
  // 「非空单测」的字面要求：空输入也不能返回空串 / undefined / "-" / "unknown"。
  for (const v of [undefined, null, "", "   ", "\t\n"]) {
    const out = friendlyDataSource(v);
    assert.equal(typeof out, "string", `输入 ${JSON.stringify(v)} 返回了非字符串`);
    assert.ok(out.trim().length > 0, `输入 ${JSON.stringify(v)} 返回了空串`);
    assert.equal(out, NEUTRAL_QUOTE_SOURCE, `输入 ${JSON.stringify(v)} 应落到中性兜底`);
  }
});

test("大小写与前后空白容错", () => {
  assert.equal(friendlyDataSource(" UNAVAILABLE "), "行情数据不可用");
  assert.equal(friendlyDataSource("History"), "历史行情数据");
  assert.equal(friendlyDataSource("\tWeb\n"), "公开数据接口");
});

test("★ 闭集：任何输入都只能落在 4 个中性串里", () => {
  // 这一条是主守卫。输入面覆盖真实后端代号 + 畸形值，
  // 断言输出集合封闭 —— 新增任何映射（哪怕看起来无害）都必须先过这条。
  const inputs = [
    // 真实出现过的后端代号
    "sina", "tx", "tencent", "eastmoney", "em", "push2", "push2his", "finnhub",
    "xueqiu", "netease", "baidu", "eodhd", "mock", "cache", "fallback", "stale",
    // 域名形态
    "hq.sinajs.cn", "money.finance.sina.com.cn", "ifzq.gtimg.cn", "emweb.securities.eastmoney.com",
    // 畸形/边界
    "-", "?", "0", "unknown", "null", "undefined", " ", "  SINA  ", "Sina_Kline",
    // 已知语义标记本身
    "unavailable", "history", "web",
  ];
  const bad = [];
  for (const code of inputs) {
    const out = friendlyDataSource(code);
    if (!ALLOWED.has(out)) bad.push(`输入 ${JSON.stringify(code)} → ${JSON.stringify(out)}（不在许可集合内）`);
  }
  assert.equal(bad.length, 0, `friendlyDataSource 输出了未许可的文案：\n${bad.join("\n")}`);
});

test("★ 输出永不含具体数据源商标名", () => {
  // 与上一条互补：闭集管「不许出现第 5 种文案」，
  // 这条管「已有文案里也不许夹商标」，防止有人把 NEUTRAL_QUOTE_SOURCE 改成「腾讯行情」。
  const samples = ["sina", "tencent", "eastmoney", "finnhub", "unavailable", "history", "web", "", "?"];
  const bad = [];
  for (const code of samples) {
    const out = friendlyDataSource(code);
    for (const word of FORBIDDEN_SUBSTRINGS) {
      if (out.toLowerCase().includes(word.toLowerCase())) {
        bad.push(`输入 ${JSON.stringify(code)} → ${JSON.stringify(out)} 命中商标/内部词 "${word}"`);
      }
    }
  }
  for (const word of FORBIDDEN_SUBSTRINGS) {
    if (NEUTRAL_QUOTE_SOURCE.toLowerCase().includes(word.toLowerCase())) {
      bad.push(`NEUTRAL_QUOTE_SOURCE 自身含有 "${word}"`);
    }
  }
  assert.equal(bad.length, 0, bad.join("\n"));
});

test("内部代号不被原样回显", () => {
  // 即使将来兜底文案改了，也不能退化成一个「原样 echo」的实现。
  for (const code of ["sina", "tencent", "eastmoney", "finnhub", "SINA"]) {
    const out = friendlyDataSource(code);
    assert.notEqual(out.toLowerCase(), code.trim().toLowerCase(), `"${code}" 被原样返回`);
  }
});
