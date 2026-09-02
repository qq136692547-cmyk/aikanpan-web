import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);

function argValue(name, fallback) {
  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  return process.env[name.toUpperCase().replace(/-/g, "_")] || fallback;
}

const BASE_URL = String(argValue("base-url", "https://aikanpan.top")).replace(/\/+$/, "");
const OUT_FILE = path.resolve(argValue("out", path.join(path.dirname(fileURLToPath(import.meta.url)), "../audit-results/site-audit.json")));
const TIMEOUT_MS = Number(process.env.SITE_AUDIT_TIMEOUT_MS || 20000);

const PAGE_CHECKS = [
  { name: "home", path: "/" },
  { name: "market cn", path: "/market/?market=cn" },
  { name: "market us", path: "/market/?market=us" },
  { name: "review cn", path: "/review/?market=cn" },
  { name: "review us", path: "/review/?market=us" },
  { name: "research cn", path: "/research/?market=cn" },
  { name: "research us", path: "/research/?market=us" },
  { name: "search cn", path: "/search/?market=cn" },
  { name: "search us", path: "/search/?market=us" },
  { name: "alerts cn", path: "/alerts/?market=cn" },
  { name: "alerts us", path: "/alerts/?market=us" },
  { name: "stock sh600519", path: "/stock/sh600519/" },
  { name: "stock AAPL", path: "/stock/AAPL/" },
  { name: "upgrade", path: "/upgrade/" },
  { name: "about", path: "/about/" },
  { name: "privacy", path: "/privacy/" },
  { name: "terms", path: "/terms/" },
];

const API_CHECKS = [
  {
    name: "health",
    path: "/api/v1/health",
    validate(data) {
      return typeof data?.status === "string" && data.status.length > 0;
    },
  },
  {
    name: "cn dashboard",
    path: "/api/v1/workbench/dashboard",
    validate(data) {
      return Array.isArray(data?.indices) && data.indices.length > 0 &&
        data.indices.every((item) => Number(item?.last) > 0);
    },
  },
  {
    name: "cn sectors",
    path: "/api/v1/market/sectors",
    validate(data) {
      const sectors = Array.isArray(data) ? data : data?.sectors;
      return Array.isArray(sectors) && sectors.length > 0;
    },
  },
  {
    name: "cn stock quote",
    path: "/api/v1/stocks/sh.600519/quote",
    validate(data) {
      return Number(data?.last) > 0;
    },
  },
  {
    name: "cn indicators",
    path: "/api/v1/stocks/sh.600519/indicators?days=30",
    validate(data) {
      return Boolean(data?.boll) && !JSON.stringify(data).includes("NaN");
    },
  },
  {
    name: "us dashboard",
    path: "/api/v1/us/dashboard",
    validate(data) {
      return Array.isArray(data?.indices) && data.indices.length >= 3 &&
        Array.isArray(data?.stocks) && data.stocks.length > 0 &&
        data.stocks.every((item) => Number(item?.last) > 0);
    },
  },
  {
    name: "us AAPL quote",
    path: "/api/v1/us/stocks/AAPL/quote",
    validate(data) {
      return Number(data?.last) > 0;
    },
  },
  {
    name: "us search",
    path: "/api/v1/us/stocks/search?q=aapl",
    validate(data) {
      return Array.isArray(data?.list) && data.list.length > 0;
    },
  },
  {
    name: "us earnings calendar",
    path: "/api/v1/us/earnings-calendar",
    validate(data) {
      return Array.isArray(data?.calendar);
    },
  },
];

const FORBIDDEN_PAGE_TEXT = /(?:^|>)(?:NaN|undefined)(?:<|$)|Internal Server Error|状态未知/;

async function checkUrl(item) {
  const url = `${BASE_URL}${item.path}`;
  const startedAt = performance.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Math.round((performance.now() - startedAt) * 10) / 10;
    if (!res.ok) {
      return {
        name: item.name,
        url,
        ok: false,
        status: res.status,
        ms,
        error: `HTTP ${res.status} ${res.statusText}`,
      };
    }
    const text = await res.text();
    if (FORBIDDEN_PAGE_TEXT.test(text)) {
      const match = text.match(FORBIDDEN_PAGE_TEXT)?.[0] ?? "invalid content";
      return {
        name: item.name,
        url,
        ok: false,
        status: res.status,
        ms,
        error: `unexpected page content: ${match}`,
      };
    }
    return { name: item.name, url, ok: true, status: res.status, ms };
  } catch (error) {
    return {
      name: item.name,
      url,
      ok: false,
      status: 0,
      ms: Math.round((performance.now() - startedAt) * 10) / 10,
      error: String(error?.message || error),
    };
  }
}

async function checkApi(item) {
  const url = `${BASE_URL}${item.path}`;
  const startedAt = performance.now();
  try {
    const res = await fetch(url, {
      redirect: "follow",
      signal: AbortSignal.timeout(TIMEOUT_MS),
    });
    const ms = Math.round((performance.now() - startedAt) * 10) / 10;
    if (!res.ok) {
      return {
        name: item.name,
        url,
        ok: false,
        status: res.status,
        ms,
        error: `HTTP ${res.status} ${res.statusText}`,
      };
    }
    const data = await res.json();
    if (!item.validate(data)) {
      return {
        name: item.name,
        url,
        ok: false,
        status: res.status,
        ms,
        error: "response shape or value check failed",
        data_preview: JSON.stringify(data).slice(0, 400),
      };
    }
    return { name: item.name, url, ok: true, status: res.status, ms };
  } catch (error) {
    return {
      name: item.name,
      url: `${BASE_URL}${item.path}`,
      ok: false,
      status: 0,
      ms: Math.round((performance.now() - startedAt) * 10) / 10,
      error: String(error?.message || error),
    };
  }
}

async function runChecks(items, runner) {
  const results = [];
  for (const item of items) {
    results.push(await runner(item));
  }
  return results;
}

const pages = await runChecks(PAGE_CHECKS, checkUrl);
const apis = await runChecks(API_CHECKS, checkApi);
const items = [...pages, ...apis];
const failed = items.filter((item) => !item.ok);
const payload = {
  generated_at: new Date().toISOString(),
  base_url: BASE_URL,
  timeout_ms: TIMEOUT_MS,
  summary: {
    total: items.length,
    passed: items.length - failed.length,
    failed: failed.length,
    duration_ms: Math.round(items.reduce((sum, item) => sum + (item.ms || 0), 0)),
  },
  items,
};

fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
fs.writeFileSync(OUT_FILE, JSON.stringify(payload, null, 2));
console.log(JSON.stringify(payload, null, 2));

process.exitCode = failed.length ? 1 : 0;
