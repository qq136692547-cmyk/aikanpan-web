import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// 钉「定时刷新不该为看不见的页面付钱」这条不变量。
// 每条断言都对应一种会静默退化回去的写法。

const SRC = readFileSync(new URL("../src/components/system/auto-refresh.tsx", import.meta.url), "utf8");

test("定时回调必须经过可见性判断，不能裸调 router.refresh()", () => {
  // 退化写法：setInterval(() => router.refresh(), interval)
  // 实测该写法在隐藏标签页里每小时仍打 120 次 RSC 请求（后台不节流 30s 定时器）。
  assert.match(SRC, /document\.hidden/, "必须在刷新前判断 document.hidden");
  assert.match(SRC, /setInterval\(\s*tick\s*,/, "定时器回调必须是带判断的 tick");
  assert.doesNotMatch(
    SRC,
    /setInterval\(\s*\(\s*\)\s*=>\s*\{?\s*router\.refresh\(\)/,
    "不许把 router.refresh() 直接塞进 setInterval"
  );
});

test("tick 里的判断在最前面 —— 先判隐藏再刷新", () => {
  const tick = SRC.match(/const tick = \(\) => \{([\s\S]*?)\n    \};/);
  assert.ok(tick, "找不到 tick 定义");
  const body = tick[1];
  const guardAt = body.search(/document\.hidden/);
  const refreshAt = body.search(/refresh\(\)/);
  assert.ok(guardAt >= 0, "tick 里没有 document.hidden 判断");
  assert.ok(refreshAt >= 0, "tick 里没有刷新调用");
  assert.ok(guardAt < refreshAt, "判断必须在刷新之前，否则等于没判断");
});

test("监听 visibilitychange 并在卸载时移除", () => {
  assert.match(SRC, /addEventListener\(\s*["']visibilitychange["']/, "必须监听 visibilitychange");
  // 不移除 → 组件重挂载后叠加多个监听，每次切标签刷好几次。
  assert.match(SRC, /removeEventListener\(\s*["']visibilitychange["']/, "清理函数必须移除监听");
  assert.match(SRC, /clearInterval\(/, "清理函数必须清定时器");
});

test("补刷按「隐藏了多久」判断，而不是「距上次刷新多久」", () => {
  // 按「距上次刷新」判断：隐藏两小时后再回来，只要刚刚刷过就跳过 → 用户白等一个周期。
  assert.match(SRC, /RESUME_MIN_HIDDEN_MS/, "必须有隐藏时长阈值");
  assert.match(SRC, /hiddenSince/, "必须记录进入隐藏的时刻");
});
