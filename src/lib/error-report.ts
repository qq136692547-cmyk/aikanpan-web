const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://aikanpan.top/api/v1";
const MIN_INTERVAL_MS = 6000;
let lastReportAt = 0;
let installed = false;

function truncate(text: string, max: number) {
  return text.length > max ? text.slice(0, max) : text;
}

async function report(message: string, type: string, url: string) {
  const now = Date.now();
  if (now - lastReportAt < MIN_INTERVAL_MS) return;
  lastReportAt = now;
  try {
    await fetch(`${API_BASE}/monitor/errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        message: truncate(message, 300),
        type: truncate(type, 50),
        url: truncate(url, 300),
      }),
    });
  } catch {
    // Monitoring must never break the app.
  }
}

export function installErrorReporting() {
  if (installed || typeof window === "undefined") return () => {};

  installed = true;
  const onError = (event: ErrorEvent) => {
    const message = event.message || (event.error instanceof Error ? event.error.message : "window error");
    void report(message, "window.onerror", window.location.href);
  };
  const onRejection = (event: PromiseRejectionEvent) => {
    const reason = event.reason;
    const message =
      reason instanceof Error
        ? reason.message
        : typeof reason === "string"
          ? reason
          : "unhandledrejection";
    void report(message, "unhandledrejection", window.location.href);
  };

  window.addEventListener("error", onError);
  window.addEventListener("unhandledrejection", onRejection);
  return () => {
    window.removeEventListener("error", onError);
    window.removeEventListener("unhandledrejection", onRejection);
    installed = false;
  };
}
