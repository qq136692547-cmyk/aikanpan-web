import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { classifyQuoteFailure } from "../src/lib/quote-failure.ts";

/** 造一个和 src/lib/api.ts request() 抛出来的形状一致的错误：Error + .status */
function apiError(status, message) {
  const err = new Error(message || `API ${status}`);
  err.status = status;
  return err;
}

test("classifyQuoteFailure: 503 与 404 判为 not-found", () => {
  // 后端对「这个代码没有行情」返回 503 "quote data unavailable"；
  // 如果哪天改成 404，这条断言保证判定不退化。
  assert.equal(classifyQuoteFailure(apiError(503)), "not-found");
  assert.equal(classifyQuoteFailure(apiError(404)), "not-found");
});

test("classifyQuoteFailure: 5xx / 限流 / 鉴权一律判为 transient", () => {
  // 数据源抛异常时 _cached_fetch 原样抛 → FastAPI 500。
  assert.equal(classifyQuoteFailure(apiError(500)), "transient");
  assert.equal(classifyQuoteFailure(apiError(502)), "transient");
  assert.equal(classifyQuoteFailure(apiError(429)), "transient");
  assert.equal(classifyQuoteFailure(apiError(403)), "transient");
  assert.equal(classifyQuoteFailure(apiError(401)), "transient");
});

test("classifyQuoteFailure: 超时（DOMException）判为 transient", () => {
  // AbortSignal.timeout() 抛的是 DOMException，不是 Error 的子类。
  const timeout = new DOMException("The operation was aborted due to timeout", "TimeoutError");
  assert.equal(classifyQuoteFailure(timeout), "transient");
  const aborted = new DOMException("The operation was aborted.", "AbortError");
  assert.equal(classifyQuoteFailure(aborted), "transient");
});

test("classifyQuoteFailure: 网络错（TypeError）判为 transient", () => {
  assert.equal(classifyQuoteFailure(new TypeError("fetch failed")), "transient");
});

test("classifyQuoteFailure: 无 status / 非对象输入默认 transient", () => {
  // 默认必须是 transient：不确定的时候不许声称「这个代码不存在」。
  assert.equal(classifyQuoteFailure(null), "transient");
  assert.equal(classifyQuoteFailure(undefined), "transient");
  assert.equal(classifyQuoteFailure(new Error("boom")), "transient");
  assert.equal(classifyQuoteFailure("503"), "transient");
  assert.equal(classifyQuoteFailure(503), "transient");
  assert.equal(classifyQuoteFailure({}), "transient");
  // status 是字符串（比如某些中间件塞进来的）不能当成数字命中。
  assert.equal(classifyQuoteFailure({ status: "503" }), "transient");
});

test("个股页按分类结果决定 404 还是抛错，不再一律 notFound", () => {
  const page = readFileSync(
    new URL("../src/app/stock/[code]/page.tsx", import.meta.url),
    "utf8"
  );
  // 依据状态码分流，而不是「quote 为空就 404」。
  assert.ok(page.includes("classifyQuoteFailure("), "个股页必须用 classifyQuoteFailure 分流");
  assert.ok(
    page.includes('if (classifyQuoteFailure(quoteError) === "not-found") notFound();'),
    "只有 not-found 才允许 notFound()"
  );
  // 瞬时故障要抛出去（Next 返回 500，且 ISR 不缓存 500）。
  assert.match(page, /throw quoteError instanceof Error/, "瞬时故障必须 throw，不能静默降级");
  // 美股探针分支同理：Finnhub 429/500 不该把有效代码变成 404。
  assert.ok(
    page.includes('if (classifyQuoteFailure(e) === "transient") throw e;'),
    "美股探针分支必须把瞬时故障抛出去"
  );
});

test("个股页不再把 allSettled 包在 try/catch 里（那段 catch 是死代码）", () => {
  const page = readFileSync(
    new URL("../src/app/stock/[code]/page.tsx", import.meta.url),
    "utf8"
  );
  const code = page.replace(/\/\/[^\n]*/g, "").replace(/\/\*[\s\S]*?\*\//g, "");
  // allSettled 永不 reject，包在它外面的 catch 永远不会执行 —— 失败因此完全无声。
  assert.doesNotMatch(
    code,
    /try\s*\{[^}]*Promise\.allSettled/,
    "allSettled 外面不要再套 try/catch，它是死代码"
  );
  // 失败原因必须打日志，不能吞掉。
  assert.ok(code.includes("failureLines"), "必须汇总失败原因并打出来");
  assert.match(code, /console\.warn\(`\[stock\/\$\{code\}\] 取数失败/, "失败要有一条可 grep 的日志");
  // 首次失败、重试成功也要留信号：否则「页面好着」和「后端在抖」在日志里分不出来。
  assert.match(code, /console\.warn\(\s*`\[stock\/\$\{code\}\] 行情首次请求失败/, "重试成功必须留痕");
});

test("行情请求带独立超时与一次重试", () => {
  const page = readFileSync(
    new URL("../src/app/stock/[code]/page.tsx", import.meta.url),
    "utf8"
  );
  assert.match(page, /const QUOTE_TIMEOUT_MS = 8000/, "首次超时应为 8s");
  assert.match(page, /const QUOTE_RETRY_TIMEOUT_MS = 4000/, "重试超时应为 4s");
  assert.ok(page.includes("AbortSignal.timeout(timeoutMs)"), "必须真的把 signal 传给请求");
});
