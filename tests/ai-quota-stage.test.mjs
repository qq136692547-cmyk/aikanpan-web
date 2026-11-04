import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { quotaLabel, quotaStage, AI_PRO_DAILY_LIMIT } from "../src/lib/ai-quota.ts";

// 「额度条要按生命周期说话、额度耗尽后不给重试」的护栏。
//
// 背景（2026-11-05 对账，10-29 ~ 11-05 数据）：
//   常驻余量条上线后，真人曝光 167 次、点击 **0** 次。
//   其中 148 次（89%）label 落在 `r3/3:free` —— 访客一次都还没用过 AI，
//   看到的是「AI 剩余 3/3」。这个数字是在做「余量管理」，
//   而访客还没进入管理余量的心智，所以做成按钮也没人点；
//   更糟的是它指向 /upgrade/，一个还没用过 AI 的人直接落到价格页，是断层。
//   → 改成四态：idle 讲价值（不可点）、mid/low 报余量、out 给价格。
//
// 另一件事：11-03 有访客在额度用完后连点「AI 诊断」7 次、间隔 2–6 秒。
//   因为 ai-comment 头部的「重试」和 AiQuotaCard 里的「重试」在额度耗尽时都还能点，
//   每点一次白发一次请求、多记一条 ai_quota_hit，把漏斗分母也搅浑了。
//   → 额度耗尽时只留「去开通 Pro」一个出口。
//
// 这个文件守三件事：
//   1) 四态边界与文案（纯函数，直接跑）；
//   2) idle 态必须是不可点的 <span>，且不能指向 /upgrade/；
//   3) 额度耗尽时不得出现第二个「重试」入口。

const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const read = (rel) => readFileSync(join(SRC_ROOT, rel), "utf8");

const BAR = read("components/ai/ai-quota-bar.tsx");
const CARD = read("components/ai/ai-quota-card.tsx");
const COMMENT = read("components/ai/ai-comment.tsx");
const REVIEW = read("components/ai/ai-review.tsx");
const SCORE = read("components/ai/ai-score-panel.tsx");

test("四态边界：r3/3 是 idle，2 是 mid，1 是 low，0 是 out", () => {
  assert.equal(quotaStage(3, 3), "idle", "一次都没用过必须是 idle，不能当余量条");
  assert.equal(quotaStage(2, 3), "mid");
  assert.equal(quotaStage(1, 3), "low");
  assert.equal(quotaStage(0, 3), "out");
});

test("四态边界：数据缺失或 limit 非法时退化为 idle，不误报成耗尽", () => {
  assert.equal(quotaStage(undefined, 3), "idle", "拿不到余量时不能当成 0 去渲染「已用完」");
  assert.equal(quotaStage(3, undefined), "idle");
  assert.equal(quotaStage(0, 0), "idle", "limit=0 是脏数据，不该判成 exhausted");
  assert.equal(quotaStage(-5, 3), "out", "负数按已耗尽处理");
});

test("Pro 用户用满 500 次也是 idle，不是 low/out", () => {
  assert.equal(quotaStage(500, 500), "idle");
  assert.equal(quotaStage(499, 500), "mid");
  assert.equal(quotaStage(1, 500), "low");
});

test("文案分工：idle 讲价值、mid/low 报余量、out 讲价格", () => {
  assert.equal(quotaLabel("idle", 3, 3), "AI 诊断 · 每天 3 次免费");
  assert.equal(quotaLabel("mid", 2, 3), "AI 剩余 2/3");
  assert.equal(quotaLabel("low", 1, 3), "AI 剩余 1/3");
  assert.equal(quotaLabel("out", 0, 3), `开通 Pro · 每天 ${AI_PRO_DAILY_LIMIT} 次`);
  assert.equal(AI_PRO_DAILY_LIMIT, 500, "数值必须和后端 AI_DAILY_PRO_LIMIT 默认值一致");
});

test("idle 态渲染成不可点的 span，且不出现 /upgrade/ 链接", () => {
  const idleBlock = BAR.slice(BAR.indexOf('if (stage === "idle")'));
  assert.ok(idleBlock.length > 0, "必须存在 idle 分支");
  const untilReturn = idleBlock.slice(0, idleBlock.indexOf("return (") + 600);
  assert.match(untilReturn, /<span/, "idle 必须是 span —— 做成 Link 就是把人推去价格页");
  assert.doesNotMatch(untilReturn, /\/upgrade\//, "idle 分支不能出现 /upgrade/");
  // 用 href="/upgrade/" 而不是裸 /upgrade/：文件头注释里也提到过 upgrade，会误判
  assert.ok(
    BAR.indexOf('href="/upgrade/"') > BAR.indexOf('if (stage === "idle")'),
    "idle 分支必须排在 Link 之前并提前返回"
  );
});

test("埋点 label 带阶段段，能和旧的三段式数据区分开", () => {
  assert.match(BAR, /`\$\{source\}:\$\{stage\}:r\$\{remaining\}\/\$\{limit\}:\$\{plan\}`/, "ai_quota_view 的 label 必须含 stage");
  assert.match(BAR, /`\$\{source\}_quota_bar_\$\{stage\}`/, "upgrade_click 的 source 也要带阶段，否则分不清是哪一态被点的");
});

test("额度耗尽卡不再提供「重试」入口", () => {
  assert.doesNotMatch(CARD, /onRetry/, "AiQuotaCard 不得再暴露 onRetry —— 额度耗尽时重试必然还是 429");
  assert.doesNotMatch(CARD, />\s*重试\s*</, "卡片里不该有重试按钮");
  assert.match(CARD, /刷新页面即生效/, "要告诉用户买了之后怎么恢复，否则他只会反复点");
});

test("三个调用点都不再向额度卡传 onRetry", () => {
  for (const [name, src] of [["ai-comment", COMMENT], ["ai-review", REVIEW], ["ai-score-panel", SCORE]]) {
    assert.doesNotMatch(src, /<AiQuotaCard[^>]*onRetry/, `${name} 仍在传 onRetry`);
  }
});

test("额度耗尽时头部的「重试」按钮被 !quotaHit 收起", () => {
  for (const [name, src] of [["ai-comment", COMMENT], ["ai-review", REVIEW]]) {
    assert.match(src, /!quotaHit && \(\s*<button/, `${name} 的头部重试按钮必须被 !quotaHit 包裹`);
  }
});
