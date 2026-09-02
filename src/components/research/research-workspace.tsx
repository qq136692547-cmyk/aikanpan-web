"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSync } from "@/lib/use-sync";
import { api, type AIComment, type AIScoreItem, type Dashboard, type PlanFocus, type StockFinancials, type StockEvents, type UsDashboard, type UsEarnings, type UsFinancials, type UsNewsItem, type WatchlistItem } from "@/lib/api";
import { AiDisclaimer } from "@/components/ui/ai-disclaimer";
import { type MarketScope } from "@/lib/market";
import { formatPct, formatPrice } from "@/lib/format";
import { usNameZh } from "@/lib/us-stock-names";
import { useWatchlist } from "@/lib/use-watchlist";
import { useAuth } from "@/lib/auth";

type TabKey = "watchlist" | "plans" | "profiles" | "theses";


interface PlanItem {
  id: string;
  date: string;
  name: string;
  code: string;
  market?: "cn" | "us";
  action: string;
  note: string;
  done: boolean;
  archived?: boolean;
}

interface ThesisItem {
  id: string;
  name: string;
  code: string;
  market?: "cn" | "us";
  reason: string;
  trigger: string;
  status: "active" | "watching" | "closed";
  reviews?: { date: string; note: string }[];
}


type ProfileNotes = Record<string, string>;

interface ProfileExtra {
  financials?: StockFinancials;
  events?: StockEvents;
  usFinancials?: UsFinancials;
  usNews?: UsNewsItem[];
  usEarnings?: UsEarnings;
  ai?: AIComment;
  loading?: boolean;
  error?: string;
}

type ProfileData = Record<string, ProfileExtra>;

const PLANS_KEY = "aikanpan_research_plans";
const THESES_KEY = "aikanpan_research_theses";
const PROFILES_KEY = "aikanpan_research_profiles";
const AI_SCORES_KEY = "aikanpan_research_ai_scores";

function load<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore storage failures
  }
}

function newId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: "watchlist", label: "自选" },
  { key: "plans", label: "盘前计划" },
  { key: "profiles", label: "公司档案" },
  { key: "theses", label: "投资论点" },
];

const PLAN_ACTIONS = ["观察", "买入", "卖出", "减仓", "加仓"];

function statusClass(status: string) {
  if (status === "active") return "neo-up-soft text-neo-up";
  if (status === "watching") return "bg-[var(--neo-amber-soft)] text-[var(--neo-amber)]";
  return "bg-[var(--neo-surface-inset)] text-neo-dim";
}

function fmtPct(v?: number) {
  return v == null ? "—" : formatPct(v);
}

function fmtRoe(v?: number) {
  return v == null ? "—" : `${v.toFixed(2)}%`;
}

function fmtUsPct(v?: number) {
  return v == null ? "—" : `${(v * 100).toFixed(2)}%`;
}

function stockHrefFor(code: string, market?: string): string {
  return market === "us" || /^[A-Z][A-Z0-9.-]{0,9}$/.test(code) ? `/stock/${code}/` : `/stock/${code.replace(/\./, "")}/`;
}

export function ResearchWorkspace({
  dashboard,
  market = "all",
}: {
  dashboard: Dashboard | UsDashboard | null;
  market?: MarketScope;
}) {
  const activeMarket: "cn" | "us" = market === "us" ? "us" : "cn";
  const isUs = activeMarket === "us";
  const { watchlist: liveWatchlist, toggle: toggleWatchlist } = useWatchlist();
  const { isAuthenticated } = useAuth();
  const [usWatchlist, setUsWatchlist] = useState<WatchlistItem[]>([]);
  const watchlist = isUs ? usWatchlist : liveWatchlist;
  const { pushData, pullData } = useSync();
  const syncedOnce = useRef(false);
  const pushTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [tab, setTab] = useState<TabKey>("watchlist");
  const [hydrated, setHydrated] = useState(false);

  const [plans, setPlans] = useState<PlanItem[]>([]);
  const [theses, setTheses] = useState<ThesisItem[]>([]);
  const [profileNotes, setProfileNotes] = useState<ProfileNotes>({});
  const [profileData, setProfileData] = useState<ProfileData>({});

  const [planDate, setPlanDate] = useState("");
  const [planName, setPlanName] = useState("");
  const [planCode, setPlanCode] = useState("");
  const [planAction, setPlanAction] = useState(PLAN_ACTIONS[0]);
  const [planNote, setPlanNote] = useState("");

  const [thesisName, setThesisName] = useState("");
  const [thesisCode, setThesisCode] = useState("");
  const [thesisReason, setThesisReason] = useState("");
  const [thesisTrigger, setThesisTrigger] = useState("");
  const [thesisStatus, setThesisStatus] = useState<ThesisItem["status"]>("active");
  const [showArchivedPlans, setShowArchivedPlans] = useState(false);
  const [thesisReviewDraft, setThesisReviewDraft] = useState<Record<string, string>>({});
  const [thesisReviewOpen, setThesisReviewOpen] = useState<Record<string, boolean>>({});
  const [aiScores, setAiScores] = useState<Record<string, AIScoreItem>>({});
  const [aiScoresLoading, setAiScoresLoading] = useState(false);
  const [aiScoresError, setAiScoresError] = useState<string | null>(null);
  const [planFocus, setPlanFocus] = useState<PlanFocus | null>(null);
  const [planFocusLoading, setPlanFocusLoading] = useState(false);
  const [watchCode, setWatchCode] = useState("");
  const [watchName, setWatchName] = useState("");

  useEffect(() => {
    // Local storage is read after hydration to avoid server/client markup drift.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setPlans(load<PlanItem[]>(PLANS_KEY, []));
    setTheses(load<ThesisItem[]>(THESES_KEY, []));
    setProfileNotes(load<ProfileNotes>(PROFILES_KEY, {}));
    setAiScores(load<Record<string, AIScoreItem>>(AI_SCORES_KEY, {}));
    setPlanDate(new Date().toISOString().slice(0, 10));
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) save(PLANS_KEY, plans);
  }, [plans, hydrated]);

  useEffect(() => {
    if (hydrated) save(THESES_KEY, theses);
  }, [theses, hydrated]);

  useEffect(() => {
    if (hydrated) save(PROFILES_KEY, profileNotes);
  }, [profileNotes, hydrated]);

  useEffect(() => {
    if (hydrated) save(AI_SCORES_KEY, aiScores);
  }, [aiScores, hydrated]);

  useEffect(() => {
    if (!hydrated) return;
    let cancelled = false;
    pullData("notes")
      .then((data) => {
        if (cancelled || !data) return;
        const remote = data as { plans?: PlanItem[]; theses?: ThesisItem[]; profileNotes?: ProfileNotes; aiScores?: Record<string, AIScoreItem> };
        if (Array.isArray(remote.plans)) setPlans(remote.plans);
        if (Array.isArray(remote.theses)) setTheses(remote.theses);
        if (remote.profileNotes && typeof remote.profileNotes === "object") setProfileNotes(remote.profileNotes);
        if (remote.aiScores && typeof remote.aiScores === "object") setAiScores(remote.aiScores);
      })
      .catch(() => {})
      .finally(() => {
        if (!cancelled) syncedOnce.current = true;
      });
    return () => {
      cancelled = true;
    };
  }, [hydrated, pullData]);

  useEffect(() => {
    if (!hydrated || !syncedOnce.current) return;
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      pushData("notes", { plans, theses, profileNotes, aiScores }).catch(() => {});
    }, 800);
    return () => {
      if (pushTimer.current) clearTimeout(pushTimer.current);
    };
  }, [plans, theses, profileNotes, aiScores, hydrated, pushData]);

  const idx0 = dashboard?.indices?.[0];
  const scopedPlans = useMemo(() => plans.filter((p) => (p.market || "cn") === activeMarket), [plans, activeMarket]);
  const scopedTheses = useMemo(() => theses.filter((t) => (t.market || "cn") === activeMarket), [theses, activeMarket]);
  const activePlans = useMemo(() => scopedPlans.filter((p) => !p.done && !p.archived), [scopedPlans]);
  const activeTheses = useMemo(() => scopedTheses.filter((t) => t.status !== "closed"), [scopedTheses]);
  const visiblePlans = useMemo(() => scopedPlans.filter((p) => (showArchivedPlans ? !!p.archived : !p.archived)), [scopedPlans, showArchivedPlans]);
  const suggestedStocks = useMemo<WatchlistItem[]>(() => {
    if (!dashboard) return [];
    if (isUs) {
      const usData = dashboard as UsDashboard;
      return (usData.stocks || []).slice(0, 6).map((s) => ({ code: s.code, name: usNameZh(s.name, s.code), price: s.last || 0, change_pct: s.change_pct || 0 }));
    }
    const cnData = dashboard as Dashboard;
    return (cnData.limit_up || []).slice(0, 6).map((s) => ({ code: s.code, name: s.name, price: s.price, change_pct: s.pct }));
  }, [dashboard, isUs]);

  async function loadUsWatchlist() {
    if (!isAuthenticated) {
      setUsWatchlist([]);
      return;
    }
    try {
      const data = await api.getUsWatchlist();
      setUsWatchlist((data.watchlist || []).map((q) => ({ code: q.code, name: usNameZh(q.name, q.code), price: q.last || 0, change_pct: q.change_pct || 0 })));
    } catch {
      setUsWatchlist([]);
    }
  }

  useEffect(() => {
    if (isUs) {
      // The US list is refreshed when the market scope changes.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      loadUsWatchlist();
    }
  }, [isUs, isAuthenticated]);

  async function toggleUsWatchlist(code: string, name?: string) {
    const exists = usWatchlist.some((s) => s.code === code);
    if (exists) await api.removeUsWatchlist(code);
    else await api.addUsWatchlist(code, name);
    await loadUsWatchlist();
  }

  function addPlan() {
    if (!planName.trim() || !planCode.trim()) return;
    setPlans((prev) => [
      { id: newId(), date: planDate || new Date().toISOString().slice(0, 10), name: planName.trim(), code: planCode.trim(), market: activeMarket, action: planAction, note: planNote.trim(), done: false },
      ...prev,
    ]);
    setPlanName("");
    setPlanCode("");
    setPlanNote("");
  }

  function togglePlan(id: string) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, done: !p.done } : p)));
  }

  function deletePlan(id: string) {
    setPlans((prev) => prev.filter((p) => p.id !== id));
  }

  function archivePlan(id: string, archived = true) {
    setPlans((prev) => prev.map((p) => (p.id === id ? { ...p, archived } : p)));
  }

  function addPlanFromStock(s: WatchlistItem) {
    const today = new Date().toISOString().slice(0, 10);
    if (plans.some((p) => p.code === s.code && !p.done && !p.archived)) return;
    setPlans((prev) => [{ id: newId(), date: today, name: s.name, code: s.code, market: activeMarket, action: "观察", note: "", done: false }, ...prev]);
  }

  function addThesisFromStock(s: WatchlistItem) {
    if (theses.some((t) => t.code === s.code && t.status !== "closed")) return;
    setTheses((prev) => [{ id: newId(), name: s.name, code: s.code, market: activeMarket, reason: profileData[s.code]?.events?.summary || "", trigger: "", status: "active" }, ...prev]);
  }

  function addReviewToThesis(id: string, note: string) {
    const trimmed = note.trim();
    if (!trimmed) return;
    const date = new Date().toISOString().slice(0, 10);
    setTheses((prev) => prev.map((t) => (t.id === id ? { ...t, reviews: [...(t.reviews || []), { date, note: trimmed }] } : t)));
    setThesisReviewDraft((prev) => ({ ...prev, [id]: "" }));
    setThesisReviewOpen((prev) => ({ ...prev, [id]: false }));
  }

  function addThesis() {
    if (!thesisName.trim() || !thesisCode.trim() || !thesisReason.trim()) return;
    setTheses((prev) => [
      { id: newId(), name: thesisName.trim(), code: thesisCode.trim(), market: activeMarket, reason: thesisReason.trim(), trigger: thesisTrigger.trim(), status: thesisStatus },
      ...prev,
    ]);
    setThesisName("");
    setThesisCode("");
    setThesisReason("");
    setThesisTrigger("");
  }

  function deleteThesis(id: string) {
    setTheses((prev) => prev.filter((t) => t.id !== id));
  }

  function updateProfileNote(code: string, note: string) {
    setProfileNotes((prev) => ({ ...prev, [code]: note }));
  }

  async function loadProfile(code: string) {
    setProfileData((prev) => ({ ...prev, [code]: { ...(prev[code] || {}), loading: true, error: undefined } }));
    if (isUs) {
      const settled = await Promise.allSettled([
        api.getUsQuote(code),
        api.getUsHistory(code, 60),
        api.getUsFinancials(code),
        api.getUsNews(code, 5),
        api.getUsAI(code),
        api.getUsEarnings(code),
      ]);
      setProfileData((prev) => ({
        ...prev,
        [code]: {
          loading: false,
          usFinancials: settled[2].status === "fulfilled" ? settled[2].value : undefined,
          usNews: settled[3].status === "fulfilled" ? settled[3].value.news : undefined,
          usEarnings: settled[5].status === "fulfilled" ? settled[5].value : undefined,
          ai: settled[4].status === "fulfilled" ? settled[4].value : undefined,
          error: settled[0].status === "rejected" && settled[2].status === "rejected" && settled[4].status === "rejected" ? "档案加载失败" : undefined,
        },
      }));
      return;
    }
    const [financials, events, ai] = await Promise.allSettled([
      api.getStockFinancials(code),
      api.getStockEvents(code),
      api.getAIComment(code),
    ]);
    setProfileData((prev) => ({
      ...prev,
      [code]: {
        loading: false,
        financials: financials.status === "fulfilled" ? financials.value : undefined,
        events: events.status === "fulfilled" ? events.value : undefined,
        ai: ai.status === "fulfilled" ? ai.value : undefined,
        error: financials.status === "rejected" && events.status === "rejected" && ai.status === "rejected" ? "档案加载失败" : undefined,
      },
    }));
  }

  function addPlansFromWatchlist() {
    if (watchlist.length === 0) return;
    const today = new Date().toISOString().slice(0, 10);
    const existing = new Set(scopedPlans.map((p) => p.code));
    const added = watchlist
      .filter((s) => !existing.has(s.code))
      .map((s) => ({ id: newId(), date: today, name: s.name, code: s.code, market: activeMarket, action: "观察", note: "", done: false }));
    if (added.length > 0) setPlans((prev) => [...added, ...prev]);
  }

  async function addWatchlistItem() {
    const code = watchCode.trim();
    if (!code) return;
    if (isUs) await toggleUsWatchlist(code, watchName.trim() || code);
    else await toggleWatchlist(code, watchName.trim() || code);
    setWatchCode("");
    setWatchName("");
  }

  async function scoreWatchlist() {
    if (watchlist.length === 0) return;
    setAiScoresLoading(true);
    setAiScoresError(null);
    try {
      const result = await api.getAIScoreBatch(watchlist.map((s) => s.code), activeMarket);
      const map: Record<string, AIScoreItem> = {};
      for (const item of result.items) {
        if (item.code) map[item.code] = { ...item, updated_at: new Date().toISOString() };
      }
      setAiScores(map);
    } catch (err) {
      setAiScoresError(err instanceof Error && err.message ? err.message : "评分失败，请稍后重试");
    } finally {
      setAiScoresLoading(false);
    }
  }

  async function loadPlanFocus() {
    const active = scopedPlans.filter((p) => !p.done && !p.archived);
    if (active.length === 0) return;
    setPlanFocusLoading(true);
    try {
      const result = await api.getPlanFocus(active.map((p) => ({ date: p.date, name: p.name, code: p.code, action: p.action, note: p.note })), activeMarket);
      setPlanFocus(result);
    } catch (err) {
      const message = err instanceof Error && err.message ? err.message : "生成失败，请稍后重试。";
      setPlanFocus({
        content: message,
        model: "error",
        generated_at: new Date().toISOString(),
        cached: false,
      });
    } finally {
      setPlanFocusLoading(false);
    }
  }

  function exportMarkdown() {
    const lines: string[] = [];
    lines.push(isUs ? "# 美股研究台导出" : "# 爱看盘研究台导出");
    lines.push("");
    lines.push(`导出时间：${new Date().toLocaleString("zh-CN")}`);
    lines.push("");
    if (idx0) {
      lines.push("## 市场快照");
      lines.push(`- ${idx0.name} ${formatPrice(idx0.last)} ${formatPct(idx0.change_pct)}`);
      lines.push("");
    }
    if (watchlist.length > 0) {
      lines.push("## 自选股");
      lines.push("| 名称 | 代码 | 价格 | 涨跌幅 |");
      lines.push("| --- | --- | --- | --- |");
      for (const s of watchlist) {
        lines.push(`| ${s.name} | ${s.code} | ${formatPrice(s.price)} | ${formatPct(s.change_pct)} |`);
      }
      lines.push("");
    }
    if (activePlans.length > 0) {
      lines.push("## 盘前计划");
      for (const p of activePlans) {
        lines.push(`- [${p.done ? "x" : " "}] ${p.date} ${p.name}(${p.code}) ${p.action} ${p.note || ""}`.trim());
      }
      lines.push("");
    }
    if (activeTheses.length > 0) {
      lines.push("## 投资论点");
      for (const t of activeTheses) {
        lines.push(`- ${t.name}(${t.code}) ${t.status}：${t.reason}${t.trigger ? `；卖出触发：${t.trigger}` : ""}`);
      }
      lines.push("");
    }
    const blob = new Blob([lines.join("\n")], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `aikanpan-research-${new Date().toISOString().slice(0, 10)}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (!hydrated) {
    return (
      <div className="space-y-3">
        <div className="neo-skeleton h-10 w-56 rounded-lg" />
        <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          <div className="neo-skeleton h-64 rounded-xl lg:col-span-2" />
          <div className="neo-skeleton h-64 rounded-xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="neo-fade-up space-y-4">
      <section className="neo-card relative overflow-hidden p-5">
        <div className="relative flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <a href={isUs ? "/portfolio?market=us" : "/portfolio/"} className="neo-btn px-3 py-2 text-[12px]">持仓工具</a>
            <button onClick={exportMarkdown} className="neo-btn-primary px-4 py-2 text-[13px] font-medium">导出 Markdown</button>
          </div>
        </div>
        <div className="relative mt-4 flex flex-wrap gap-2">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`rounded-full px-3.5 py-1.5 text-[12px] font-medium transition-all duration-200 ${
                tab === t.key ? "neo-chip-active" : "neo-chip"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </section>

      {tab === "watchlist" && (
        <section className="neo-card-sm overflow-hidden">
          <div className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
            <h2 className="text-[14px] font-semibold text-neo-ink">自选股</h2>
            <div className="flex items-center gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                <input value={watchCode} onChange={(e) => setWatchCode(e.target.value)} placeholder={isUs ? "代码，如 AAPL" : "代码，如 sh.600519"} className="neo-input w-32 rounded-md px-2.5 py-1.5 text-[11px]" />
                <input value={watchName} onChange={(e) => setWatchName(e.target.value)} placeholder="名称（可选）" className="neo-input w-24 rounded-md px-2.5 py-1.5 text-[11px]" />
                <button onClick={addWatchlistItem} className="neo-chip px-2.5 py-1.5 text-[11px] text-neo-primary">添加</button>
              </div>
              <button onClick={addPlansFromWatchlist} className="neo-chip px-2.5 py-1 text-[11px] text-neo-primary">自选加入计划</button>
              <button onClick={scoreWatchlist} disabled={aiScoresLoading} className="neo-chip px-2.5 py-1 text-[11px] text-neo-primary disabled:opacity-60">
                {aiScoresLoading ? "AI 评分中…" : "AI 评分"}
              </button>
              {aiScoresError && <span className="text-[11px] text-neo-down">{aiScoresError}</span>}
              <span className="text-[11px] text-neo-dim">{watchlist.length} 只</span>
            </div>
          </div>
          {watchlist.length === 0 ? (
            <div className="space-y-3 px-5 py-6">
              <p className="text-center text-[12px] text-neo-dim">
                {suggestedStocks.length === 0 ? "暂无自选股" : "从热门股票开始，或直接输入代码添加"}
              </p>
              {suggestedStocks.length > 0 && (
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {suggestedStocks.map((s) => (
                    <div key={s.code} className="flex items-center justify-between gap-2 rounded-lg border border-[var(--neo-border)] px-3 py-2">
                      <a href={stockHrefFor(s.code, activeMarket)} className="min-w-0">
                        <span className="block truncate text-[12px] font-medium text-neo-ink">{s.name}</span>
                        <span className="text-[10px] text-neo-dim">{s.code} · {formatPrice(s.price)} · {formatPct(s.change_pct)}</span>
                      </a>
                      <button
                        onClick={() => (isUs ? toggleUsWatchlist(s.code, s.name) : toggleWatchlist(s.code, s.name))}
                        className="neo-chip px-2 py-1 text-[11px] text-neo-primary"
                      >
                        加入
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div>
              <div className="grid grid-cols-[1fr_80px_80px_64px] gap-2 px-5 py-2 text-[10px] uppercase tracking-wider text-neo-dim">
                <span>名称 / 代码</span>
                <span className="text-right">价格</span>
                <span className="text-right">涨跌幅</span>
                <span />
              </div>
              {watchlist.map((s) => (
                <div
                  key={s.code}
                  className="grid grid-cols-[1fr_80px_80px_64px] items-center gap-2 px-5 py-2.5 text-[13px] transition-colors hover-neo-inset"
                >
                  <a href={stockHrefFor(s.code)} className="min-w-0">
                    <span className="block truncate font-medium text-neo-ink">{s.name}</span>
                    <span className="block text-[10px] text-neo-dim">{s.code}</span>
                    {aiScores[s.code] && (
                      <span className="mt-0.5 block text-[10px]">
                        <span className={aiScores[s.code].score != null && aiScores[s.code].score >= 5 ? "text-neo-up" : "text-neo-down"}>{aiScores[s.code].score == null ? "—" : `${aiScores[s.code].score}/10`}</span>
                        <span className="ml-1 text-neo-dim">{aiScores[s.code].status}{aiScores[s.code].note ? ` · ${aiScores[s.code].note}` : ""}</span>
                      </span>
                    )}
                  </a>
                  <span style={{ fontFamily: "var(--font-inter), system-ui" }} className="text-right text-neo-mid">{formatPrice(s.price)}</span>
                  <span style={{ fontFamily: "var(--font-inter), system-ui" }} className={`text-right ${s.change_pct > 0 ? "text-neo-up" : s.change_pct < 0 ? "text-neo-down" : "text-neo-mid"}`}>
                    {formatPct(s.change_pct)}
                  </span>
                  <span className="flex items-center justify-end gap-2">
                    <a href={stockHrefFor(s.code)} className="text-[11px] text-neo-primary" aria-label={`进入 ${s.name}`}>进入</a>
                    <button onClick={() => (isUs ? toggleUsWatchlist(s.code, s.name) : toggleWatchlist(s.code, s.name))} className="text-[11px] text-neo-dim transition-colors hover:text-neo-down" aria-label={`从自选移除 ${s.name}`}>移除</button>
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {tab === "plans" && (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="neo-card p-5 lg:col-span-2">
            <h2 className="text-[14px] font-semibold text-neo-ink">新增盘前计划</h2>
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-neo-dim">日期</div>
                  <input type="date" value={planDate} onChange={(e) => setPlanDate(e.target.value)} className="neo-input mt-1 w-full rounded-md px-3 py-2 text-[12px]" />
                </div>
                <div>
                  <div className="text-[10px] text-neo-dim">动作</div>
                  <select value={planAction} onChange={(e) => setPlanAction(e.target.value)} className="neo-input mt-1 w-full rounded-md px-3 py-2 text-[12px]">
                    {PLAN_ACTIONS.map((a) => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-neo-dim">名称</div>
                  <input value={planName} onChange={(e) => setPlanName(e.target.value)} placeholder={isUs ? "如 苹果" : "如 贵州茅台"} className="neo-input mt-1 w-full rounded-md px-3 py-2 text-[12px]" />
                </div>
                <div>
                  <div className="text-[10px] text-neo-dim">代码</div>
                  <input value={planCode} onChange={(e) => setPlanCode(e.target.value)} placeholder={isUs ? "如 AAPL" : "如 sh.600519"} className="neo-input mt-1 w-full rounded-md px-3 py-2 text-[12px]" />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-neo-dim">备注</div>
                <input value={planNote} onChange={(e) => setPlanNote(e.target.value)} placeholder="关注理由、价位区间…" className="neo-input mt-1 w-full rounded-md px-3 py-2 text-[12px]" />
              </div>
              <button onClick={addPlan} className="neo-btn-primary mt-2 w-full rounded-md px-4 py-2 text-[13px] font-medium">添加计划</button>
            </div>
          </div>
          <div className="neo-card-sm overflow-hidden lg:col-span-3">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-[14px] font-semibold text-neo-ink">计划清单</h2>
              <div className="flex items-center gap-2">
                <button onClick={() => setShowArchivedPlans((v) => !v)} className="neo-chip px-2.5 py-1 text-[11px] text-neo-primary">{showArchivedPlans ? "查看进行中" : "查看归档"}</button>
                <button onClick={loadPlanFocus} disabled={planFocusLoading} className="neo-chip px-2.5 py-1 text-[11px] text-neo-primary disabled:opacity-60">
                  {planFocusLoading ? "生成中…" : "AI 关注要点"}
                </button>
                <span className="text-[11px] text-neo-dim">{visiblePlans.length} 条</span>
              </div>
            </div>
            {scopedPlans.length === 0 ? (
              <div className="px-5 py-8 text-center text-[12px] text-neo-dim">暂无盘前计划</div>
            ) : (
              <div className="divide-y divide-[var(--neo-edge)]">
                {visiblePlans.map((p) => (
                  <div key={p.id} className="flex items-start gap-3 px-5 py-3">
                    <input type="checkbox" checked={p.done} onChange={() => togglePlan(p.id)} className="mt-1 h-4 w-4 accent-[var(--neo-primary)]" />
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`text-[13px] font-medium ${p.done ? "text-neo-dim line-through" : "text-neo-ink"}`}>{p.name}</span>
                        <span style={{ fontFamily: "var(--font-inter), system-ui" }} className="text-[10px] text-neo-dim">{p.code}</span>
                        <span className="neo-chip px-2 py-0.5 text-[10px] text-neo-mid">{p.action}</span>
                        <span className="text-[10px] text-neo-dim">{p.date}</span>
                        {!p.done && !p.archived && p.date < new Date().toISOString().slice(0, 10) && (
                          <span className="rounded px-1.5 py-0.5 text-[10px] text-neo-down">已过期</span>
                        )}
                      </div>
                      {p.note && <p className="mt-1 text-[12px] text-neo-mid">{p.note}</p>}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {p.done && (
                        <button onClick={() => archivePlan(p.id, !p.archived)} className="text-[11px] text-neo-primary">{p.archived ? "恢复" : "归档"}</button>
                      )}
                      <button onClick={() => deletePlan(p.id)} className="text-[11px] text-neo-dim transition-colors hover:text-neo-down">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            {planFocus && (
              <div className="border-t border-[var(--neo-edge)] px-5 py-3">
                <div className="mb-1 flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-neo-primary">AI 关注要点</span>
                  <span className="text-[10px] text-neo-dim">{planFocus.generated_at?.slice(0, 16).replace("T", " ")}</span>
                </div>
                <p className="whitespace-pre-wrap text-[12px] leading-relaxed text-neo-mid">{planFocus.content}</p>
                <AiDisclaimer className="mt-2" />
              </div>
            )}
          </div>
        </section>
      )}

      {tab === "profiles" && (
        <section className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
          {watchlist.length === 0 ? (
            <div className="neo-card-sm px-5 py-8 text-center text-[12px] text-neo-dim md:col-span-2 lg:col-span-3">暂无自选股档案</div>
          ) : (
            watchlist.map((s) => (
              <div key={s.code} className="neo-card-sm p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[14px] font-semibold text-neo-ink">{s.name}</div>
                    <div style={{ fontFamily: "var(--font-inter), system-ui" }} className="mt-0.5 text-[11px] text-neo-dim">{s.code}</div>
                  </div>
                  <div className={`text-[13px] font-semibold ${s.change_pct > 0 ? "text-neo-up" : s.change_pct < 0 ? "text-neo-down" : "text-neo-mid"}`} style={{ fontFamily: "var(--font-inter), system-ui" }}>
                    {formatPct(s.change_pct)}
                  </div>
                </div>
                <div className="mt-2 text-[18px] font-bold text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>{formatPrice(s.price)}</div>
                <button onClick={() => loadProfile(s.code)} className="neo-chip mt-3 w-full px-2 py-1.5 text-[11px] text-neo-primary">
                  {profileData[s.code]?.loading ? "加载中…" : (isUs ? "加载行情 / 新闻 / AI" : "加载财报 / 事件 / AI")}
                </button>
                {profileData[s.code]?.financials?.metrics && (
                  <div className="neo-inset mt-2 space-y-1 px-3 py-2 text-[11px]">
                    <div className="flex justify-between"><span className="text-neo-dim">营收同比</span><span className="text-neo-ink">{fmtPct(profileData[s.code]?.financials?.metrics?.revenue_yoy_pct)}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">利润同比</span><span className="text-neo-ink">{fmtPct(profileData[s.code]?.financials?.metrics?.profit_yoy_pct)}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">ROE</span><span className="text-neo-ink">{fmtRoe(profileData[s.code]?.financials?.metrics?.roe_pct)}</span></div>
                  </div>
                )}
                {isUs && profileData[s.code]?.usFinancials && !profileData[s.code]?.usFinancials?.available && (
                  <p className="mt-2 text-[11px] text-neo-dim">财报免费档暂不可用</p>
                )}
                {isUs && profileData[s.code]?.usFinancials?.metrics && (
                  <div className="neo-inset mt-2 space-y-1 px-3 py-2 text-[11px]">
                    <div className="flex justify-between"><span className="text-neo-dim">PE</span><span className="text-neo-ink">{profileData[s.code]?.usFinancials?.metrics?.pe_ratio ?? "--"}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">PB</span><span className="text-neo-ink">{profileData[s.code]?.usFinancials?.metrics?.pb_ratio ?? "--"}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">ROE</span><span className="text-neo-ink">{fmtUsPct(profileData[s.code]?.usFinancials?.metrics?.roe_pct)}</span></div>
                    <div className="flex justify-between"><span className="text-neo-dim">毛利率</span><span className="text-neo-ink">{fmtUsPct(profileData[s.code]?.usFinancials?.metrics?.gross_margin_pct)}</span></div>
                  </div>
                )}
                {isUs && (profileData[s.code]?.usNews?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-[10px] text-neo-dim">相关新闻</div>
                    {(profileData[s.code]?.usNews || []).slice(0, 3).map((n) => (
                      <p key={n.id} className="line-clamp-2 text-[11px] leading-relaxed text-neo-mid">{n.title}</p>
                    ))}
                  </div>
                )}
                {isUs && (profileData[s.code]?.usEarnings?.earnings?.length ?? 0) > 0 && (
                  <div className="mt-2 space-y-1">
                    <div className="text-[10px] text-neo-dim">最近盈利</div>
                    {(profileData[s.code]?.usEarnings?.earnings || []).slice(0, 3).map((e) => (
                      <div key={e.period} className="flex justify-between text-[11px]">
                        <span className="text-neo-dim">{e.period}</span>
                        <span className="text-neo-ink">实际 {e.actual ?? "--"} / 预期 {e.estimate ?? "--"}</span>
                      </div>
                    ))}
                  </div>
                )}
                {isUs && profileData[s.code]?.usEarnings?.upcoming && (
                  <p className="mt-2 text-[11px] text-neo-mid">下次财报：{profileData[s.code]?.usEarnings?.upcoming?.date}</p>
                )}
                {!isUs && profileData[s.code]?.events?.summary && (
                  <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-neo-mid">{profileData[s.code]?.events?.summary}</p>
                )}
                {profileData[s.code]?.ai?.content && (
                  <p className="mt-2 line-clamp-3 text-[11px] leading-relaxed text-neo-dim">AI：{profileData[s.code]?.ai?.content}</p>
                )}
                <div className="mt-2 flex gap-2">
                  <button onClick={() => addPlanFromStock(s)} className="neo-chip flex-1 px-2 py-1.5 text-[11px] text-neo-primary">加入计划</button>
                  <button onClick={() => addThesisFromStock(s)} className="neo-chip flex-1 px-2 py-1.5 text-[11px] text-neo-primary">新建论点</button>
                </div>
                <textarea
                  value={profileNotes[s.code] || ""}
                  onChange={(e) => updateProfileNote(s.code, e.target.value)}
                  placeholder="记录公司档案、跟踪要点…"
                  rows={4}
                  className="neo-input mt-3 w-full resize-none rounded-md px-3 py-2 text-[12px] leading-relaxed"
                />
              </div>
            ))
          )}
        </section>
      )}

      {tab === "theses" && (
        <section className="grid grid-cols-1 gap-3 lg:grid-cols-5">
          <div className="neo-card p-5 lg:col-span-2">
            <h2 className="text-[14px] font-semibold text-neo-ink">新增论点</h2>
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <div className="text-[10px] text-neo-dim">名称</div>
                  <input value={thesisName} onChange={(e) => setThesisName(e.target.value)} placeholder={isUs ? "如 苹果" : "如 贵州茅台"} className="neo-input mt-1 w-full rounded-md px-3 py-2 text-[12px]" />
                </div>
                <div>
                  <div className="text-[10px] text-neo-dim">代码</div>
                  <input value={thesisCode} onChange={(e) => setThesisCode(e.target.value)} placeholder={isUs ? "如 AAPL" : "sh.600519"} className="neo-input mt-1 w-full rounded-md px-3 py-2 text-[12px]" />
                </div>
              </div>
              <div>
                <div className="text-[10px] text-neo-dim">买入理由</div>
                <textarea value={thesisReason} onChange={(e) => setThesisReason(e.target.value)} placeholder="为什么跟踪、核心逻辑…" rows={3} className="neo-input mt-1 w-full resize-none rounded-md px-3 py-2 text-[12px]" />
              </div>
              <div>
                <div className="text-[10px] text-neo-dim">卖出触发</div>
                <input value={thesisTrigger} onChange={(e) => setThesisTrigger(e.target.value)} placeholder="破位、基本面恶化等" className="neo-input mt-1 w-full rounded-md px-3 py-2 text-[12px]" />
              </div>
              <div>
                <div className="text-[10px] text-neo-dim">状态</div>
                <select value={thesisStatus} onChange={(e) => setThesisStatus(e.target.value as ThesisItem["status"])} className="neo-input mt-1 w-full rounded-md px-3 py-2 text-[12px]">
                  <option value="active">跟踪中</option>
                  <option value="watching">观察中</option>
                  <option value="closed">已关闭</option>
                </select>
              </div>
              <button onClick={addThesis} className="neo-btn-primary mt-2 w-full rounded-md px-4 py-2 text-[13px] font-medium">添加论点</button>
            </div>
          </div>
          <div className="neo-card-sm overflow-hidden lg:col-span-3">
            <div className="flex items-center justify-between px-5 py-3">
              <h2 className="text-[14px] font-semibold text-neo-ink">论点清单</h2>
              <span className="text-[11px] text-neo-dim">{scopedTheses.length} 条</span>
            </div>
            {scopedTheses.length === 0 ? (
              <div className="px-5 py-8 text-center text-[12px] text-neo-dim">暂无投资论点</div>
            ) : (
              <div className="divide-y divide-[var(--neo-edge)]">
                {scopedTheses.map((t) => (
                  <div key={t.id} className="px-5 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-neo-ink">{t.name}</span>
                      <span style={{ fontFamily: "var(--font-inter), system-ui" }} className="text-[10px] text-neo-dim">{t.code}</span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${statusClass(t.status)}`}>
                        {t.status === "active" ? "跟踪中" : t.status === "watching" ? "观察中" : "已关闭"}
                      </span>
                    </div>
                    <p className="mt-1 text-[12px] leading-relaxed text-neo-mid">{t.reason}</p>
                    {t.trigger && <p className="mt-1 text-[11px] text-neo-dim">卖出触发：{t.trigger}</p>}
                    {t.reviews && t.reviews.length > 0 && (
                      <p className="mt-1 text-[11px] text-neo-dim">最近复盘：{t.reviews[t.reviews.length - 1].date} · {t.reviews[t.reviews.length - 1].note}</p>
                    )}
                    {thesisReviewOpen[t.id] ? (
                      <div className="mt-2">
                        <textarea value={thesisReviewDraft[t.id] || ""} onChange={(e) => setThesisReviewDraft((prev) => ({ ...prev, [t.id]: e.target.value }))} rows={2} placeholder="记录本次复盘…" className="neo-input w-full resize-none rounded-md px-3 py-2 text-[12px]" />
                        <div className="mt-1 flex gap-2">
                          <button onClick={() => addReviewToThesis(t.id, thesisReviewDraft[t.id] || "")} className="neo-btn-primary rounded-md px-3 py-1 text-[11px]">保存复盘</button>
                          <button onClick={() => setThesisReviewOpen((prev) => ({ ...prev, [t.id]: false }))} className="neo-chip rounded-md px-3 py-1 text-[11px]">取消</button>
                        </div>
                      </div>
                    ) : (
                      <button onClick={() => setThesisReviewOpen((prev) => ({ ...prev, [t.id]: true }))} className="mt-1 text-[11px] text-neo-primary">记录复盘</button>
                    )}
                    <div className="mt-1 flex items-center gap-3">
                      <a href={stockHrefFor(t.code, t.market)} className="text-[11px] text-neo-primary hover:underline">个股页 →</a>
                      <button onClick={() => deleteThesis(t.id)} className="text-[11px] text-neo-dim transition-colors hover:text-neo-down">删除</button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
