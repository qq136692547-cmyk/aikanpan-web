const API_BASE = process.env.API_BASE || "https://aikanpan.top/api/v1";

async function main() {
  const res = await fetch(`${API_BASE}/analytics/funnel?days=30`);
  if (!res.ok) throw new Error(`funnel endpoint -> ${res.status} ${res.statusText}`);
  const data = await res.json();
  const summary = {
    days: data.days,
    totals: data.totals,
    stages: data.stages,
    signals: data.signals,
    daily: data.daily,
    sampled_at: data.sampled_at,
  };
  console.log(JSON.stringify(summary, null, 2));

  if (!Array.isArray(data.stages) || !data.totals || typeof data.totals.events !== "number") {
    throw new Error("invalid funnel payload");
  }
  for (const stage of data.stages) {
    if (
      typeof stage.event !== "string"
      || typeof stage.events !== "number"
      || typeof stage.unique_visitors !== "number"
      || typeof stage.conversion_pct !== "number"
    ) {
      throw new Error("invalid funnel stage payload");
    }
  }
  if (!Array.isArray(data.daily)) throw new Error("invalid funnel daily payload");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
