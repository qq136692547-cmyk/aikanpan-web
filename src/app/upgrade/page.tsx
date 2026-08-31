"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { BadgeCheck, Crown, KeyRound, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { api } from "@/lib/api";
import { useMembership } from "@/lib/membership";

const FREE_FEATURES = [
  "基础行情与市场结构",
  "每日 AI 复盘（缓存可用时）",
  "每天 3 次有效 AI 调用",
];

const PRO_FEATURES = [
  "每日 AI 复盘与解读",
  "个股、组合与盘前计划 AI 诊断",
  "AI 批量评分与历史归档",
  "更高每日 AI 额度",
];

export default function UpgradePage() {
  const { membership, loading, refresh } = useMembership();
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "error">("ok");
  const [busy, setBusy] = useState(false);

  async function activate(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setMessage("请输入激活码");
      setMessageType("error");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await api.activateMembership(code.trim());
      await refresh(result, { revalidate: false });
      setMessage(result.plan === "pro" ? "Pro 已开通/续费成功" : "激活结果异常，请刷新后重试");
      setMessageType("ok");
      setCode("");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "激活码无效");
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  }

  const isPro = membership?.plan === "pro";

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-5xl flex-1 px-6 py-6">
        <section className="neo-card neo-fade-up p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <h1 className="text-[24px] font-bold tracking-tight text-neo-ink">爱看盘 Pro</h1>
              <p className="mt-1 max-w-xl text-[13px] leading-relaxed text-neo-dim">
                为复盘、研究、盯盘建立连续的 AI 工作流。订阅制按自然日重置额度，会员到期后自动回到免费版。
              </p>
            </div>
            <div className="neo-inset-sm min-w-[190px] rounded-md px-4 py-3">
              <div className="text-[11px] text-neo-dim">当前状态</div>
              <div className="mt-1 flex items-center gap-2 text-[14px] font-semibold text-neo-ink">
                <Crown size={16} style={{ color: isPro ? "var(--neo-primary)" : "var(--neo-dim)" }} />
                {loading && !membership ? "加载中…" : isPro ? "Pro 会员" : "免费版"}
              </div>
              {membership && (
                <div className="mt-1 text-[11px] text-neo-dim">
                  今日 AI：{membership.ai_used_today}/{membership.ai_daily_limit}
                  {isPro && membership.expires_at ? ` · ${membership.expires_at.slice(0, 10)} 到期` : ""}
                </div>
              )}
            </div>
          </div>
        </section>

        <section className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
          <div className="neo-card p-6">
            <div className="flex items-center gap-2">
              <Sparkles size={17} style={{ color: "var(--neo-dim)" }} />
              <h2 className="text-[17px] font-semibold text-neo-ink">免费版</h2>
            </div>
            <p className="mt-3 text-[13px] text-neo-mid">适合先体验看盘与复盘结构。</p>
            <ul className="mt-4 space-y-2.5">
              {FREE_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-neo-ink">
                  <BadgeCheck size={15} className="mt-0.5 shrink-0" style={{ color: "var(--neo-dim)" }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </div>

          <div className="neo-card relative overflow-hidden p-6" style={{ borderColor: "var(--neo-primary)" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap size={17} style={{ color: "var(--neo-primary)" }} />
                <h2 className="text-[17px] font-semibold text-neo-ink">Pro 会员</h2>
              </div>
              <span className="neo-chip px-2.5 py-1 text-[11px] text-neo-primary">订阅制</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-[30px] font-bold text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>29</span>
              <span className="text-[13px] text-neo-dim">元 / 30 天</span>
            </div>
            <ul className="mt-4 space-y-2.5">
              {PRO_FEATURES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-[13px] text-neo-ink">
                  <BadgeCheck size={15} className="mt-0.5 shrink-0" style={{ color: "var(--neo-primary)" }} />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 rounded-md bg-[var(--neo-surface-inset)] px-3 py-2.5 text-[12px] leading-relaxed text-neo-dim">
              支付入口接入前，可先通过人工渠道获取 30 天激活码；开通后立即生效。
            </p>
          </div>
        </section>

        <section className="neo-card mt-4 p-6">
          <div className="flex items-center gap-2">
            <KeyRound size={17} style={{ color: "var(--neo-primary)" }} />
            <h2 className="text-[17px] font-semibold text-neo-ink">激活码开通</h2>
          </div>
          <form onSubmit={activate} className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_150px]">
            <input
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="输入 Pro 激活码"
              className="neo-input w-full rounded-md px-3 py-2.5 text-[13px]"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={busy}
              className="neo-btn-primary rounded-md px-5 py-2.5 text-[13px] font-medium disabled:opacity-60"
            >
              {busy ? "激活中…" : "立即激活"}
            </button>
          </form>
          {message && (
            <p className={`mt-3 text-[12px] ${messageType === "ok" ? "text-neo-up" : "text-neo-down"}`}>{message}</p>
          )}
          {!isPro && (
            <p className="mt-3 text-[12px] text-neo-dim">
              还没有绑定手机号？先到 <Link href="/account" className="text-neo-primary">账户页</Link> 绑定，便于跨设备保留会员状态。
            </p>
          )}
        </section>

        <section className="neo-card mt-4 p-6">
          <div className="flex items-center gap-2">
            <ShieldCheck size={17} style={{ color: "var(--neo-dim)" }} />
            <h2 className="text-[17px] font-semibold text-neo-ink">合规说明</h2>
          </div>
          <p className="mt-3 text-[13px] leading-relaxed text-neo-dim">
            Pro 提供的是研究效率工具，不提供荐股、代客理财或收益保证。AI 输出可能存在偏差，重要决策请独立核实数据并自主判断。
          </p>
          <p className="mt-3 text-[11px] text-neo-dim">⚠ 本站 AI 内容由 AI 生成，不构成投资建议。</p>
        </section>
      </main>
      <Footer />
    </div>
  );
}
