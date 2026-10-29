import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  canonicalCodeForBareNumber,
  INDEXABLE_STOCKS,
} from "../src/lib/stock-seo.ts";

// 爬虫与收录回归测试（2026-10-29 P0 + P1）。
//
// 背景（都是实测数据，不是推测）：
//
// P0 —— 14 天日志里爬虫共 24,846 次请求，其中 12,106 次（48.7%）打在 /api/ 上
//   （/api/v1/analytics/events 2838 次、/api/v1/auth/guest-login 1463 次…）。
//   现代爬虫渲染 JS 时会跟着执行页面 fetch，robots 不声明就一直烧爬虫预算。
//
// P1 —— `/stock/600519/`（6 位纯数字，最自然的写法）被判 indexable=false → noindex；
//   只有 `/stock/sh600519/` 可收录。两个 URL 都返 200 且各自 canonical 指向自己，
//   评价权重被分散，自然写法永远进不了索引。

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), "utf8");
const ROBOTS_TXT = read("public/robots.txt");
const ROBOTS_TS = read("src/app/robots.ts");
const PAGE = read("src/app/stock/[code]/page.tsx");

// ── P0：robots.txt ──────────────────────────────────────────────────────────

test("public/robots.txt 必须禁用 /api/ 与 /admin/", () => {
  assert.match(ROBOTS_TXT, /^Disallow: \/api\/$/m, "缺少 Disallow: /api/ —— 爬虫预算会继续被接口吃掉");
  assert.match(ROBOTS_TXT, /^Disallow: \/admin\/$/m, "缺少 Disallow: /admin/");
});

test("robots.txt 不得把整站禁掉（Allow: / 必须在）", () => {
  assert.match(ROBOTS_TXT, /^Allow: \/$/m, "Allow: / 不见了，会整站去索引");
  // 防呆：不允许出现裸 Disallow: /（那等于全站封禁）
  assert.doesNotMatch(ROBOTS_TXT, /^Disallow: \/$/m, "出现了 Disallow: / —— 整站会被封禁");
});

test("robots.txt 的 AI 爬虫清单保持完整（20 个）", () => {
  const uas = [...ROBOTS_TXT.matchAll(/^User-agent: (.+)$/gm)].map((m) => m[1].trim());
  // 除通配 * 外，AI 爬虫应一个不少
  const ai = uas.filter((u) => u !== "*");
  assert.equal(ai.length, 20, `AI 爬虫数量应为 20，实际 ${ai.length}：${ai.join(", ")}`);
  for (const must of ["GPTBot", "ClaudeBot", "PerplexityBot", "PetalBot", "Bytespider"]) {
    assert.ok(ai.includes(must), `AI 爬虫清单里丢了 ${must}`);
  }
});

test("robots.txt 仍声明 sitemap", () => {
  assert.match(ROBOTS_TXT, /^Sitemap: https:\/\/aikanpan\.top\/sitemap\.xml$/m);
});

test("app/robots.ts 与 public/robots.txt 保持一致（两份都要禁 /api/）", () => {
  // 线上实际生效的是 public/robots.txt（Next 里 public 静态文件优先于该路由），
  // 但两份必须同步，否则将来删掉 public 那份时行为会悄悄变。
  assert.match(ROBOTS_TS, /"\/api\/"/, "app/robots.ts 缺少 /api/ 的 disallow");
  assert.match(ROBOTS_TS, /"\/admin\/"/, "app/robots.ts 缺少 /admin/ 的 disallow");
  const tsUas = [...ROBOTS_TS.matchAll(/"(GPTBot|ClaudeBot|PerplexityBot|CCBot|PetalBot)"/g)].map((m) => m[1]);
  assert.ok(tsUas.length >= 5, "app/robots.ts 的 AI 爬虫清单疑似被删空");
});

// ── P1：6 位纯数字 → 规范 code ──────────────────────────────────────────────

test("6 位纯数字映射到白名单里的规范 code", () => {
  assert.equal(canonicalCodeForBareNumber("600519"), "sh600519", "贵州茅台");
  assert.equal(canonicalCodeForBareNumber("000001"), "sz000001", "平安银行");
  assert.equal(canonicalCodeForBareNumber("300750"), "sz300750", "宁德时代");
});

test("港股 / 美股 / 白名单外 / 已规范写法 一律不重定向", () => {
  // 港股：本身即 5 位规范形式
  assert.equal(canonicalCodeForBareNumber("00700"), null, "腾讯控股不该被重定向");
  assert.equal(canonicalCodeForBareNumber("00388"), null, "香港交易所不该被重定向");
  // 美股
  assert.equal(canonicalCodeForBareNumber("AAPL"), null);
  // 白名单外的 A 股（这类页面本来就不收录，重定向没有意义）
  assert.equal(canonicalCodeForBareNumber("999999"), null);
  assert.equal(canonicalCodeForBareNumber("600000"), null, "浦发银行不在白名单里");
  // 已带前缀的规范写法
  assert.equal(canonicalCodeForBareNumber("sh600519"), null);
  // 空值 / 畸形
  assert.equal(canonicalCodeForBareNumber(""), null);
  assert.equal(canonicalCodeForBareNumber("60051"), null);
  assert.equal(canonicalCodeForBareNumber("6005190"), null);
});

test("★ 重定向不得自指（否则页面会无限循环）", () => {
  // 这是本功能最容易出的致命 bug：若把港股（00388）也收进映射，
  // `/stock/00388/` 会 308 到自己，浏览器报 ERR_TOO_MANY_REDIRECTS。
  let mapped = 0;
  for (const s of INDEXABLE_STOCKS) {
    const bare = s.code.slice(2);
    const r = canonicalCodeForBareNumber(bare);
    if (r !== null) {
      mapped++;
      // 返回值本身必须是「已规范」形式：再传进去不应再触发重定向
      assert.equal(
        canonicalCodeForBareNumber(r), null,
        `${s.code} 的映射结果 ${r} 再传入仍会触发重定向 → 存在循环风险`,
      );
      // 且映射结果必须真的在白名单里
      assert.ok(
        INDEXABLE_STOCKS.some((x) => x.code === r),
        `映射结果 ${r} 不在白名单里`,
      );
    }
  }
  assert.ok(mapped > 0, "白名单里应当有 A 股条目被映射");
  // 港股那几条必须一个都没进映射表
  for (const hk of ["00700", "00388", "09988", "03690"]) {
    assert.equal(canonicalCodeForBareNumber(hk), null, `港股 ${hk} 不应在映射表里`);
  }
});

test("page.tsx 用 308（permanentRedirect）而非 307", () => {
  assert.match(PAGE, /import \{[^}]*permanentRedirect[^}]*\} from "next\/navigation"/, "未导入 permanentRedirect");
  assert.match(PAGE, /canonicalCodeForBareNumber\(rawCode\)/, "未使用 canonicalCodeForBareNumber 判定");
  assert.match(PAGE, /permanentRedirect\(`\/stock\/\$\{canonicalBare\}\/`\)/, "重定向目标格式不对");
  // 307 是临时的，不会传递索引权重；必须用 308
  assert.doesNotMatch(PAGE, /\bredirect\(/ , "存在 redirect() 调用（307 临时重定向），会丢失索引权重");
});
