import test from "node:test";
import assert from "node:assert/strict";

const API_BASE = process.env.API_BASE || "https://aikanpan.top/api/v1";

async function authHeaders() {
  const login = await request("/auth/guest-login", { method: "POST", body: JSON.stringify({}) });
  return { Authorization: `Bearer ${login.token}` };
}

async function request(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { "Content-Type": "application/json", ...(options.headers || {}) },
  });
  assert.ok(res.ok, `${path} -> ${res.status} ${res.statusText}`);
  return res.json();
}

test("health is reachable", { timeout: 15000 }, async () => {
  const data = await request("/health");
  assert.equal(typeof data.status, "string");
});

test("dashboard returns indices", { timeout: 30000 }, async () => {
  const data = await request("/workbench/dashboard");
  assert.ok(Array.isArray(data.indices) && data.indices.length > 0);
  assert.ok(["pre", "trading", "lunch", "closed", "unknown"].includes(data.market_phase));
});

test("indicators include BOLL and no NaN", { timeout: 30000 }, async () => {
  const data = await request("/stocks/sz.300414/indicators?days=30");
  assert.ok(data.boll && Array.isArray(data.boll.upper));
  assert.ok(!JSON.stringify(data).includes("NaN"));
});

test("search supports pinyin", { timeout: 20000 }, async () => {
  const data = await request("/stocks/search?q=gzmt");
  assert.ok(data.list.some((item) => item.name === "贵州茅台"));
});

test("portfolio endpoints respond", { timeout: 30000 }, async () => {
  const positions = await request("/portfolio/positions");
  const transactions = await request("/portfolio/transactions");
  assert.ok(Array.isArray(positions.positions));
  assert.ok(Array.isArray(transactions.transactions));
});

test("daily review is cached", { timeout: 60000 }, async () => {
  let data = await request("/ai/daily-review", {
  headers: await authHeaders(),
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.ok(data.content && data.content.length > 0);
  if (!data.cached) {
    data = await request("/ai/daily-review", {
    headers: await authHeaders(),
      method: "POST",
      body: JSON.stringify({}),
    });
    assert.equal(data.cached, true);
  }
});

test("portfolio AI review generates content", { timeout: 90000 }, async () => {
  const data = await request("/ai/portfolio-review", {
  headers: await authHeaders(),
    method: "POST",
    body: JSON.stringify({}),
  });
  assert.ok(data.content && data.content.length > 0);
});

test("plan focus generates content", { timeout: 60000 }, async () => {
  const data = await request("/ai/plan-focus", {
  headers: await authHeaders(),
    method: "POST",
    body: JSON.stringify({
      plans: [
        { date: "2026-08-06", name: "贵州茅台", code: "sh.600519", action: "观察", note: "关注年线" },
      ],
    }),
  });
  assert.ok(data.content && data.content.length > 0);
});

test("guest login and ai history roundtrip", { timeout: 30000 }, async () => {
  const login = await request("/auth/guest-login", { method: "POST", body: JSON.stringify({}) });
  const headers = { Authorization: `Bearer ${login.token}` };
  const saved = await request("/ai/history", {
    method: "POST",
    headers,
    body: JSON.stringify({ code: "sh.600519", name: "贵州茅台", content: "冒烟测试历史", model: "test" }),
  });
  assert.ok(saved.id);
  const list = await request("/ai/history?code=sh.600519", { headers });
  assert.ok(list.history.some((h) => h.id === saved.id));
  const del = await request(`/ai/history/${saved.id}`, { method: "DELETE", headers });
  assert.equal(del.deleted, true);
});

test("alert settings read and update browser toggle", { timeout: 30000 }, async () => {
  const login = await request("/auth/guest-login", { method: "POST", body: JSON.stringify({}) });
  const headers = { Authorization: `Bearer ${login.token}` };
  const before = await request("/alerts/settings", { headers });
  assert.equal(typeof before.browser_enabled, "boolean");
  const after = await request("/alerts/settings", {
    method: "PATCH",
    headers,
    body: JSON.stringify({ browser_enabled: true }),
  });
  assert.equal(after.browser_enabled, true);
});

test("US alerts create/filter/delete", { timeout: 30000 }, async () => {
  const login = await request("/auth/guest-login", { method: "POST", body: JSON.stringify({}) });
  const headers = { Authorization: `Bearer ${login.token}` };
  const created = await request("/alerts", {
    method: "POST",
    headers,
    body: JSON.stringify({ code: "aapl", condition: "above", threshold: 0.01, market: "us", note: "smoke us alert" }),
  });
  assert.equal(created.market, "us");
  assert.equal(created.code, "AAPL");
  const list = await request("/alerts?market=us", { headers });
  assert.ok(list.alerts.some((a) => a.id === created.id));
  const cn = await request("/alerts?market=cn", { headers });
  assert.ok(!cn.alerts.some((a) => a.id === created.id));
  const removed = await request(`/alerts/${created.id}`, { method: "DELETE", headers });
  assert.equal(removed.deleted, true);
});

test("multi-condition alert roundtrip", { timeout: 30000 }, async () => {
  const login = await request("/auth/guest-login", { method: "POST", body: JSON.stringify({}) });
  const headers = { Authorization: `Bearer ${login.token}` };
  const created = await request("/alerts", {
    method: "POST",
    headers,
    body: JSON.stringify({
      code: "sh.600519",
      market: "cn",
      conditions: [
        { field: "price", op: "below", threshold: 1500 },
        { field: "change_pct", op: "above", threshold: 2 },
      ],
    }),
  });
  assert.equal(created.conditions.length, 2);
  await request(`/alerts/${created.id}`, { method: "DELETE", headers });
});

test("US alert NLP parse returns market", { timeout: 45000 }, async () => {
  const data = await request("/alerts/parse", {
  headers: await authHeaders(),
    method: "POST",
    body: JSON.stringify({ text: "苹果跌到180提醒我", market: "us" }),
  });
  assert.equal(data.market, "us");
  assert.ok(data.code && /^[A-Z][A-Z0-9.-]{0,9}$/.test(data.code));
});

test("US AI score-batch returns items", { timeout: 60000 }, async () => {
  const data = await request("/ai/score-batch", {
  headers: await authHeaders(),
    method: "POST",
    body: JSON.stringify({ codes: ["AAPL"], market: "us" }),
  });
  assert.ok(Array.isArray(data.items));
  assert.ok(data.items.some((i) => i.code === "AAPL"));
});

test("US plan-focus generates content", { timeout: 60000 }, async () => {
  const data = await request("/ai/plan-focus", {
  headers: await authHeaders(),
    method: "POST",
    body: JSON.stringify({ market: "us", plans: [{ date: "2026-08-10", name: "苹果", code: "AAPL", action: "观察", note: "测试" }] }),
  });
  assert.ok(data.content && data.content.length > 0);
});

test("research US page is reachable", { timeout: 30000 }, async () => {
  const res = await fetch("https://aikanpan.top/research/?market=us");
  assert.ok(res.ok, `research us -> ${res.status}`);
});

test("review status exposes task fields", { timeout: 30000 }, async () => {
  const data = await request("/workbench/review-status");
  assert.equal(typeof data.next_run, "string");
  assert.equal(typeof data.last_success_at, "string");
  assert.equal(typeof data.last_error, "string");
  assert.equal(typeof data.cached, "boolean");
});

test("monitor errors endpoint accepts and lists", { timeout: 30000 }, async () => {
  const saved = await request("/monitor/errors", {
    method: "POST",
    body: JSON.stringify({ message: "smoke monitor", url: "https://aikanpan.top/tests", type: "test" }),
  });
  assert.equal(typeof saved.accepted, "boolean");
  const list = await request("/monitor/errors?limit=5");
  assert.ok(Array.isArray(list.errors));
});

test("sector stocks return real constituents", { timeout: 40000 }, async () => {
  const data = await request("/market/sectors/BK1600/stocks?top=5");
  assert.ok(Array.isArray(data.stocks) && data.stocks.length > 0);
  assert.ok(data.stocks.every((s) => /^(sh|sz)\.\d{6}$/.test(s.code || "")));
});

test("terms page is reachable", { timeout: 15000 }, async () => {
  const res = await fetch("https://aikanpan.top/terms/");
  assert.ok(res.ok, `terms -> ${res.status}`);
});

test("analytics events endpoint accepts page_view", { timeout: 30000 }, async () => {
  const login = await request("/auth/guest-login", { method: "POST", body: JSON.stringify({}) });
  const headers = { Authorization: `Bearer ${login.token}` };
  const saved = await request("/analytics/events", {
    method: "POST",
    headers,
    body: JSON.stringify({ event: "page_view", path: "/smoke", label: "test" }),
  });
  assert.equal(saved.accepted, true);
});

test("analytics retention returns cohorts and totals", { timeout: 30000 }, async () => {
  const data = await request("/analytics/retention?days=7");
  assert.ok(Array.isArray(data.cohorts));
  assert.equal(typeof data.totals.unique_visitors, "number");
  assert.equal(typeof data.totals.page_views, "number");
});

test("analytics sources returns source buckets", { timeout: 30000 }, async () => {
  const data = await request("/analytics/sources?days=7");
  assert.ok(Array.isArray(data.sources));
  assert.equal(typeof data.totals.page_views, "number");
  assert.ok(Array.isArray(data.top_paths));
});

test("US dashboard returns indices", { timeout: 30000 }, async () => {
  const data = await request("/us/dashboard");
  assert.ok(Array.isArray(data.indices) && data.indices.length === 3);
  assert.ok(Array.isArray(data.stocks) && data.stocks.length > 0);
});

test("US quote and history degrade gracefully", { timeout: 30000 }, async () => {
  const q = await request("/us/stocks/AAPL/quote");
  assert.equal(typeof q.code, "string");
  const h = await request("/us/stocks/AAPL/history?days=30");
  assert.ok(Array.isArray(h.bars));
});

test("US search returns list", { timeout: 30000 }, async () => {
  const data = await request("/us/stocks/search?q=apple");
  assert.ok(Array.isArray(data.list));
});

test("US earnings endpoint returns free-tier data", { timeout: 30000 }, async () => {
  const data = await request("/us/stocks/AAPL/earnings");
  assert.ok(Array.isArray(data.earnings));
  assert.ok(data.upcoming === null || typeof data.upcoming === "object");
  if (data.earnings.length > 0) assert.ok(data.earnings[0].period);
});

test("US watchlist roundtrip", { timeout: 30000 }, async () => {
  const login = await request("/auth/guest-login", { method: "POST", body: JSON.stringify({}) });
  const headers = { Authorization: `Bearer ${login.token}` };
  const added = await request("/us/watchlist", {
    method: "POST",
    headers,
    body: JSON.stringify({ code: "AAPL", name: "苹果" }),
  });
  assert.equal(added.ok, true);
  const list = await request("/us/watchlist", { headers });
  assert.ok(list.watchlist.some((w) => w.code === "AAPL"));
  const removed = await request("/us/watchlist/AAPL", { method: "DELETE", headers });
  assert.equal(removed.deleted, true);
});

test("US portfolio summary responds", { timeout: 30000 }, async () => {
  const login = await request("/auth/guest-login", { method: "POST", body: JSON.stringify({}) });
  const headers = { Authorization: `Bearer ${login.token}` };
  const data = await request("/us/portfolio/summary", { headers });
  assert.equal(typeof data.total_value, "number");
  assert.equal(typeof data.usd_cny, "number");
});

test("US portfolio transactions roundtrip", { timeout: 30000 }, async () => {
  const login = await request("/auth/guest-login", { method: "POST", body: JSON.stringify({}) });
  const headers = { Authorization: `Bearer ${login.token}` };
  const tx = await request("/us/portfolio/transactions", {
    method: "POST",
    headers,
    body: JSON.stringify({ code: "AAPL", name: "苹果", type: "buy", shares: 10, price: 300 }),
  });
  assert.equal(tx.currency, "USD");
  const list = await request("/us/portfolio/transactions", { headers });
  assert.ok(list.transactions.some((t) => t.id === tx.id));
  const positions = await request("/us/portfolio/positions", { headers });
  assert.ok(positions.positions.some((p) => p.code === "AAPL"));
  const removed = await request(`/us/portfolio/transactions/${tx.id}`, { method: "DELETE", headers });
  assert.equal(removed.deleted, true);
});


test("membership status is available for authenticated guest", { timeout: 30000 }, async () => {
  const data = await request("/membership/status", { headers: await authHeaders() });
  assert.equal(data.plan, "free");
  assert.equal(data.ai_daily_limit, 3);
  assert.equal(data.ai_remaining, Math.max(0, data.ai_daily_limit - data.ai_used_today));
});
