"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  BookOpenCheck,
  Crown,
  Gauge,
  GraduationCap,
  KeyRound,
  ListChecks,
  MessageCircle,
  ShieldCheck,
  ShoppingBag,
  Sparkles,
  X,
  Zap,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { api } from "@/lib/api";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { reportConversionEvent, type UpgradeProfile } from "@/lib/analytics";

const FREE_FEATURES = [
  "基础行情与市场结构",
  "每日 AI 复盘（缓存可用时）",
  "每天 5 次有效 AI 调用",
];

const PRO_FEATURES = [
  "每日 AI 复盘与解读",
  "个股、组合与盘前计划 AI 诊断",
  "AI 批量评分与历史归档",
  "更高每日 AI 额度",
];
const QR_CARDS = [
  { key: "monthly" as const, src: "/images/xianyu-qr-monthly.png", alt: "闲鱼月卡商品二维码", title: "月卡 ¥29 · 扫码直达闲鱼" },
  { key: "annual" as const, src: "/images/xianyu-qr-annual.png", alt: "闲鱼年卡商品二维码", title: "年卡 ¥299 · 扫码直达闲鱼" },
];
const COMPARE_ROWS = [
  { label: "每日有效 AI 调用", free: "5 次", pro: "500 次" },
  { label: "每日 AI 复盘", free: "缓存可用时", pro: "每日更新" },
  { label: "个股 / 组合 / 盘前计划 AI 诊断", free: "—", pro: "✓" },
  { label: "AI 批量评分与历史归档", free: "—", pro: "✓" },
  { label: "有效期", free: "—", pro: "30 天 / 365 天，可叠加" },
];

const USER_PROFILES = [
  {
    id: "intraday" as UpgradeProfile,
    title: "短线盯盘",
    icon: Gauge,
    summary: "聚焦盘面结构、涨跌停变化和盯盘提醒。",
    free: ["涨跌停与市场结构", "盯盘提醒管理", "自选股联动"],
    pro: ["AI 批量评分", "盘前计划诊断", "更高 AI 复盘额度"],
    href: "/alerts",
    action: "进入盯盘",
  },
  {
    id: "longterm" as UpgradeProfile,
    title: "中长线研究",
    icon: BookOpenCheck,
    summary: "围绕财务、事件、论点和组合做连续研究。",
    free: ["基础财务与历史行情", "研究论点记录", "组合持仓管理"],
    pro: ["个股 AI 深度解读", "组合 AI 复盘", "研究计划 AI 梳理"],
    href: "/research/",
    action: "进入研究",
  },
  {
    id: "beginner" as UpgradeProfile,
    title: "新手学习",
    icon: GraduationCap,
    summary: "从每日结构和复盘框架开始，降低理解门槛。",
    free: ["每日复盘结构", "市场温度概览", "基础行情检索"],
    pro: ["AI 复盘通俗解读", "个股 AI 诊断示例", "更多学习式分析"],
    href: "/review/",
    action: "进入复盘",
  },
];

export function UpgradePageClient({ market }: { market: "cn" | "us" }) {
  const { membership, loading, refresh } = useMembership();
  const { user } = useAuth();
  const [profile, setProfile] = useState<UpgradeProfile>("intraday");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"ok" | "error">("ok");
  const [busy, setBusy] = useState(false);
  const [qrPreview, setQrPreview] = useState<"monthly" | "annual" | null>(null);
  const exposureReported = useRef(false);

  useEffect(() => {
    if (exposureReported.current) return;
    exposureReported.current = true;
    reportConversionEvent("upgrade_exposure", { profile });
  }, [profile]);

  function selectProfile(next: UpgradeProfile) {
    setProfile(next);
    reportConversionEvent("upgrade_profile_select", { profile: next });
  }

  async function activate(e: FormEvent) {
    e.preventDefault();
    if (!code.trim()) {
      setMessage("请输入激活码");
      setMessageType("error");
      return;
    }
    reportConversionEvent("upgrade_click", { profile });
    setBusy(true);
    setMessage("");
    try {
      const result = await api.activateMembership(code.trim());
      await refresh(result, { revalidate: false });
      if (result.plan === "pro") {
        reportConversionEvent("activation_success", { profile });
        const expiry = result.expires_at ? `，${result.expires_at.slice(0, 10)} 到期` : "";
        setMessage(`Pro 已开通/续费成功${expiry}，时长自动叠加`);
        setMessageType("ok");
        setCode("");
      } else {
        setMessage("激活结果异常，请刷新后重试");
        setMessageType("error");
      }
    } catch (err) {
      const raw = err instanceof Error ? err.message : "";
      if (/401|authorization|token/i.test(raw)) {
        setMessage("请先登录后再激活，登录后重新输入激活码即可");
      } else {
        setMessage(raw || "激活码无效");
      }
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

        <section aria-label="用户画像" className="mt-4">
        {!isPro && membership && membership.ai_used_today >= membership.ai_daily_limit && (
          <section className="neo-card mt-4 flex flex-wrap items-center gap-3 p-4" style={{ borderColor: "var(--neo-primary)" }}>
            <Zap size={16} style={{ color: "var(--neo-primary)" }} />
            <span className="text-[13px] text-neo-ink">
              今日免费额度已用完（{membership.ai_used_today}/{membership.ai_daily_limit}），升级 Pro 解锁每日 500 次 AI 调用。
            </span>
            <a href="#plans" className="neo-btn-primary ml-auto rounded-md px-3 py-1.5 text-[12px] font-medium">查看方案</a>
          </section>
        )}

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            {USER_PROFILES.map((item) => {
              const selected = profile === item.id;
              const Icon = item.icon;
              return (
                <article
                  key={item.id}
                  className="neo-card flex h-full flex-col p-5"
                  style={selected ? { borderColor: "var(--neo-primary)" } : undefined}
                >
                  <div className="flex items-center gap-2">
                    <Icon size={17} style={{ color: selected ? "var(--neo-primary)" : "var(--neo-dim)" }} />
                    <h2 className="text-[17px] font-semibold text-neo-ink">{item.title}</h2>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-neo-mid">{item.summary}</p>

                  <div className="mt-4">
                    <div className="text-[11px] font-medium text-neo-dim">免费可用</div>
                    <ul className="mt-2 space-y-1.5">
                      {item.free.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-[12px] text-neo-ink">
                          <BadgeCheck size={13} className="mt-0.5 shrink-0" style={{ color: "var(--neo-dim)" }} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-4">
                    <div className="text-[11px] font-medium text-neo-primary">Pro 加值</div>
                    <ul className="mt-2 space-y-1.5">
                      {item.pro.map((feature) => (
                        <li key={feature} className="flex items-start gap-2 text-[12px] text-neo-ink">
                          <BadgeCheck size={13} className="mt-0.5 shrink-0" style={{ color: "var(--neo-primary)" }} />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-[var(--neo-border)] pt-4">
                    <button
                      type="button"
                      onClick={() => selectProfile(item.id)}
                      className={`rounded-md px-3 py-2 text-[12px] font-medium transition-all ${selected ? "neo-chip-active" : "neo-chip"}`}
                    >
                      {selected ? "当前画像" : "选择画像"}
                    </button>
                    <Link
                      href={`${item.href}${item.href.includes("?") ? "&" : "?"}market=${market}`}
                      onClick={() => reportConversionEvent("upgrade_click", { profile: item.id })}
                      className="neo-btn-primary ml-auto rounded-md px-3 py-2 text-[12px] font-medium"
                    >
                      {item.action}
                    </Link>
                  </div>
                </article>
              );
            })}
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
              可在闲鱼搜索"爱看盘激活码"购买，或加微信 denglio0 获取。开通后立即生效。
            </p>
          </div>
        </section>
        <section id="plans" className="mt-4 grid grid-cols-1 gap-4 lg:grid-cols-3">
          <div className="neo-card p-6">
            <div className="flex items-center gap-2">
              <Sparkles size={17} style={{ color: "var(--neo-dim)" }} />
              <h2 className="text-[17px] font-semibold text-neo-ink">免费版</h2>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-[30px] font-bold text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>0</span>
              <span className="text-[13px] text-neo-dim">元</span>
            </div>
            <p className="mt-3 text-[13px] text-neo-mid">适合先体验看盘与复盘结构。</p>
          </div>

          <div className="neo-card relative overflow-hidden p-6">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Zap size={17} style={{ color: "var(--neo-primary)" }} />
                <h2 className="text-[17px] font-semibold text-neo-ink">Pro 月卡</h2>
              </div>
              <span className="neo-chip px-2.5 py-1 text-[11px] text-neo-primary">订阅制</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-[30px] font-bold text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>29</span>
              <span className="text-[13px] text-neo-dim">元 / 30 天</span>
            </div>
            <p className="mt-3 text-[13px] text-neo-mid">短线盯盘与日常复盘的主力选择。</p>
          </div>

          <div className="neo-card relative overflow-hidden p-6" style={{ borderColor: "var(--neo-primary)" }}>
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Crown size={17} style={{ color: "var(--neo-primary)" }} />
                <h2 className="text-[17px] font-semibold text-neo-ink">Pro 年卡</h2>
              </div>
              <span className="neo-chip px-2.5 py-1 text-[11px] text-neo-primary">主推</span>
            </div>
            <div className="mt-4 flex items-baseline gap-1.5">
              <span className="text-[30px] font-bold text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>299</span>
              <span className="text-[13px] text-neo-dim">元 / 365 天</span>
            </div>
            <p className="mt-1.5 text-[12px] text-neo-dim">≈ ¥24.9/月 · 较月卡立省 ¥149</p>
            <p className="mt-3 text-[13px] text-neo-mid">中长线研究与连续学习的首选。</p>
          </div>
        </section>

        <section className="neo-card mt-4 p-6">
          <div className="flex items-center gap-2">
            <ListChecks size={17} style={{ color: "var(--neo-primary)" }} />
            <h2 className="text-[17px] font-semibold text-neo-ink">权益对照</h2>
          </div>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="text-left text-[12px] text-neo-dim">
                  <th className="py-2 pr-4 font-medium">权益</th>
                  <th className="py-2 pr-4 font-medium">免费版</th>
                  <th className="py-2 font-medium text-neo-primary">Pro</th>
                </tr>
              </thead>
              <tbody>
                {COMPARE_ROWS.map((row) => (
                  <tr key={row.label} className="border-t border-[var(--neo-border)]">
                    <td className="py-2.5 pr-4 text-neo-ink">{row.label}</td>
                    <td className="py-2.5 pr-4 text-neo-dim">{row.free}</td>
                    <td className="py-2.5 text-neo-ink">{row.pro}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section className="neo-card mt-4 p-6">
          <div className="flex items-center gap-2">
            <ShoppingBag size={17} style={{ color: "var(--neo-primary)" }} />
            <h2 className="text-[17px] font-semibold text-neo-ink">如何购买</h2>
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
            {[
              { icon: ShoppingBag, title: "闲鱼拍下", desc: "搜索「爱看盘激活码」，按需选择月卡 ¥29/30天 或 年卡 ¥299/365天。" },
              { icon: MessageCircle, title: "获取激活码", desc: "付款后在闲鱼聊天或微信（denglio0）收到激活码。" },
              { icon: KeyRound, title: "本页兑换", desc: "在下方输入激活码立即开通，时长自动叠加。" },
            ].map((step) => {
              const StepIcon = step.icon;
              return (
                <div key={step.title} className="neo-inset-sm rounded-md p-4">
                  <div className="flex items-center gap-2">
                    <StepIcon size={15} style={{ color: "var(--neo-primary)" }} />
                    <span className="text-[13px] font-semibold text-neo-ink">{step.title}</span>
                  </div>
                  <p className="mt-2 text-[12px] leading-relaxed text-neo-mid">{step.desc}</p>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-[12px] text-neo-dim">激活码不区分大小写；兑换前请先登录，会员状态与账号绑定。</p>
          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
            {QR_CARDS.map((card) => (
              <div key={card.key} className="neo-inset-sm flex items-center gap-4 rounded-md p-4">
                <button
                  type="button"
                  onClick={() => setQrPreview(card.key)}
                  className="shrink-0 cursor-zoom-in"
                  aria-label={`放大${card.alt}`}
                >
                  <img loading="lazy" src={card.src} alt={card.alt} className="w-24 rounded-md" />
                </button>
                <div>
                  <div className="text-[13px] font-semibold text-neo-ink">{card.title}</div>
                  <p className="mt-1 text-[12px] leading-relaxed text-neo-mid">保存图片到相册，打开闲鱼「扫一扫」进入商品页。</p>
                  <p className="mt-1 text-[11px] text-neo-dim">点击图片可放大</p>
                </div>
              </div>
            ))}
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
          {!user && (
            <p className="mt-3 text-[12px] text-neo-down">激活前请先登录，登录后重新输入激活码即可。</p>
          )}
          <p className="mt-3 text-[12px] text-neo-dim">
            可在闲鱼搜索"爱看盘激活码"购买，或加微信 denglio0 获取。开通后立即生效，时长自动叠加。
          </p>
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
      {qrPreview && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-6"
          role="dialog"
          aria-modal="true"
          onClick={() => setQrPreview(null)}
        >
          <div className="relative" onClick={(event) => event.stopPropagation()}>
            <img
              src={qrPreview === "monthly" ? "/images/xianyu-qr-monthly.png" : "/images/xianyu-qr-annual.png"}
              alt={qrPreview === "monthly" ? "闲鱼月卡商品二维码" : "闲鱼年卡商品二维码"}
              className="max-h-[85vh] max-w-[90vw] rounded-lg object-contain"
            />
            <button
              type="button"
              onClick={() => setQrPreview(null)}
              aria-label="关闭"
              className="absolute -right-2 -top-2 rounded-full bg-white p-1.5 shadow"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
