import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

// F6 + F8 合规提示回归测试。
//
// 钉的是「四要素不能少、告知不能悄悄消失」，不是文案快照：
//   - 以后调措辞不该假红；
//   - 但少一个要素、少一个市场分支、把首访告知条撤掉、把早报卡副标题加回来，必须立刻变红。
//
// 四要素口径（全量执行清单 F6）：无资质 / 幻觉 / 延迟 / 盈亏自负。
// 写法与仓库其它测试一致：源码结构断言 + readFileSync，零新依赖。

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), "utf8");
const exists = (p) => existsSync(fileURLToPath(new URL(`../${p}`, import.meta.url)));

/** 抹掉注释，避免「注释里写了关键词」骗过断言。保留长度会打乱偏移，这里只做布尔判断，不需要对齐。 */
const stripComments = (src) =>
  src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/^\s*\/\/[^\n]*$/gm, " ");

// ── F6：四要素必须齐全 ────────────────────────────────────────────────────────

test("个股页提示组件四要素齐全：无资质 / 幻觉 / 延迟 / 盈亏自负", () => {
  const src = stripComments(read("src/components/ui/market-disclaimer.tsx"));
  const must = {
    无资质: /证券投资咨询资格/,
    幻觉: /出错|错误/,
    延迟: /延迟/,
    盈亏自负: /盈亏自负/,
  };
  for (const [name, re] of Object.entries(must)) {
    assert.match(src, re, `个股页提示缺少「${name}」要素`);
  }
});

test("个股页三个市场分支（A股/港股/美股）都渲染 MarketDisclaimer", () => {
  const src = stripComments(read("src/app/stock/[code]/page.tsx"));
  assert.match(src, /import\s*\{[^}]*MarketDisclaimer[^}]*\}\s*from/, "个股页未导入 MarketDisclaimer");
  const n = (src.match(/<MarketDisclaimer\s*\/>/g) || []).length;
  assert.ok(
    n >= 3,
    `个股页有三个市场分支，每个 <main> 首屏都要有这条提示；实际只有 ${n} 处。` +
      `港股 / 美股 / A 股任意一支漏了，该市场用户就看不到风险告知。`
  );
});

test("AI 结果区提示补齐「延迟」与「盈亏自负」", () => {
  const src = stripComments(read("src/components/ui/ai-disclaimer.tsx"));
  assert.match(src, /不构成投资建议/, "AI 提示丢了「不构成投资建议」");
  assert.match(src, /错误|出错/, "AI 提示丢了幻觉告知");
  assert.match(src, /延迟/, "AI 提示缺少「所用行情可能延迟」——AI 结论基于的快照可能滞后于最新价");
  assert.match(src, /盈亏自负/, "AI 提示缺少「盈亏自负」");
});

test("付费页首屏四要素齐全（含无资质）", () => {
  const src = stripComments(read("src/app/upgrade/page.tsx"));
  assert.match(src, /证券投资咨询资格/, "付费页缺「不具备证券投资咨询资格」——四要素里的无资质项");
  assert.match(src, /延迟/, "付费页缺延迟告知");
  assert.match(src, /盈亏自负/, "付费页缺盈亏自负");
});

// ── F8：首访游客账号告知 ──────────────────────────────────────────────────────

test("首访告知条存在并在首页渲染", () => {
  assert.ok(exists("src/components/account/guest-notice-bar.tsx"), "guest-notice-bar.tsx 不存在");
  const page = stripComments(read("src/app/page.tsx"));
  assert.match(page, /import\s*\{[^}]*GuestNoticeBar[^}]*\}/, "首页未导入 GuestNoticeBar");
  assert.match(page, /<GuestNoticeBar\s*\/>/, "首页未渲染 GuestNoticeBar");
});

test("告知条只在客态显示，且告知了「账号已创建」与「数据存于服务器」", () => {
  const src = stripComments(read("src/components/account/guest-notice-bar.tsx"));
  assert.match(
    src,
    /user\?\.type\s*!==\s*"guest"/,
    "没有客态判断：已绑定邮箱/手机号的用户也会看到「游客账号已创建」"
  );
  assert.match(src, /游客账号已自动创建/, "丢失「账号已自动创建」这一核心告知");
  assert.match(src, /数据存于本站|同步/, "丢失「数据同步至服务器」这一核心告知");
  assert.match(src, /\/privacy\//, "缺少指向前隐私政策的说明链接");
});

test("告知条可关闭且记住关闭状态", () => {
  const src = stripComments(read("src/components/account/guest-notice-bar.tsx"));
  assert.match(src, /localStorage/, "关闭状态没有持久化，用户每次访问都会被再次打扰");
  assert.match(src, /aria-label="关闭/, "关闭按钮缺少可访问名");
  assert.match(src, /h-11\s+w-11/, "关闭按钮触控热区必须是 44×44（G7 标准），实际写法不是 h-11 w-11");
});

test("告知条必须单行：换行会把 375×667 首屏第一张行情卡顶下去", () => {
  const src = stripComments(read("src/components/account/guest-notice-bar.tsx"));
  assert.match(
    src,
    /truncate|whitespace-nowrap|text-ellipsis/,
    "正文没有 nowrap/truncate：一旦换行整条会从 28px 涨到 44px+，首屏内容被顶下去"
  );
});

test("早报卡副标题不许加回来（它是 F8 的「先减」预算）", () => {
  const src = stripComments(read("src/components/ai/premarket-briefing-card.tsx"));
  assert.doesNotMatch(
    src,
    /提炼今日\s*A\s*股关键线索/,
    "早报卡副标题已为 F8 让位删除：375×667 下它占 32px，正好抵掉告知条的 28px+margin。" +
      "加回来会让第一张行情卡底边从 787px 涨到 819px，违反「任何中间态都不能比现状差」。"
  );
});
