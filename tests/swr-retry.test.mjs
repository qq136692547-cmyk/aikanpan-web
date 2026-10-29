import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// 「别让失败请求无限重试」的护栏。
//
// 背景（2026-10-29 对账）：
//   SWR 的 shouldRetryOnError 默认是无限次指数退避，项目里没有任何 SWRConfig 覆盖。
//   AI 额度用完后接口持续 429，后台标签页就会一直重试：某访客 02:27:55 被卡住，
//   之后 65 分钟内又发了 20 次请求（6s/32s/68s/144s/365s/816s/1277s/2473s/4254s/5325s）。
//   每次 429 都会在 lib/api.ts 的传输层记一条 ai_quota_hit，
//   于是「1 个人被卡住」被记成「21 次撞墙」，20 天漏斗数据失真十倍。
//
// 这个文件守两件事：
//   1) 全局必须有一个覆盖了 onErrorRetry 的 SWRConfig，且 4xx 不重试、其它最多 2 次；
//   2) lib/api.ts 必须继续把 HTTP 状态码挂到 err.status —— 重试策略完全依赖它，
//      那边一旦改成只抛 message，4xx 判定会静默失效，谁都不会发现。

const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const PROVIDER = join(SRC_ROOT, "components/system/swr-provider.tsx");
const LAYOUT = join(SRC_ROOT, "app/layout.tsx");
const API = join(SRC_ROOT, "lib/api.ts");

const read = (path) => readFileSync(path, "utf8");

test("swr-provider 存在，且是客户端组件", () => {
  assert.ok(existsSync(PROVIDER), "缺少 src/components/system/swr-provider.tsx");
  assert.match(read(PROVIDER), /^\s*"use client";/m, "SwrProvider 必须是客户端组件");
});

test("onErrorRetry 覆盖：4xx 不重试，其它最多 2 次", () => {
  const src = read(PROVIDER);

  assert.match(src, /onErrorRetry/, "必须覆盖 onErrorRetry，否则走 SWR 的无限退避默认值");
  assert.match(src, /status\s*>=\s*400\s*&&\s*status\s*<\s*500/, "必须识别 4xx 并且不再重试");
  assert.match(src, /MAX_RETRIES\s*=\s*2\b/, "非 4xx 错误的重试上限必须是 2 次");
  assert.match(src, /retryCount\s*\+\s*1/, "重试时必须递增 retryCount，否则上限永远达不到");
  assert.match(src, /revalidate\(/, "必须显式调用 revalidate 才会真的重试");
});

test("4xx 判定排在重试之前 —— 否则 429 仍会被重试", () => {
  const src = read(PROVIDER);
  const guard = src.indexOf("status >= 400 && status < 500");
  const retry = src.indexOf("revalidate({ retryCount");
  assert.ok(guard > -1 && retry > -1, "未找到 4xx 判定或重试调用");
  assert.ok(guard < retry, "4xx 判定必须写在 revalidate 之前，否则先重试再判断等于没拦");
});

test("根布局用 SwrProvider 包住全站内容", () => {
  const src = read(LAYOUT);
  assert.match(src, /import\s*\{\s*SwrProvider\s*\}\s*from\s*"@\/components\/system\/swr-provider"/, "layout 未引入 SwrProvider");
  assert.match(src, /<SwrProvider>/, "layout 未挂载 SwrProvider");
  assert.ok(
    src.indexOf("<SwrProvider>") < src.indexOf("<AuthProvider>"),
    "SwrProvider 必须在 AuthProvider 之外，否则登录态组件拿不到配置",
  );
});

test("lib/api.ts 必须把 HTTP 状态码挂到 err.status（重试策略完全依赖它）", () => {
  const src = read(API);
  assert.match(src, /err\.status\s*=\s*res\.status/, "api.ts 不再挂 err.status，4xx 不重试的判定会静默失效");
});
