import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";

// 这些断言钉的是「不变量」，不是现状描述：
// 任何一条失败都意味着有人把错误处理链路上的一个必要环节拆掉了。

const APP_ERROR = new URL("../src/app/error.tsx", import.meta.url);
const GLOBAL_ERROR = new URL("../src/app/global-error.tsx", import.meta.url);
const ROOT_LOADING = new URL("../src/app/loading.tsx", import.meta.url);
const ANALYTICS = new URL("../src/lib/analytics.ts", import.meta.url);

test("路由级与根级错误边界都存在", () => {
  // /stock/[code] 在后端瞬时故障时 throw，没有这两个文件就是 Next 默认错误页。
  assert.equal(existsSync(APP_ERROR), true, "src/app/error.tsx 必须存在");
  assert.equal(existsSync(GLOBAL_ERROR), true, "src/app/global-error.tsx 必须存在");
});

test("global-error 自带 <html> 与 <body>，且不依赖 layout 组件", () => {
  const src = readFileSync(GLOBAL_ERROR, "utf8");
  // Next 要求：global-error 会替换根 layout，不写这两个标签直接报错/白屏。
  assert.match(src, /<html[\s>]/, "global-error 必须渲染 <html>");
  assert.match(src, /<body[\s>]/, "global-error 必须渲染 <body>");
  // 根 layout 挂了才走到这里，Navbar/Footer 可能正是失败源。
  assert.doesNotMatch(src, /from\s+["']@\/components\/(layout|ui|system)\//, "global-error 不得 import layout 组件");
});

test("两个边界都上报 client_error，并用 scope 区分来源", () => {
  const app = readFileSync(APP_ERROR, "utf8");
  const globalErr = readFileSync(GLOBAL_ERROR, "utf8");
  assert.ok(app.includes("reportClientError("), "error.tsx 必须上报");
  assert.ok(globalErr.includes("reportClientError("), "global-error.tsx 必须上报");
  // scope 必须能区分：否则线上分不清是路由级还是根级崩了。
  assert.ok(app.includes('scope: "app"'), 'error.tsx 的 scope 必须是 "app"');
  assert.ok(globalErr.includes('scope: "global"'), 'global-error.tsx 的 scope 必须是 "global"');
});

test("上报走专用错误通道，不塞 analytics 事件", () => {
  const src = readFileSync(ANALYTICS, "utf8");
  // 错误边界会反复重渲染；没有去重+上限，等于把接口变成自激振荡器。
  assert.ok(src.includes("reportedClientErrors"), "必须有已上报集合");
  assert.match(src, /reportedClientErrors\.has\(/, "必须按 key 去重");
  assert.match(src, /CLIENT_ERROR_LIMIT/, "必须有每次加载的条数上限");
  assert.match(src, /sanitizeMessage\(/, "错误 message 必须先脱敏（可能带 out_trade_no）");
  // 关键：/analytics/events 有事件名白名单（server.py 的 _ANALYTIC_EVENT_TYPES），
  // client_error 不在其中 → 发过去是 accepted:false，等于什么都没记。
  // 专用通道是 /api/v1/monitor/errors。这条断言防的就是"看起来上报了、其实被拒收"。
  assert.match(src, /\/monitor\/errors/, "必须走 /monitor/errors 专用通道");
  assert.doesNotMatch(
    src,
    /sendEvent\(\s*"client_error"/,
    "client_error 不在 analytics 事件白名单里，发过去会被整条拒收"
  );
});

test("error.tsx 调用了 reset()", () => {
  const src = readFileSync(APP_ERROR, "utf8");
  // 只给「回首页」不够：用户想留在当前页重试。
  assert.match(src, /reset\(\)/, "必须提供 reset() 重试入口");
});

test("不存在 app/loading.tsx —— 防止把 404 变成软 404", () => {
  // 根级 loading.tsx 会建立 Suspense 边界、让响应头在 notFound() 之前就发出 200，
  // 于是 /stock/sh999999/ 这类现在正确返回 404 的页面会变成「200 + 空壳」。
  // 后人「顺手补一个 loading.tsx」时必须先看见这条断言。
  assert.equal(existsSync(ROOT_LOADING), false, "不要新增 src/app/loading.tsx（见注释）");
});
