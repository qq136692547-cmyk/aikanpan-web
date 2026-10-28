import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

// G2 图片资产回归测试。
//
// 背景：public/ 曾堆到 98MB，其中 60 个零引用文件（D9 已删，-> 8.6MB），
// 余下 12 张里还有 7 张是「扩展名 .png、内容实为 JPEG」。
// 本轮统一转成 webp：8.41MB -> 0.59MB（-93%），扩展名错配也随之消失。
//
// 钉四件事：
//   1. 插图目录不得再出现非 webp 位图（扩展名错配与体积回潮一并防住）
//   2. 源码里引用的每张插图都必须真实存在（防 404）
//   3. ★ OG 图必须是 png/jpg —— 它走 openGraph.images，微信/Facebook 爬虫
//      对 webp 支持不一致，转了社交分享会丢图。这条防「顺手全部转 webp」。
//   4. public 总体积设上限，防止以后有人直接往里塞原图
//
// 不校验 webp 的画质：那是构建期一次性决策（本轮实测 PSNR 38.4~45.2 dB，
// 全部 >= 35 dB），每次跑测试都算一遍 PSNR 太慢，且换图会假红。

const root = (...p) => fileURLToPath(new URL(path.join("..", ...p), import.meta.url));
const ART = "public/images/ai-art";

/** 递归收集 src 下所有 tsx/ts/css 源码。 */
const walk = (dir) => {
  const out = [];
  for (const e of readdirSync(root(dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) out.push(...walk(rel));
    else if (/\.(tsx|ts|css)$/.test(e.name)) out.push({ path: rel, text: readFileSync(root(rel), "utf8") });
  }
  return out;
};

const totalSize = (dir) => {
  let n = 0;
  for (const e of readdirSync(root(dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`;
    if (e.isDirectory()) n += totalSize(rel);
    else n += statSync(root(rel)).size;
  }
  return n;
};

// ── 1. 插图目录只留 webp ────────────────────────────────────────────────────

test("插图目录不得出现非 webp 位图", () => {
  const stray = readdirSync(root(ART)).filter((f) => /\.(png|jpe?g|gif|bmp)$/i.test(f));
  assert.deepEqual(
    stray, [],
    `${ART} 下仍有非 webp 位图：${stray.join(", ")}。请转 webp 后再删原图（顺序不能反）`,
  );
});

// ── 2. 引用必须都存在，且都是 webp ──────────────────────────────────────────

test("源码引用的插图必须存在，且一律 .webp", () => {
  const refs = new Set();
  const bad = [];
  for (const { path: p, text } of walk("src")) {
    for (const m of text.matchAll(/\/images\/ai-art\/[A-Za-z0-9_.-]+\.(?:webp|png|jpe?g)/g)) {
      refs.add(m[0]);
      if (!m[0].endsWith(".webp")) bad.push(`${p}: ${m[0]}`);
    }
  }
  assert.ok(refs.size > 0, "源码里没找到任何插图引用——引用方式变了？");
  assert.deepEqual(bad, [], `以下引用仍指向非 webp：\n${bad.join("\n")}`);

  const missing = [...refs].filter((r) => !existsSync(root("public", r)));
  assert.deepEqual(missing, [], `以下引用指向不存在的文件（会 404）：\n${missing.join("\n")}`);
});

// ── 3. OG 图必须是 png/jpg（防矫枉过正）─────────────────────────────────────

test("OG 图不得转成 webp", () => {
  const og = `${readFileSync(root("src/lib/open-graph.ts"), "utf8")}`;
  const m = og.match(/url:\s*"([^"]+\.(?:png|jpe?g|webp))"/);
  assert.ok(m, "src/lib/open-graph.ts 里找不到 OG 图 url（结构变了？）");
  assert.ok(!m[1].endsWith(".webp"), `OG 图不能是 webp：社交平台爬虫支持不一致，当前是 ${m[1]}`);
  assert.ok(existsSync(root("public", m[1])), `OG 图文件不存在：public${m[1]}`);
});

// ── 4. public 总体积上限 ────────────────────────────────────────────────────

test("public/ 总体积 <= 3MB（防止原图回潮）", () => {
  const mb = totalSize("public") / 1024 / 1024;
  // 当前实测 0.72MB。留 4 倍余量，只为拦「直接塞原图」这类粗放操作。
  assert.ok(mb <= 3, `public/ 已达 ${mb.toFixed(2)}MB，超过 3MB 上限——请确认是否又放了未压缩原图`);
});
