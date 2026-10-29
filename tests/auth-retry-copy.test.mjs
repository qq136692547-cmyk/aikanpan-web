import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// 访客身份失败提示的文案与出路守卫。
//
// 背景：AuthProvider 在没有本地用户时会自动做游客登录（src/lib/auth.tsx），
// 所以游客**本身是已登录状态**（user.type === "guest"，isAuthenticated 为真），
// 游客照样能调 /ai/daily-review。真正会失败的只有「新建访客身份」这一步请求。
//
// 旧文案写的是「账户初始化失败」，问题有两层：
//   1. 失败的不是用户的账户，是后台自动建的匿名访客身份 —— 游客看到「账户失败」
//      会以为自己注册的账号出问题，甚至以为「必须注册才能用」，恰好是反的；
//   2. 出路只有「刷新页面」（整页 reload），会丢掉页面上已填的内容。
//
// 断言写成方向性的，不写死「恰好 3 处引用」这类现状快照：
//   - 以后新增使用方不该假红；
//   - 以后有人把「账户」写回去、漏传 onRetry、或退回整页刷新，必须立刻变红。

const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const NOTICE = join(SRC_ROOT, "components/system/auth-retry-notice.tsx");
const AI_REVIEW = join(SRC_ROOT, "components/ai/ai-review.tsx");

/** 把注释抹成空格（保留换行，偏移量与行号不变），避免注释里的示例文案被判成真实文案 */
function blankComments(src) {
  let out = src.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, " "));
  out = out
    .split("\n")
    .map((line) => (line.trimStart().startsWith("//") ? " ".repeat(line.length) : line))
    .join("\n");
  return out;
}

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

const tsxFiles = [...walk(SRC_ROOT)].filter((p) => p.endsWith(".tsx") || p.endsWith(".jsx"));
const rel = (p) => p.replace(SRC_ROOT.replace(/\\/g, "/"), "").replace(/\\/g, "/");

// ── B-1 文案不得把「访客身份」说成「账户」 ────────────────────────────────────

test("统一提示组件的文案里不出现「账户」二字", () => {
  // 「账户」会让人理解为用户自己注册的账号。失败的只是匿名访客身份。
  const src = blankComments(readFileSync(NOTICE, "utf8"));
  const hits = src
    .split("\n")
    .map((line, i) => ({ line: line.trim(), no: i + 1 }))
    .filter((l) => l.line.includes("账户"));
  const detail = hits.map((h) => `auth-retry-notice.tsx:${h.no} ${h.line}`).join("\n");
  assert.equal(hits.length, 0, `提示文案不得声称「账户」出问题：\n${detail}`);
});

test("统一提示组件必须显式说明失败的只是访客身份", () => {
  const src = blankComments(readFileSync(NOTICE, "utf8"));
  assert.match(src, /访客身份/, "标题必须点明失败对象是访客身份，否则用户不知道发生了什么");
});

// ── B-2 必须有出路，且出路不是整页刷新 ────────────────────────────────────────

test("统一提示组件渲染可见的「重试」按钮并接到 onRetry", () => {
  // 只提示不给按钮 = 死路；按钮没接 onClick = 点了没反应。两者都算回归。
  const src = blankComments(readFileSync(NOTICE, "utf8"));
  assert.match(src, /onClick=\{onRetry\}/, "重试按钮必须接 onClick={onRetry}");
  assert.match(src, />\s*重试\s*</, "重试按钮必须有可见文字「重试」（无障碍名 2.5.3）");
});

test("统一提示组件不提供整页刷新这种出路", () => {
  const src = blankComments(readFileSync(NOTICE, "utf8"));
  assert.doesNotMatch(src, /location\.reload/, "整页刷新会丢掉页面上已填的内容，只能原地重试");
});

// ── B-3 使用方：必须复用统一组件，且必须传 onRetry ────────────────────────────

test("凡使用 AuthRetryNotice 的地方都必须传 onRetry", () => {
  // 漏传 onRetry 时 TypeScript 会报错，但这里从源码层面再钉一道：
  // 防止有人给 onRetry 加可选默认值后，静默变成「点了没反应」。
  const bad = [];
  for (const path of tsxFiles) {
    if (path === NOTICE) continue;
    const src = readFileSync(path, "utf8");
    let idx = 0;
    while ((idx = src.indexOf("<AuthRetryNotice", idx)) !== -1) {
      const end = src.indexOf("/>", idx);
      const tag = end === -1 ? src.slice(idx, idx + 400) : src.slice(idx, end);
      if (!/onRetry\s*=/.test(tag)) {
        const line = src.slice(0, idx).split("\n").length;
        bad.push(`${rel(path)}:${line} <AuthRetryNotice> 未传 onRetry`);
      }
      idx += 1;
    }
  }
  assert.equal(bad.length, 0, bad.join("\n"));
});

test("AI 复盘复用统一的访客身份重试组件，不自己另写一套", () => {
  const src = readFileSync(AI_REVIEW, "utf8");
  assert.match(src, /from "@\/components\/system\/auth-retry-notice"/, "ai-review.tsx 必须复用 AuthRetryNotice");
  assert.match(src, /<AuthRetryNotice\s+onRetry=\{retryAuth\}/, "必须把 useAuth 的 retry 作为重试动作");
});

test("AI 复盘的身份失败分支不得整页刷新", () => {
  const src = blankComments(readFileSync(AI_REVIEW, "utf8"));
  assert.doesNotMatch(src, /location\.reload/, "整页刷新会丢掉复盘页已选日期等现场，只能原地重试");
});

// ── B-4 防止把「需要注册」的错误认知写回来 ────────────────────────────────────

test("AI 复盘要说明访客无需注册即可使用（实测游客 token 调 /ai/daily-review 返回 200）", () => {
  // 这句是刻意保留的：不写清「无需注册」，用户会把身份失败误读成「要注册才能看」。
  const src = readFileSync(AI_REVIEW, "utf8");
  assert.match(src, /无需注册/, "身份失败提示旁必须写明 AI 复盘使用匿名访客身份、无需注册");
});
