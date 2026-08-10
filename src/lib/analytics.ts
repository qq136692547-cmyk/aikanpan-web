"use client";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://aikanpan.top/api/v1";
const FIRST_KEY = "aikanpan_analytics_first";
const LAST_KEY = "aikanpan_analytics_last";
let lastPath = "";
let lastSentAt = 0;

function localDay(): string {
  return new Date().toLocaleDateString("sv");
}

function utmParam(key: string): string | undefined {
  if (typeof window === "undefined") return undefined;
  return new URLSearchParams(window.location.search).get(key) || undefined;
}

async function sendEvent(event: string, path: string, label: string | undefined, token: string | null) {
  try {
    await fetch(`${API_BASE}/analytics/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({
        event,
        path,
        label,
        referrer: typeof document !== "undefined" ? document.referrer.slice(0, 200) : "",
        source: utmParam("utm_source"),
        medium: utmParam("utm_medium"),
        campaign: utmParam("utm_campaign"),
      }),
    });
  } catch {
    // Analytics must never break the app.
  }
}

export function reportPageVisit(path: string, token: string | null) {
  if (typeof window === "undefined") return;
  const now = Date.now();
  if (path === lastPath && now - lastSentAt < 10000) return;
  lastPath = path;
  lastSentAt = now;
  const today = localDay();
  const isFirst = localStorage.getItem(FIRST_KEY) !== "1";
  const lastVisit = localStorage.getItem(LAST_KEY);
  const primary: "first_visit" | "return_visit" | "page_view" = isFirst
    ? "first_visit"
    : lastVisit && lastVisit !== today
      ? "return_visit"
      : "page_view";
  localStorage.setItem(FIRST_KEY, "1");
  localStorage.setItem(LAST_KEY, today);
  void sendEvent(primary, path, undefined, token);
  if (primary !== "page_view") void sendEvent("page_view", path, undefined, token);
}
