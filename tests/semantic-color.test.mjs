import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";

// F3 语义色回归测试。
//
// 背景：涨跌色（--neo-up 红 / --neo-down 绿）此前被当成唯一的一套红绿，
// 于是「操作失败」只能用绿色表达——用户看到绿色的「创建失败」会读成「一切正常」。
// 根因在 globals.css：`--danger: var(--surge)` / `--success: var(--drop)`，
// 把语义色直接绑死在涨跌色上。
//
// 本测试钉四件事：
//   1. 语义色必须独立存在，且不得引用涨跌色（否则调涨跌色会误伤错误提示）
//   2. 旧别名不许绑回 surge/drop
//   3. 「错误/成功」语义不得再用 up/down 表达（这一条防复发最关键）
//   4. 语义色文本对比度必须过 WCAG AA 4.5
//
// 不断言具体色值——换色号不该假红；只断言语义归属与可读性。

const read = (p) => readFileSync(fileURLToPath(new URL(`../${p}`, import.meta.url)), "utf8");
const CSS = read("src/app/globals.css");

/** 取 CSS 变量的字面值（只认第一处定义）。 */
const cssVar = (name) => {
  const m = CSS.match(new RegExp(`--${name}\\s*:\\s*([^;]+);`));
  return m ? m[1].trim() : null;
};

/** 递归收集 src 下所有 tsx/ts 源码。 */
const walk = (dir) => {
  const base = fileURLToPath(new URL(`../${dir}`, import.meta.url));
  const out = [];
  for (const e of readdirSync(base, { withFileTypes: true })) {
    const p = `${base}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(`${dir}/${e.name}`));
    else if (/\.(tsx|ts)$/.test(e.name)) out.push({ path: `${dir}/${e.name}`, text: readFileSync(p, "utf8") });
  }
  return out;
};

/** WCAG 相对亮度与对比度。 */
const srgb = (c) => {
  const v = c / 255;
  return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
};
const luminance = (hex) => {
  const h = hex.replace("#", "");
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
  return 0.2126 * srgb(r) + 0.7152 * srgb(g) + 0.0722 * srgb(b);
};
const contrast = (a, b) => {
  const [x, y] = [luminance(a), luminance(b)].sort((p, q) => q - p);
  return (x + 0.05) / (y + 0.05);
};

// ── 1. 语义色必须独立定义，不得借用涨跌色 ────────────────────────────────────

test("语义色独立存在，且值不得引用涨跌色变量", () => {
  const semantic = [
    "neo-danger-text",
    "neo-danger-soft",
    "neo-success",
    "neo-success-text",
    "neo-success-soft",
    "neo-amber-text",
  ];
  for (const name of semantic) {
    const v = cssVar(name);
    assert.ok(v, `缺少语义色变量 --${name}`);
    assert.ok(
      !/var\(--neo-(up|down)/.test(v),
      `--${name} 引用涨跌色（${v}）：语义色必须独立，否则调整涨跌色会误伤错误提示`,
    );
  }
});

test("旧别名 --danger / --success 不得再绑涨跌色（F3 根因）", () => {
  // 曾经是 var(--surge) / var(--drop)，即「危险=涨红」「成功=跌绿」
  assert.ok(!/--danger\s*:\s*var\(--surge\)/.test(CSS), "--danger 又绑回涨色 surge 了");
  assert.ok(!/--success\s*:\s*var\(--drop\)/.test(CSS), "--success 又绑回跌色 drop 了");
  assert.equal(cssVar("danger"), "var(--neo-danger)", "--danger 应指向独立的 --neo-danger");
  assert.equal(cssVar("success"), "var(--neo-success)", "--success 应指向独立的 --neo-success");
});

// ── 2. 反馈语义不得再用涨跌色表达（核心防复发）───────────────────────────────

test("全库扫描：错误/失败语义不得与涨跌色同行", () => {
  // 只扫「同一行同时出现反馈关键词与涨跌色」，多行书写由下面的定点断言兜。
  const FB = /error|fail|失败|错误|异常|无效|success|成功|已保存|已创建|已完成|warn|警告|校验|invalid/i;
  const UPDOWN = /neo-(up|down)/;
  const hits = [];
  for (const { path, text } of walk("src")) {
    text.split("\n").forEach((line, i) => {
      if (UPDOWN.test(line) && FB.test(line)) hits.push(`${path}:${i + 1}  ${line.trim().slice(0, 110)}`);
    });
  }
  assert.deepEqual(hits, [], `以下位置仍在用涨跌色表达反馈语义：\n${hits.join("\n")}`);
});

/** 断言某文件的某段文本用的是语义色。 */
const assertUses = (relPath, snippet, expectedClass, why) => {
  const src = read(relPath);
  assert.ok(src.includes(snippet), `${relPath} 里找不到锚点「${snippet}」（${why}）`);
  assert.ok(
    !/\btext-neo-(up|down)\b/.test(snippet),
    `${relPath} 的「${why}」仍在用涨跌色：${snippet}`,
  );
  assert.ok(snippet.includes(expectedClass), `${relPath} 的「${why}」应使用 ${expectedClass}`);
};

test("错误提示必须用 danger（挑最关键的 6 处）", () => {
  assertUses("src/components/alert/alert-input.tsx", "neo-danger-soft rounded-md px-3 py-2 text-xs text-neo-danger", "neo-danger", "建盯盘失败");
  assertUses("src/components/ai/ai-score-panel.tsx", '{error && <span className="text-xs text-neo-danger">{error}</span>}', "text-neo-danger", "AI 评分失败");
  assertUses("src/components/ai/news-radar.tsx", "text-neo-danger\">舆情雷达生成失败", "text-neo-danger", "舆情雷达失败");
  assertUses("src/components/ai/ai-history-panel.tsx", '<CircleAlert size={11} className="shrink-0 text-neo-danger" />', "text-neo-danger", "任务失败图标");
  assertUses("src/components/ui/state.tsx", "border-[var(--neo-danger-soft)]", "var(--neo-danger-soft)", "ErrorState 边框");
  assertUses("src/app/api-docs/page.tsx", 'text-neo-danger font-mono">429', "text-neo-danger", "429 状态码");
});

test("成功提示必须用 success（挑最关键的 4 处）", () => {
  assertUses("src/components/alert/alert-input.tsx", "neo-success-soft rounded-md px-3 py-2 text-xs text-neo-success", "neo-success", "建盯盘成功");
  assertUses("src/components/ai/ai-history-panel.tsx", '<CheckCircle2 size={11} className="shrink-0 text-neo-success" />', "text-neo-success", "任务完成图标");
  assertUses("src/app/account/page.tsx", '"ok" ? "text-neo-success" : "text-neo-danger"', "text-neo-success", "账户页成功/失败");
  assertUses("src/app/api-docs/page.tsx", 'text-neo-success font-mono">200', "text-neo-success", "200 状态码");
});

test("警告类用 amber，不要用绿色", () => {
  const ev = read("src/components/ai/ai-evidence-panel.tsx");
  assert.ok(ev.includes("text-neo-amber"), "证据面板告警应使用 text-neo-amber");
  assert.ok(ev.includes("var(--neo-amber-soft)"), "证据面板告警块底应使用 amber");
  const cm = read("src/components/ai/ai-comment.tsx");
  assert.ok(cm.includes("border-neo-amber/20 bg-neo-amber/5"), "风险抽屉边框应使用 amber");
});

// ── 3. 可读性：语义色文本必须过 AA ───────────────────────────────────────────

test("语义色文本对比度 ≥ 4.5（最亮背景 #181C22）", () => {
  const bg = "#181C22"; // 项目中实际会承载文字的最亮底色
  for (const name of ["neo-danger-text", "neo-success-text", "neo-amber-text"]) {
    const v = cssVar(name);
    const hex = v && v.match(/#[0-9a-fA-F]{6}/);
    assert.ok(hex, `--${name} 不是可计算的 hex 色值：${v}`);
    const r = contrast(hex[0], bg);
    assert.ok(r >= 4.5, `--${name} (${hex[0]}) 对 ${bg} 对比度仅 ${r.toFixed(2)}，低于 WCAG AA 4.5`);
  }
});

// ── 4. 边界：涨跌色该留的地方必须还在 ───────────────────────────────────────

test("涨跌色仍在原位（防止矫枉过正把涨跌也改成语义色）", () => {
  // 价格/涨跌幅必须继续用 up/down。抽查涨跌语义最密集的两处。
  const pf = read("src/components/portfolio/portfolio-workspace.tsx");
  assert.ok(/totalPnl >= 0 \? "text-neo-up" : "text-neo-down"/.test(pf), "持仓总盈亏应保持红涨绿跌");
  const tv = read("src/components/chart/tradingview-chart.tsx");
  assert.ok(tv.includes('up ? "var(--neo-up-text)" : "var(--neo-down-text)"'), "K 线图颜色应保持红涨绿跌");
});

// ── 5. 质量评级语义：好坏方向不得用涨跌色表达 ────────────────────────────────
//
// 「评级」与「涨跌」是两套相反的红绿映射：
//   涨跌：A 股 红=涨=up
//   评级：绿=优（后端字段就叫 green_count），红=差
// 旧实现把后者的 green 接到前者的 up 上，于是实测数据里
// ROE 16.75%（优秀）显示红徽章、净利润增速 -1.95%（较差）显示绿徽章 —— 正好读反。

test("财务质量评级三档用语义色，方向为 绿=优 / 红=差", () => {
  const src = read("src/components/stock/stock-tabs.tsx");
  assert.ok(
    /color === "green"\)\s*return\s*"neo-success-soft text-neo-success"/.test(src),
    'stock-tabs: color==="green"（优秀）必须用 neo-success 绿',
  );
  assert.ok(
    /color === "red"\)\s*return\s*"neo-danger-soft text-neo-danger"/.test(src),
    'stock-tabs: color==="red"（较差）必须用 neo-danger 红',
  );
  assert.ok(/return "neo-amber-soft text-neo-amber"/.test(src), "stock-tabs: 中间档应使用 neo-amber");
});

test("评级汇总「优/中/差」的颜色与徽章一致", () => {
  const src = read("src/components/stock/stock-tabs.tsx");
  assert.ok(/text-neo-success">优 /.test(src), "汇总「优」应为绿色");
  assert.ok(/text-neo-amber">中 /.test(src), "汇总「中」应为琥珀色");
  assert.ok(/text-neo-danger">差 /.test(src), "汇总「差」应为红色");
});

test("全库扫描：评级分支不得映射到涨跌色", () => {
  const hits = [];
  for (const { path, text } of walk("src")) {
    text.split("\n").forEach((line, i) => {
      if (/^\s*(\*|\/\/|\/\*)/.test(line)) return; // 跳过注释（注释里会引用旧写法作反例）
      const isGrade = /(color|level|grade)\s*===\s*"(green|red|yellow)"|\.(green|red|yellow)_count/.test(line);
      if (isGrade && /neo-(up|down)/.test(line)) {
        hits.push(`${path}:${i + 1}  ${line.trim().slice(0, 110)}`);
      }
    });
  }
  assert.deepEqual(hits, [], `以下位置把「评级」映射到了涨跌色，好坏方向会读反：\n${hits.join("\n")}`);
});

test("券商评级仍是涨跌色（表达看多/看空，防矫枉过正）", () => {
  const src = read("src/components/stock/stock-tabs.tsx");
  const m = src.match(/\{r\.rating_name && <span className="([^"]+)"/);
  assert.ok(m, "stock-tabs 里找不到 rating_name 徽章（结构变了？）");
  assert.ok(/neo-up/.test(m[1]), `券商评级表达「看多」方向，应保持涨跌色，当前却是 ${m[1]}`);
});
