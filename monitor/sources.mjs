const API_BASE = process.env.API_BASE || "https://aikanpan.top/api/v1";

async function main() {
  const res = await fetch(`${API_BASE}/analytics/sources?days=30`);
  if (!res.ok) throw new Error(`sources endpoint -> ${res.status} ${res.statusText}`);
  const data = await res.json();
  const summary = {
    days: data.days,
    totals: data.totals,
    sources: data.sources,
    top_referrers: data.top_referrers,
    top_paths: data.top_paths,
    daily: data.daily,
    sampled_at: data.sampled_at,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!Array.isArray(data.sources) || !data.totals || typeof data.totals.page_views !== "number") {
    throw new Error("invalid sources payload");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
