import fs from "node:fs";
import path from "node:path";

const args = process.argv.slice(2);

function argValue(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return process.env[name.toUpperCase().replace(/-/g, "_")] || fallback;
}

const OUT_FILE = path.resolve(argValue("out", "/var/lib/aikanpan-light-health/health.json"));
const TIMEOUT_MS = Number(process.env.LIGHT_HEALTH_TIMEOUT_MS || 8000);
const CHECKS = [
  {
    name: "frontend",
    url: process.env.LIGHT_HEALTH_FRONTEND_URL || "http://127.0.0.1:3000/",
    validate(res, text) {
      return res.ok && text.includes("爱看盘");
    },
  },
  {
    name: "backend health",
    url: process.env.LIGHT_HEALTH_HEALTH_URL || "http://127.0.0.1:8000/api/v1/health",
    validate(res, text) {
      return res.ok && text.length > 0;
    },
  },
  {
    name: "cn dashboard",
    url: process.env.LIGHT_HEALTH_CN_URL || "http://127.0.0.1:8000/api/v1/workbench/dashboard",
    validate(res, text) {
      const data = JSON.parse(text);
      return Array.isArray(data?.indices) && data.indices.every((item) => Number(item?.last) > 0);
    },
  },
  {
    name: "us dashboard",
    url: process.env.LIGHT_HEALTH_US_URL || "http://127.0.0.1:8000/api/v1/us/dashboard",
    validate(res, text) {
      const data = JSON.parse(text);
      return Array.isArray(data?.stocks) && data.stocks.every((item) => Number(item?.last) > 0);
    },
  },
];

const startedAt = Date.now();
const results = [];

for (const check of CHECKS) {
  const startedAt = Date.now();
  try {
    const res = await fetch(check.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    const text = await res.text();
    results.push({
      name: check.name,
      url: check.url,
      ok: check.validate(res, text),
      status: res.status,
      ms: Date.now() - startedAt,
    });
  } catch (error) {
    results.push({
      name: check.name,
      url: check.url,
      ok: false,
      status: 0,
      ms: Date.now() - startedAt,
      error: String(error?.message || error),
    });
  }
}

const failed = results.filter((item) => !item.ok);
const payload = {
  checked_at: new Date().toISOString(),
  ok: failed.length === 0,
  summary: { total: results.length, passed: results.length - failed.length, failed: failed.length },
  results,
  duration_ms: Date.now() - startedAt,
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));
process.exitCode = failed.length ? 1 : 0;
