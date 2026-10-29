"use client";

import { sanitizeMessage, sanitizeUrl } from "./url-sanitize";

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://aikanpan.top/api/v1";
const FIRST_KEY = "aikanpan_analytics_first";
const LAST_KEY = "aikanpan_analytics_last";
let lastPath = "";
let lastSentAt = 0;

/** 错误上报的防刷上限：错误边界反复重渲染时不能把接口打穿 */
const CLIENT_ERROR_LIMIT = 5;
let clientErrorCount = 0;
const reportedClientErrors = new Set<string>();

export type UpgradeProfile = "intraday" | "longterm" | "beginner";
export type UpgradeFunnelEvent =
  | "upgrade_exposure"
  | "upgrade_profile_select"
  | "upgrade_click"
  | "activation_success"
  | "ai_quota_hit"
  // 常驻余量条的曝光（ai-quota-bar.tsx）。
  // 与 ai_quota_hit 的区别：hit 是「真的用完了」，view 是「看见还剩多少」。
  // 前者衡量天花板，后者衡量「用户知不知道有额度这回事」——10 月实测
  // 全站 12 万 PV 但 ai_quota_hit 仅 45 次，说明断点在 view 这一侧。
  | "ai_quota_view"
  | "daily_workflow_click";

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
        path: sanitizeUrl(path, 200),
        label,
        // referrer 是上一页的完整 URL，从 /pay/success?out_trade_no=... 跳过来时会带着订单号。
        referrer: typeof document !== "undefined" ? sanitizeUrl(document.referrer, 200) : "",
        source: utmParam("utm_source"),
        medium: utmParam("utm_medium"),
        campaign: utmParam("utm_campaign"),
      }),
    });
  } catch {
    // Analytics must never break the app.
  }
}

function readAuthToken(): string | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem("aikanpan_auth");
    return raw ? JSON.parse(raw)?.token ?? null : null;
  } catch {
    return null;
  }
}

export function reportConversionEvent(
  event: UpgradeFunnelEvent | "feature_use",
  options?: { profile?: UpgradeProfile; source?: string }
) {
  if (typeof window === "undefined") return;
  const market = new URLSearchParams(window.location.search).get("market");
  const parts = [options?.profile, options?.source, market ? `market:${market}` : undefined].filter(Boolean);
  void sendEvent(event, window.location.pathname, parts.length ? parts.join(":").slice(0, 80) : undefined, readAuthToken());
}

export function reportClientError(input: {
  scope: "app" | "global";
  message: string;
  digest?: string;
}): void {
  try {
    if (typeof window === "undefined") return;
    // 每次页面加载最多 5 条：错误边界重渲染会把同一条错误重复打出来，
    // 没有这层上限等于给接口装了个自激振荡器。
    if (clientErrorCount >= CLIENT_ERROR_LIMIT) return;

    // digest 是 Next 生成的稳定错误指纹；开发模式没有 digest，
    // 这时退回用消息内容当键，否则「两个不同的错误」会被折叠成一条。
    const safe = sanitizeMessage(input.message || "unknown", 80);
    const dedupeKey = input.digest ? `digest:${input.digest}` : `msg:${input.scope}:${safe.slice(0, 40)}`;
    if (reportedClientErrors.has(dedupeKey)) return;
    reportedClientErrors.add(dedupeKey);
    clientErrorCount += 1;

    // 用 sanitizeMessage 而不是 sanitizeUrl：错误 message 是自由文本，
    // 里面可能嵌着 /pay/success?out_trade_no=... 这种带凭据的完整 URL，
    // sanitizeMessage 会同时清掉查询串、敏感键值对和恢复码。
    //
    // ★ 走 /monitor/errors 而不是 /analytics/events：
    //   `analytics/events` 有事件名白名单（`_ANALYTIC_EVENT_TYPES`，server.py:122 定义、
    //   :1722 处校验），"client_error" 不在里面，发过去会被整条拒收（accepted:false），
    //   等于什么都没记。实测：换成 /monitor/errors 后 POST 返回 {"accepted":true}。
    //   `/api/v1/monitor/errors`（server.py:1663）是专为客户端错误开的：无需鉴权、
    //   服务端自己做一遍脱敏、message 上限 300。
    //   代价：它是内存环形缓冲（200 条），服务重启即清空，不含访客/事件字段。
    void fetch(`${API_BASE}/monitor/errors`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        // 类型带上 scope，便于区分「根 layout 挂了」和「页面挂了」
        type: `client_${input.scope}`,
        // digest 对人无用但能区分同类错误，放前面；message 才是给人看的
        message: `${input.digest ? `[${input.digest}] ` : ""}${safe}`,
        // 只传 pathname，不带查询串 —— 服务端虽然也会清，但不发出去更省事
        url: window.location.pathname,
      }),
    }).catch(() => {
      // 上报失败什么都不做：错误页本身不能因为上报失败再抛一次
    });
  } catch {
    // 埋点绝不能因为自身出错而影响错误页渲染
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
