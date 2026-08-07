import { performance } from "node:perf_hooks";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const BASE = process.env.MONITOR_BASE_URL || "https://aikanpan.top";
const SAMPLES = Number(process.env.MONITOR_SAMPLES || 5);
const TIMEOUT_MS = Number(process.env.MONITOR_TIMEOUT_MS || 30000);
const FAIL_ON_REGRESSION = process.argv.includes("--fail-on-regression");
const OUT_DIR = path.dirname(fileURLToPath(import.meta.url));
const OUT_FILE = path.join(OUT_DIR, "perf-baseline.json");

const routes = [
  "/",
  "/dashboard/",
  "/market/",
  "/review/",
  "/research/",
  "/search/",
  "/alerts/",
  "/account/",
  "/portfolio/",
  "/etf/",
  "/fund/",
  "/about/",
  "/api-docs/",
  "/privacy/",
  "/stock/sh600519/",
];

const apis = [
  "/api/v1/health",
  "/api/v1/workbench/dashboard",
  "/api/v1/workbench/insights",
  "/api/v1/market/sectors",
  "/api/v1/stocks/sh.600519/quote",
  "/api/v1/portfolio/positions",
];

async function sampleOne(url) {
  const started = performance.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = performance.now() - started;
    return { url, status: res.status, ms: Math.round(ms * 10) / 10 };
  } catch (e) {
    return {
      url,
      status: 0,
      ms: Math.round((performance.now() - started) * 10) / 10,
      error: String(e?.message || e),
    };
  }
}

async function sample(url) {
  const runs = await Promise.all(Array.from({ length: SAMPLES }, () => sampleOne(url)));
  const ok = runs.filter((r) => r.status >= 200 && r.status < 400);
  const ms = ok.map((r) => r.ms).sort((a, b) => a - b);
  const pct = (q) => (ms.length ? ms[Math.min(ms.length - 1, Math.ceil(ms.length * q) - 1)] : 0);
  return {
    url,
    status: runs[0]?.status || 0,
    p50_ms: pct(0.5),
    p95_ms: pct(0.95),
    max_ms: ms.length ? ms[ms.length - 1] : 0,
    samples: runs.length,
    errors: runs.filter((r) => r.error || r.status >= 400).length,
  };
}

const previous = fs.existsSync(OUT_FILE)
  ? JSON.parse(fs.readFileSync(OUT_FILE, "utf8"))
  : null;

const items = [...routes.map((r) => BASE + r), ...apis.map((a) => BASE + a)];
const results = [];
for (const url of items) {
  results.push(await sample(url));
}

let regression = false;
for (const item of results) {
  const old = previous?.items?.find((x) => x.url === item.url);
  if (old && old.p50_ms > 1000 && item.p50_ms > old.p50_ms * 1.5) {
    console.warn(`REGRESSION ${item.url} p50 ${old.p50_ms}ms -> ${item.p50_ms}ms`);
    regression = true;
  }
}

const payload = {
  generated_at: new Date().toISOString(),
  base_url: BASE,
  samples_per_url: SAMPLES,
  items: results,
};
fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));

if (FAIL_ON_REGRESSION && regression) {
  process.exit(1);
}
