import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// 「订单号=/= 找回凭据」与「客服话术统一」的护栏。
//
// 背景：
//   2026-10-26 契约变更后，会员自助找回只认恢复码（AKP-XXXX-XXXX），
//   裸订单号一律拒绝（订单号曾作找回凭据，会经前端错误上报与浏览器历史泄露）。
//   但 about/page.tsx 的 FAQ（可见文案 + JSON-LD 结构化数据）长期没跟上，
//   仍在承诺「用支付宝商户订单号在升级页自助找回」——用户照做必然失败，
//   于是把锅甩给售后。这类「页面自相矛盾」用 tsc 抓不到，只能靠护栏。
//
//   2026-10-29 又放开「购买前必须先绑定」，about 的收费问答与
//   terms「付费与激活」还写着「须绑定邮箱或手机号」，同样属于自相矛盾。
//
// 断言写成方向性的（不锁行号、不锁字数），改文案不会误伤。

const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const ABOUT = join(SRC_ROOT, "app/about/page.tsx");
const TERMS = join(SRC_ROOT, "app/terms/page.tsx");
const UPGRADE = join(SRC_ROOT, "app/upgrade/page.tsx");
const RECOVER = join(SRC_ROOT, "app/upgrade/recover-panel.tsx");
const FOOTER = join(SRC_ROOT, "components/layout/footer.tsx");

const read = (p) => readFileSync(p, "utf8");

/** 承诺「用订单号自助找回」的写法：订单号与「自助找回」出现在同一句（句号/分号内），
 *  但不含「订单号本身不能自助找回」这类否定陈述（那是正确文案）。 */
const ORDER_SELF_SERVICE =
  /订单号(?![^。；]{0,8}(不能|不可|无法))[^。；]{0,20}自助(找回|恢复)|(?<!(不能|不可|无法))自助(找回|恢复)[^。；]{0,20}(提供|输|用|凭)[^。；]{0,6}订单号/;

test("about 的 FAQ（可见文案与 JSON-LD）不得承诺用订单号自助找回", () => {
  const src = read(ABOUT);
  const hits = src.split("\n").filter((l) => ORDER_SELF_SERVICE.test(l));
  assert.deepEqual(
    hits.map((l) => l.trim().slice(0, 60)),
    [],
    "about/page.tsx 仍在承诺「用订单号自助找回」。\n" +
      "自助找回只认付款成功页显示的恢复码；订单号只能走人工核实（微信/邮箱）。\n" +
      "注意第 207 行是 FAQPage 结构化数据，改漏了会被搜索引擎抓走。"
  );
});

test("about 的 FAQ 必须写明订单号不能自助找回", () => {
  const src = read(ABOUT);
  assert.match(
    src,
    /订单号(本身)?不能自助找回/,
    "必须明说「订单号不能自助找回」，否则用户会以为订单号可以当凭据"
  );
  // 可见文案与 JSON-LD 两处都要有，只改一处等于没改
  const count = (src.match(/订单号(本身)?不能自助找回/g) || []).length;
  assert.ok(count >= 2, `可见 FAQ 与 JSON-LD 都要写（当前 ${count} 处）`);
});

test("客服渠道必须带上「备注：爱看盘」，且四处一致", () => {
  const files = { "upgrade/page.tsx": UPGRADE, "recover-panel.tsx": RECOVER, "footer.tsx": FOOTER, "terms/page.tsx": TERMS };
  const missing = Object.entries(files)
    .filter(([, p]) => !/备注[：:]\s*爱看盘/.test(read(p)))
    .map(([name]) => name);
  assert.deepEqual(missing, [], `这些文件的客服渠道缺「加好友请备注：爱看盘」：${missing.join("、")}`);
});

test("不得再要求「购买前须绑定邮箱或手机号」（门槛已于 2026-10-29 放开）", () => {
  const patterns = [/购买前(需|须)绑定/, /购买和激活前[^。]{0,10}(须|需)绑定/];
  for (const [name, path] of [
    ["about/page.tsx", ABOUT],
    ["terms/page.tsx", TERMS],
    ["upgrade/page.tsx", UPGRADE],
  ]) {
    const src = read(path);
    for (const p of patterns) {
      assert.doesNotMatch(
        src,
        p,
        `${name} 仍写着「先绑定才能买」，与 plan-cta.tsx 已删除的门槛矛盾`
      );
    }
  }
});

test("恢复码仍是唯一被承诺的自助找回凭据", () => {
  const src = read(RECOVER);
  assert.match(src, /恢复码/, "recover-panel.tsx 必须仍以恢复码为找回凭据");
  assert.match(
    src,
    /只显示一次/,
    "必须提醒恢复码只显示一次，否则用户不会当场保存"
  );
});
