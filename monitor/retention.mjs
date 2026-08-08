const API_BASE = process.env.API_BASE || "https://aikanpan.top/api/v1";

async function main() {
  const res = await fetch(`${API_BASE}/analytics/retention?days=30`);
  if (!res.ok) throw new Error(`retention endpoint -> ${res.status} ${res.statusText}`);
  const data = await res.json();
  const summary = {
    totals: data.totals,
    recent_cohorts: (data.cohorts || []).slice(-14),
    sampled_at: data.sampled_at,
  };
  console.log(JSON.stringify(summary, null, 2));
  if (!Array.isArray(data.cohorts) || !data.totals || typeof data.totals.unique_visitors !== "number") {
    throw new Error("invalid retention payload");
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
