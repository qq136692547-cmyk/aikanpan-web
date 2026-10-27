import test from "node:test";
import assert from "node:assert/strict";
import { existsSync, readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

// G7 无障碍回归测试。
//
// 钉的是「不变量」，不是「现状」：
//   - 以后新增页面 / 浮层 / 表单控件，不该假红；
//   - 以后有人删掉 id / tabIndex / aria-modal / 可访问名，必须立刻变红。
// 所以断言全部写成方向性的（「凡 … 必须 …」+「至少存在 N 处」），
// 不写死「恰好 49 个控件」「恰好 2 个 dialog」「恰好 15 处 main」这类现状快照。
//
// 写法与仓库现有 tests/auto-refresh.test.mjs、tests/error-boundary.test.mjs 一致：
// 结构断言 + readFileSync，零新依赖（不装 jsdom）。

const SRC_ROOT = fileURLToPath(new URL("../src/", import.meta.url));
const LAYOUT = fileURLToPath(new URL("../src/app/layout.tsx", import.meta.url));
const GLOBAL_ERROR = fileURLToPath(new URL("../src/app/global-error.tsx", import.meta.url));
const LOADING = fileURLToPath(new URL("../src/app/loading.tsx", import.meta.url));

// ── 源码扫描工具 ──────────────────────────────────────────────────────────────

function* walk(dir) {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) yield* walk(p);
    else yield p;
  }
}

/**
 * 把注释内容抹成空格（保留换行），这样所有偏移量与行号都和原文件对齐，
 * 扫描时又不会把注释里出现的 <main> 之类当成真标签。
 */
function blankComments(src) {
  const out = src.split("");
  const block = /\/\*[\s\S]*?\*\//g;
  let m;
  while ((m = block.exec(src))) {
    for (let i = m.index; i < m.index + m[0].length; i++) {
      if (out[i] !== "\n") out[i] = " ";
    }
  }
  let offset = 0;
  for (const line of src.split("\n")) {
    const trimmed = line.trimStart();
    if (trimmed.startsWith("//")) {
      const start = offset + (line.length - trimmed.length);
      for (let i = start; i < offset + line.length; i++) {
        if (out[i] !== "\n") out[i] = " ";
      }
    }
    offset += line.length + 1;
  }
  return out.join("");
}

/**
 * 从标签名之后开始，找到配对的 '>'。
 *
 * 不能用 <input[^>]*>：onChange={(e) => ...} 里的 '=>' 会提前截断，
 * 写在 onChange 之后的 aria-label 会被整段漏掉（实测会把 49 个控件算成 34 个）。
 * 所以必须按花括号深度 + 引号状态扫。
 */
function scanTag(src, start) {
  let i = start;
  let depth = 0;
  let quote = null;
  while (i < src.length) {
    const ch = src[i];
    if (quote) {
      if (ch === "\\") { i += 2; continue; }
      if (ch === quote) quote = null;
    } else if (ch === '"' || ch === "'" || ch === "`") {
      quote = ch;
    } else if (ch === "{") {
      depth++;
    } else if (ch === "}") {
      depth--;
    } else if (ch === ">" && depth === 0) {
      return { raw: src.slice(start, i), end: i };
    }
    i++;
  }
  return { raw: src.slice(start), end: src.length };
}

/**
 * 取一段 JSX 的「可见文本」：去掉 JSX 表达式与所有标签后剩下的文字。
 *
 * 用途：判断「被 <label> 包裹」到底算不算一个可访问名来源。
 * 按 accname 规范，只有 label 真的贡献了文字，它才是名字来源；
 * 仓库里 4 个 <label> 都是「开关」写法（只包住 checkbox + 装饰 span，没有文字），
 * 名字全部来自 aria-label —— 把「被 label 包裹」一律当成名字来源会误报。
 */
function visibleText(src) {
  // 1) 去掉 JSX 表达式 {...}（连带把 onChange={(e) => ...} 里的 => 一起去掉）
  let stripped = "";
  let depth = 0;
  for (const ch of src) {
    if (ch === "{") { depth++; continue; }
    if (ch === "}") { if (depth > 0) depth--; continue; }
    if (depth === 0) stripped += ch;
  }
  // 2) 去掉所有标签
  let text = "";
  let i = 0;
  while (i < stripped.length) {
    const lt = stripped.indexOf("<", i);
    if (lt < 0) { text += stripped.slice(i); break; }
    text += stripped.slice(i, lt);
    const next = stripped[lt + 1];
    if (!next || !/[A-Za-z/]/.test(next)) { text += stripped[lt]; i = lt + 1; continue; }
    const { end } = scanTag(stripped, lt + 1);
    i = end + 1;
  }
  return text.replace(/\s+/g, " ").trim();
}

/** 依次吐出文件里所有标签：{ name, raw, start, end } */
function* iterTags(src) {
  let i = 0;
  while (i < src.length) {
    const lt = src.indexOf("<", i);
    if (lt < 0) break;
    const next = src[lt + 1];
    if (!next || !/[A-Za-z]/.test(next)) { i = lt + 1; continue; }
    const { raw, end } = scanTag(src, lt + 1);
    const name = /^[A-Za-z][A-Za-z0-9._-]*/.exec(src.slice(lt + 1));
    yield { name: name ? name[0] : next, raw, start: lt, end };
    i = end + 1;
  }
}

const ATTR_RE = /([A-Za-z_][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)'|\{([^}]*)\})/g;

/** 取标签上的属性；属性值统一去掉外层引号/花括号 */
function attrsOf(raw) {
  const out = {};
  let m;
  ATTR_RE.lastIndex = 0;
  while ((m = ATTR_RE.exec(raw))) {
    out[m[1]] = (m[2] ?? m[3] ?? m[4] ?? "").trim().replace(/^["']|["']$/g, "").replace(/^\{|\}$/, "");
  }
  return out;
}

const lineOf = (src, pos) => src.slice(0, pos).split("\n").length;
const isHiddenInput = (name, attrs) => name === "input" && (attrs.type || "").toLowerCase() === "hidden";

// ── 一次性扫描全站 src，收集事实 ─────────────────────────────────────────────

const files = [...walk(SRC_ROOT)].filter((p) => p.endsWith(".tsx") || p.endsWith(".jsx"));

/** @type {{file:string,line:number,tag:string,attrs:Record<string,string>,raw:string,sources:string[]}[]} */
const controls = [];
/** @type {{file:string,line:number,ok:boolean}[]} */
const mains = [];
/** @type {{file:string,line:number,attrs:Record<string,string>,raw:string}[]} */
const dialogs = [];
/** @type {{file:string,line:number,raw:string}[]} */
const skipLinks = [];
/** 每个文件里出现过的 id，用来校验 aria-labelledby 的指向 */
const idsByFile = new Map();

for (const path of files) {
  const rawSrc = readFileSync(path, "utf8");
  const src = blankComments(rawSrc);
  const tags = [...iterTags(src)];

  const ids = new Set();
  for (const t of tags) {
    const a = attrsOf(t.raw);
    if (a.id) ids.add(a.id);
  }
  idsByFile.set(path, ids);

  // 该文件里所有 <label htmlFor="..."> 的目标 id
  const labelFor = new Set();
  for (const t of tags) {
    if (t.name !== "label") continue;
    const a = attrsOf(t.raw);
    if (a.htmlFor) labelFor.add(a.htmlFor);
  }

  // 所有 <label> 的内容区间与它贡献的可见文本（label 不能嵌套，取第一个 </label> 即其结束）
  const labelTags = [];
  for (const t of tags) {
    if (t.name !== "label" || /\/\s*$/.test(t.raw)) continue;
    const contentStart = t.end + 1;
    const closeIdx = src.indexOf("</label>", contentStart);
    const contentEnd = closeIdx < 0 ? src.length : closeIdx;
    labelTags.push({
      contentStart,
      contentEnd,
      text: visibleText(src.slice(contentStart, contentEnd)),
    });
  }

  for (const t of tags) {
    const a = attrsOf(t.raw);

    if (t.name === "main") {
      mains.push({
        file: path,
        line: lineOf(rawSrc, t.start),
        ok: a.id === "main-content" && /tabIndex\s*=\s*\{\s*-1\s*\}/.test(t.raw),
      });
      continue;
    }

    if (a.role === "dialog") {
      dialogs.push({ file: path, line: lineOf(rawSrc, t.start), attrs: a, raw: t.raw });
    }

    if (t.name === "a" && a.href === "#main-content") {
      skipLinks.push({ file: path, line: lineOf(rawSrc, t.start), raw: t.raw });
    }

    if (t.name !== "input" && t.name !== "select" && t.name !== "textarea") continue;
    if (isHiddenInput(t.name, a)) continue;

    const sources = [];
    if (a["aria-label"] !== undefined) sources.push("aria-label");
    if (a["aria-labelledby"] !== undefined) sources.push("aria-labelledby");
    if (a.id && labelFor.has(a.id)) sources.push("label[htmlFor]");
    // 被 <label> 包裹：只有当那个 label 真的贡献了文字时，它才算一个名字来源
    const enclosing = labelTags.find((l) => t.start >= l.contentStart && t.start < l.contentEnd);
    if (enclosing && enclosing.text.length > 0) sources.push("label(包裹)");

    controls.push({
      file: path,
      line: lineOf(rawSrc, t.start),
      tag: t.name,
      attrs: a,
      raw: t.raw,
      sources,
    });
  }
}

const rel = (p) => p.replace(SRC_ROOT.replace(/\\/g, "/"), "").replace(/\\/g, "/");
const layoutSrc = readFileSync(LAYOUT, "utf8");
const globalErrorSrc = readFileSync(GLOBAL_ERROR, "utf8");

// ── A-1 表单控件的可访问名 ────────────────────────────────────────────────────

test("表单控件扫描器本身没坏：至少扫到 1 个控件", () => {
  // 扫描器失效会让下面所有断言空转（永远绿），所以先钉住「扫到了东西」这条。
  assert.ok(controls.length >= 1, `一个控件都没扫到，扫描器坏了（扫了 ${files.length} 个文件）`);
});

test("每个表单控件有且仅有一个可访问名来源", () => {
  // 四种来源互斥：aria-label / aria-labelledby / <label htmlFor> / 被 <label> 包裹。
  // 同时给两个，屏幕阅读器会取错（aria-labelledby 覆盖 aria-label）。
  // 注意：「全站 aria-label 字符串唯一」从来不是无障碍要求，多个元素同名很正常，
  // 这里只要求「同一个控件上」不要给两个来源。
  const bad = controls.filter((c) => c.sources.length !== 1);
  const detail = bad
    .map((c) => `${rel(c.file)}:${c.line} <${c.tag}> 来源=[${c.sources.join(",") || "无"}]`)
    .join("\n");
  assert.equal(bad.length, 0, `这些控件的可访问名来源不是恰好 1 个：\n${detail}`);
});

test("aria-label 不是空串或退化字符串", () => {
  const bad = controls.filter((c) => {
    const v = c.attrs["aria-label"];
    return v !== undefined && v.trim().length < 2;
  });
  const detail = bad.map((c) => `${rel(c.file)}:${c.line} aria-label="${c.attrs["aria-label"]}"`).join("\n");
  assert.equal(bad.length, 0, `aria-label 不得为空或只有 1 个字符：\n${detail}`);
});

test("aria-labelledby 指向的 id 在同一个文件里真实存在", () => {
  const bad = [];
  for (const c of controls) {
    const target = c.attrs["aria-labelledby"];
    if (target === undefined) continue;
    const ids = idsByFile.get(c.file);
    if (!ids.has(target)) {
      bad.push(`${rel(c.file)}:${c.line} aria-labelledby="${target}" 指向的 id 不存在`);
    }
  }
  assert.equal(bad.length, 0, bad.join("\n"));
});

// ── A-2 skip-link ─────────────────────────────────────────────────────────────

test("根 layout 与 global-error 都有 skip-link", () => {
  // global-error 会替换整个 html/body，吃不到 layout 里的 skip-link，
  // 所以它必须自带一份，否则根级出错时键盘用户没有逃生通道。
  assert.match(layoutSrc, /href="#main-content"/, "src/app/layout.tsx 缺少 skip-link");
  assert.match(globalErrorSrc, /href="#main-content"/, "src/app/global-error.tsx 缺少 skip-link");
});

test("layout 的 skip-link 用 Tailwind 工具类（这一页有样式表）", () => {
  assert.match(layoutSrc, /\bsr-only\b/, "layout 的 skip-link 必须先被 sr-only 藏起来");
  assert.match(layoutSrc, /focus:not-sr-only/, "layout 的 skip-link 聚焦后必须显现");
});

test("global-error 的 skip-link 用内联 style，且整个文件不出现 className", () => {
  // 产物 .next/server/app/_global-error.html 的 <head> 里没有任何 stylesheet 链接，
  // 那一页不加载样式表 → className 在那里完全无效，
  // 链接会永久可见，而 body 是 display:flex，它会变成 flex item 与错误卡片并排。
  assert.doesNotMatch(
    globalErrorSrc,
    /\bclassName\s*=/,
    "global-error 不加载样式表，用 className 等于没生效"
  );
  assert.match(globalErrorSrc, /onFocus\s*=/, "global-error 的 skip-link 必须有聚焦切换");
  assert.match(globalErrorSrc, /onBlur\s*=/, "global-error 的 skip-link 必须有失焦复位");
  assert.match(
    globalErrorSrc,
    /style=\{[^}]*\?[^}]*:/,
    "global-error 的 skip-link 必须按聚焦与否切两套 style"
  );
});

test("global-error 的 skip-link 聚焦后仍可被程序化聚焦（不能用 display:none / visibility:hidden）", () => {
  // 用 display:none / visibility:hidden 藏起来的元素无法被 focus() 定位，
  // skip-link 就永远点不到 —— 这正是这一步最容易做错的地方。
  assert.doesNotMatch(globalErrorSrc, /display:\s*["']none["']/, "不能用 display:none 藏 skip-link");
  assert.doesNotMatch(globalErrorSrc, /visibility:\s*["']hidden["']/, "不能用 visibility:hidden 藏 skip-link");
  assert.match(globalErrorSrc, /position:\s*["']absolute["']/, "隐藏态的 skip-link 必须是 absolute（脱离正常流）");
});

test("全站至少存在 2 处 skip-link", () => {
  // 不写死「恰好 2 处」：以后再加页面自带 skip-link 不该假红。
  assert.ok(
    skipLinks.length >= 2,
    `skip-link 至少要有 2 处（layout + global-error），实际 ${skipLinks.length} 处`
  );
});

// ── A-3 <main> 的跳转目标 ─────────────────────────────────────────────────────

test("凡 <main> 必须同时有 id=\"main-content\" 与 tabIndex={-1}", () => {
  // tabIndex={-1} 是 skip-link 真正生效的关键：
  // 没有它，浏览器按回车只会「滚动」到目标，不会把焦点移过去，
  // 键盘用户和屏幕阅读器用户仍然停在链接上 —— 特性等于没有。
  const bad = mains.filter((m) => !m.ok);
  const detail = bad.map((m) => `${rel(m.file)}:${m.line} 缺 id="main-content" 或 tabIndex={-1}`).join("\n");
  assert.equal(bad.length, 0, `这些 <main> 缺少跳转目标所需的 id / tabIndex：\n${detail}`);
});

test("至少存在 1 处 <main>", () => {
  assert.ok(mains.length >= 1, "全站一个 <main> 都没有，skip-link 无处可跳");
});

// ── A-4 dialog 语义 ───────────────────────────────────────────────────────────

test("凡 role=\"dialog\" 必须同时有 aria-modal=\"true\" 和可访问名", () => {
  // aria-modal 让读屏把背景当惰性；可访问名（aria-label / aria-labelledby）
  // 让读屏念得出这是哪个弹窗 —— 两者缺一，对话框就只是「一个没名字的框」。
  const bad = dialogs.filter(
    (d) => d.attrs["aria-modal"] !== "true" || (d.attrs["aria-label"] === undefined && d.attrs["aria-labelledby"] === undefined)
  );
  const detail = bad
    .map((d) => `${rel(d.file)}:${d.line} aria-modal=${d.attrs["aria-modal"] ?? "无"} 名称=${d.attrs["aria-label"] ?? d.attrs["aria-labelledby"] ?? "无"}`)
    .join("\n");
  assert.equal(bad.length, 0, `这些 dialog 缺 aria-modal 或可访问名：\n${detail}`);
});

test("dialog 的 aria-labelledby 指向的 id 在同一个文件里真实存在", () => {
  const bad = [];
  for (const d of dialogs) {
    const target = d.attrs["aria-labelledby"];
    if (target === undefined) continue;
    const ids = idsByFile.get(d.file);
    if (!ids.has(target)) {
      bad.push(`${rel(d.file)}:${d.line} aria-labelledby="${target}" 指向的 id 不存在`);
    }
  }
  assert.equal(bad.length, 0, bad.join("\n"));
});

test("至少存在 2 处 role=\"dialog\"", () => {
  // 不写死「恰好 2 处」：以后新增浮层不该假红。
  assert.ok(dialogs.length >= 2, `role="dialog" 至少要有 2 处，实际 ${dialogs.length} 处`);
});

// ── A-5 防退化 ────────────────────────────────────────────────────────────────

test("src/app/loading.tsx 必须不存在", () => {
  // 根级 loading 会把 404 变成 200 软 404（Next 先渲染 loading 再返回 404 页面）。
  assert.equal(existsSync(LOADING), false, "src/app/loading.tsx 不能存在");
});
