import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// 「游客能不能直接买」的护栏。
//
// 背景（2026-10-29 对账得出的结论）：
//   plan-cta.tsx 里曾有 `if (!isRealUser) { setError(BIND_REQUIRED); return; }`，
//   连下单接口都不调，直接弹「请先绑定邮箱或手机号」。后端 alipay_routes.py
//   对应还有一道 `if user_id.startswith('guest_'): raise 403 real_user_required`。
//
//   后果：全站 8,417 个游客、仅 92 个绑定过手机号 → 99% 的购买意愿被挡在门外。
//   订单文件最后一笔停在 2026-10-08（正是加这条门槛的当天），此后 21 天 0 单，
//   而 10-13 / 10-28 各有真人点了「开通 90 天」（upgrade_click, owner=false）。
//
//   而这条路本来就是通的：历史 21 笔订单里 15 笔 user_id 就是 guest_ 前缀；
//   后端发货函数全文不含 guest 判断；server.py `_merge_user_data` 注释原文
//   「合并 membership 会员权益（游客付款后登录手机号继承 Pro）」；
//   付款成功页会当场发恢复码，且恢复接口只校验登录、不区分游客身份。
//
// 这个文件守的是「别再把它堵回去」。断言写成方向性的，不写死行号或次数。
//
// ⚠️ 后端在服务器 /opt/dsa-mp（不进本仓库），无法在此断言。
//    改后端时请同步检查：alipay_routes.py 的 create-order 不得再出现
//    real_user_required / 403，应改为 count_unpaid_orders 限流（阈值 5/10）。

const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const CTA = join(SRC_ROOT, "app/upgrade/plan-cta.tsx");
const PAGE = join(SRC_ROOT, "app/upgrade/page.tsx");
const RECOVER = join(SRC_ROOT, "app/upgrade/recover-panel.tsx");

/** 把注释抹成空格（保留换行，偏移量与行号不变），避免注释里的历史代码被判成现状 */
function blankComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  out = out
    .split("\n")
    .map((line) => (line.trimStart().startsWith("//") ? " ".repeat(line.length) : line))
    .join("\n");
  return out;
}

// ── G-1 下单按钮不得按身份提前拦截 ────────────────────────────────────────────

test("handlePay 必须在做任何身份判断之前就调用下单接口", () => {
  const src = blankComments(readFileSync(CTA, "utf8"));
  const start = src.indexOf("const handlePay");
  assert.ok(start !== -1, "plan-cta.tsx 里找不到 handlePay");

  const callIdx = src.indexOf("createAlipayOrder", start);
  assert.ok(callIdx !== -1, "handlePay 必须调用 api.createAlipayOrder，否则按钮点了没反应");

  const head = src.slice(start, callIdx);
  if (/isRealUser|isAuthenticated|user\?\.type|user\.type/.test(head)) {
    assert.fail(
      "调用下单接口之前不得按身份（游客/已绑定）做判断，否则又会把游客挡在门外。\n" +
        "身份说明请放在页面说明卡里（page.tsx），不要做下单门槛。"
    );
  }
  if (/\breturn\b/.test(head)) {
    assert.fail(
      "调用下单接口之前不得提前 return。旧实现是 `if (!isRealUser) { setError(...); return; }`，\n" +
        "点击被记录成 upgrade_click 却没有订单，正是 10 月零成交的直接原因。"
    );
  }
});

test("下单按钮不再引用「需先绑定」这类拦截文案", () => {
  const src = blankComments(readFileSync(CTA, "utf8"));
  for (const bad of ["BIND_REQUIRED", "下单前需先绑定", "请先在用户中心完成绑定"]) {
    assert.ok(!src.includes(bad), `plan-cta.tsx 不应再出现「${bad}」——那是已废弃的硬门槛`);
  }
});

test("下单按钮仍然带 loading 态，防止重复点击", () => {
  // 门槛放开后，重复点击会真的建单（订单号已加随机后缀，不再互相覆盖），
  // 所以 paying 这个禁用态比之前更重要。
  const src = blankComments(readFileSync(CTA, "utf8"));
  assert.match(src, /disabled=\{paying\}/, "按钮必须有 disabled={paying}");
  assert.match(src, /<Loader2[^>]*animate-spin/, "提交中必须有可见的 loading 指示");
});

// ── G-2 页面说明必须和新规则一致 ──────────────────────────────────────────────

test("升级页说明卡不得再要求「购买前先绑定」", () => {
  const src = blankComments(readFileSync(PAGE, "utf8"));
  assert.ok(
    !src.includes("购买前请先绑定"),
    "page.tsx 里「购买前请先绑定邮箱或手机号」与放开后的规则矛盾，会把用户赶走"
  );
});

test("升级页必须明确写出「无需提前绑定即可购买」", () => {
  const src = validText(readFileSync(PAGE, "utf8"));
  assert.match(
    src,
    /无需(提前)?绑定/,
    "必须写明可以直接购买，否则用户仍会以为要先绑定才能付款"
  );
});

test("升级页必须说明未绑定时的兜底是恢复码", () => {
  const src = validText(readFileSync(PAGE, "utf8"));
  assert.match(src, /恢复码/, "必须告知未绑定用户靠恢复码兜底，这是付款后唯一的自助找回凭据");
});

/** 只去掉 /* *\/ 块注释，保留 JSX 里的中文文案 */
function validText(src) {
  return src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
}

// ── G-3 找回链路不得对游客关门 ────────────────────────────────────────────────
// 游客能买但找不回 = 付了钱可能丢权益，比不能买更糟。

test("恢复码找回的处理函数不得引用身份判断", () => {
  const src = blankComments(readFileSync(RECOVER, "utf8"));
  const hStart = src.indexOf("const handleRecover");
  const hEnd = src.indexOf("const handleActivate");
  assert.ok(hStart !== -1 && hEnd > hStart, "recover-panel.tsx 结构变化，请更新本测试的切片范围");

  const body = src.slice(hStart, hEnd);
  assert.ok(
    !/isRealUser|user\?\.type/.test(body),
    "恢复码找回不能按身份拦截：游客付款后清缓存，恢复码是他唯一能自助找回的方式"
  );
  assert.match(body, /recoverMembership/, "handleRecover 必须真的调用找回接口");
});

test("恢复码提交按钮不得出现 disabled={...isRealUser}", () => {
  const src = blankComments(readFileSync(RECOVER, "utf8"));
  // 定位恢复码表单：从「立即找回会员」往前找最近的 disabled=
  const label = src.indexOf("立即找回会员");
  assert.ok(label !== -1, "找不到恢复码提交按钮");
  const back = src.lastIndexOf("disabled={", label);
  assert.ok(back !== -1, "恢复码按钮没有 disabled 判定");
  const expr = src.slice(back, src.indexOf("}", back) + 1);
  assert.ok(
    !/isRealUser/.test(expr),
    `恢复码按钮不得因未绑定而禁用，当前判定：${expr}`
  );
});
