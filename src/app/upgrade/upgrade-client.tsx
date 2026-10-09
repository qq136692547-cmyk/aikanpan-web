"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Crown,
  Zap,
  CheckCircle2,
  Clock3,
  ShieldCheck,
  TriangleAlert,
  KeyRound,
  ExternalLink,
  MessageCircle,
  Loader2,
  ArrowRight,
  Copy,
  RefreshCw,
  HelpCircle,
} from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { api } from "@/lib/api";
import { reportConversionEvent } from "@/lib/analytics";
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { isAlipayOrderPaid, isAlipayOrderRefused, resolveAlipayOrderStatus } from "@/lib/payment";

type PaymentConfirmation = "idle" | "checking" | "success" | "pending" | "error" | "refused";

export function UpgradePageClient({
  market = "cn",
  paySuccess = false,
  outTradeNo = "",
}: {
  market?: "cn" | "us";
  paySuccess?: boolean;
  outTradeNo?: string;
}) {
  const { user, isAuthenticated } = useAuth();
  const isRealUser = isAuthenticated && !!user?.type && user.type !== "guest";
  const { membership, refresh } = useMembership();

  const [paying, setPaying] = useState(false);
  const [payError, setPayError] = useState("");
  const [paymentConfirmation, setPaymentConfirmation] = useState<PaymentConfirmation>(
    paySuccess ? (outTradeNo ? "checking" : "error") : "idle"
  );
  const [paymentMessage, setPaymentMessage] = useState(
    paySuccess && !outTradeNo ? "支付回跳缺少订单号，暂时无法确认到账结果。" : ""
  );
  const [recoveryCode, setRecoveryCode] = useState<string>("");
  const [copied, setCopied] = useState(false);

  // 找回与激活
  const [activeTab, setActiveTab] = useState<"recover" | "activate">("recover");
  const [recoverInput, setRecoverInput] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activateMsg, setActivateMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!paySuccess || !outTradeNo) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const verifyOrder = async (attempt: number) => {
      if (cancelled) return;
      try {
        const res = await api.checkAlipayOrderStatus(outTradeNo);
        if (cancelled) return;

        // 后端 status 是归一化值（PAID / REFUSED），必须优先看 raw_status 才能拿到真实交易状态
        const orderStatus = resolveAlipayOrderStatus(res?.data?.status, res?.data?.raw_status);

        // 已实付但被拒发（限购一次 / 年卡权益已达成后的重复购买）→ 立即停止轮询并明确告知退款去向
        if (res && res.ok && isAlipayOrderRefused(orderStatus)) {
          setPaymentConfirmation("refused");
          setPaymentMessage(
            res.data.message ||
              "该笔款项已收到，但本次未能开通。我们会尽快为您办理原路退回，您也可联系客服协助处理。"
          );
          return;
        }

        if (res && res.ok && isAlipayOrderPaid(orderStatus)) {
          setPaymentConfirmation("success");
          setPaymentMessage("您的 Pro 会员权益已成功开通！");
          reportConversionEvent("activation_success", { source: "pay_return" });
          if (res.data.recovery_code) {
            setRecoveryCode(res.data.recovery_code);
          }
          refresh();
          return;
        }

        if (attempt < 45) {
          setPaymentConfirmation("checking");
          timer = setTimeout(() => verifyOrder(attempt + 1), 2000);
          return;
        }

        setPaymentConfirmation("pending");
        setPaymentMessage("支付已受理，到账确认中。若几分钟后仍未点亮会员，可凭订单号自助找回。");
      } catch (error: unknown) {
        if (cancelled) return;
        if (attempt < 5) {
          timer = setTimeout(() => verifyOrder(attempt + 1), 2000);
          return;
        }
        setPaymentConfirmation("error");
        setPaymentMessage(
          error instanceof Error && error.message
            ? error.message
            : "暂时无法确认支付结果，请稍后刷新页面。"
        );
      }
    };

    verifyOrder(0);
    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [paySuccess, outTradeNo, refresh]);

  // P0-1: 转化漏斗埋点 —— 付费页曝光，每次挂载只发一次
  const exposureFiredRef = useRef(false);
  useEffect(() => {
    if (exposureFiredRef.current) return;
    exposureFiredRef.current = true;
    reportConversionEvent("upgrade_exposure");
  }, []);

  const [selectedPlan, setSelectedPlan] = useState<"trial" | "monthly" | "quarterly">("quarterly");

  const handleAlipay = async (plan: "trial" | "monthly" | "quarterly" = selectedPlan) => {
    // P0-1: 点击即报（在登录门槛判定之前——点击意愿本身是漏斗信号）
    reportConversionEvent("upgrade_click", { source: plan });
    setPayError("");
    if (!isRealUser) {
      setPayError("下单前需先绑定邮箱或手机号，否则付款后激活码无法绑定到可恢复的账号。请先在用户中心完成绑定。");
      return;
    }
    setPaying(true);
    try {
      const res = await api.createAlipayOrder(plan);
      if (res && res.data && res.data.pay_url) {
        window.location.href = res.data.pay_url;
      } else {
        setPayError("创建支付订单失败，请稍后重试");
        setPaying(false);
      }
    } catch (error: unknown) {
      setPayError(
        error instanceof Error && error.message
          ? error.message
          : "支付服务暂时不可用，请稍后重试"
      );
      setPaying(false);
    }
  };

  const handleRecover = async (e: FormEvent) => {
    e.preventDefault();
    if (!recoverInput.trim()) return;
    setRecovering(true);
    setRecoverMsg(null);
    try {
      const res = await api.recoverMembership(recoverInput.trim());
      if (res && res.success) {
        setRecoverMsg({
          type: "ok",
          text: res.message || "会员资格已成功恢复至当前设备！",
        });
        reportConversionEvent("activation_success", { source: "recover" });
        if (res.recovery_code) {
          setRecoveryCode(res.recovery_code);
        }
        setRecoverInput("");
        refresh();
      } else {
        setRecoverMsg({
          type: "err",
          text: res.message || "未能找到匹配的已付款有效订单",
        });
      }
    } catch (error: unknown) {
      setRecoverMsg({
        type: "err",
        text:
          error instanceof Error && error.message
            ? error.message
            : "找回服务暂时不可用，请核对凭证后重试",
      });
    } finally {
      setRecovering(false);
    }
  };

  const handleActivate = async (e: FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setActivating(true);
    setActivateMsg(null);
    try {
      await api.activateMembership(code.trim().toUpperCase());
      setActivateMsg({ type: "ok", text: "激活成功！Pro 会员时长已生效。" });
      reportConversionEvent("activation_success", { source: "activate_code" });
      setCode("");
      refresh();
    } catch (error: unknown) {
      setActivateMsg({
        type: "err",
        text:
          error instanceof Error && error.message
            ? error.message
            : "激活码无效或已被使用",
      });
    } finally {
      setActivating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPro = membership?.plan === "pro";
  const freeDailyLimit = membership?.ai_daily_limit ?? 5;
  const freeRemaining = Math.max(0, freeDailyLimit - (membership?.ai_used_today ?? 0));
  const paymentTone =
    paymentConfirmation === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : paymentConfirmation === "refused"
        ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
        : paymentConfirmation === "error"
          ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
          : paymentConfirmation === "pending"
            ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
            : "border-blue-500/30 bg-blue-500/10 text-blue-400";
  const paymentTitle =
    paymentConfirmation === "success"
      ? "支付成功，Pro 会员已自动激活！"
      : paymentConfirmation === "refused"
        ? "本次未能开通，费用将原路退回"
        : paymentConfirmation === "error"
          ? "暂时无法确认支付结果"
          : paymentConfirmation === "pending"
            ? "支付结果确认中"
            : "正在确认支付结果";
  const paymentDescription =
    paymentConfirmation === "success"
      ? "您的有效时长已实时生效，欢迎体验深度量化数据分析。"
      : paymentMessage || "请勿重复付款，通常几秒内即可完成确认。";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        {paymentConfirmation !== "idle" && (
          <div className={`mb-6 rounded-xl border p-4 ${paymentTone} shadow-sm`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                {paymentConfirmation === "checking" && (
                  <Loader2 className="h-6 w-6 shrink-0 animate-spin" />
                )}
                {paymentConfirmation === "success" && (
                  <CheckCircle2 className="h-6 w-6 shrink-0" />
                )}
                {paymentConfirmation === "pending" && (
                  <Clock3 className="h-6 w-6 shrink-0" />
                )}
                {paymentConfirmation === "error" && (
                  <TriangleAlert className="h-6 w-6 shrink-0" />
                )}
                {paymentConfirmation === "refused" && (
                  <MessageCircle className="h-6 w-6 shrink-0" />
                )}
                <div>
                  <p className="font-semibold text-sm">{paymentTitle}</p>
                  <p className="text-xs opacity-90">{paymentDescription}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentConfirmation("idle")}
                className="inline-flex min-h-11 items-center px-2 text-xs underline hover:opacity-80 cursor-pointer"
              >
                关闭
              </button>
            </div>

            {/* 专属会员找回凭据卡片 */}
            {paymentConfirmation === "success" && (
              <div className="mt-4 rounded-lg border border-emerald-500/20 bg-neutral-950/80 p-3.5 text-neutral-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-neutral-800 pb-2.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
                    <ShieldCheck className="h-4 w-4" />
                    <span>您的专属会员找回凭据（防重装系统丢失）</span>
                  </div>
                  {recoveryCode && (
                    <button
                      onClick={() => copyToClipboard(recoveryCode)}
                      className="inline-flex items-center gap-1.5 rounded bg-emerald-500/20 px-2.5 py-1 text-xs font-mono font-medium text-emerald-300 hover:bg-emerald-500/30 cursor-pointer"
                    >
                      <Copy className="h-3.5 w-3.5" />
                      {copied ? "已复制凭证" : `恢复码：${recoveryCode} (点击复制)`}
                    </button>
                  )}
                </div>
                <div className="mt-2.5 text-[11px] text-neutral-400 leading-relaxed">
                  <p>• <b>重装系统或换电脑防丢保障</b>：如清理了浏览器缓存或更换设备，在本页面凭上述<b>【恢复码】</b>或支付宝账单里的<b>【商户订单号：{outTradeNo || "见支付宝账单"}】</b>均可自助找回并恢复。</p>
                  <p className="mt-1">• <b>多端同步</b>：您也可前往 <Link href="/account" className="text-emerald-400 underline hover:text-emerald-300">用户中心绑定手机号</Link>，实现手机与多台电脑永久云同步。</p>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400">
            <Crown className="h-3.5 w-3.5" /> 软件增值量化分析权限
          </span>
          <h1 className="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            升级爱看盘 Pro 会员
          </h1>
          <p className="mx-auto mt-2 max-w-xl text-xs text-neutral-400 sm:text-sm">
            连续使用三地市场 AI 复盘、个股诊断、批量评分与持仓研究
          </p>

          {/* 站点可信信息：决策当场可见（备案可核验 / 资质边界 / 真人客服） */}
          <div className="mx-auto mt-3.5 flex max-w-2xl flex-wrap items-center justify-center gap-x-4 gap-y-1.5 text-[11px] text-neutral-400">
            <a
              href="https://beian.miit.gov.cn/"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 transition hover:text-neutral-200"
            >
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
              渝ICP备2026014729号-1 · 工信部官网可核验
            </a>
            <span className="inline-flex items-center gap-1">
              <ShieldCheck className="h-3.5 w-3.5 text-neutral-500" />
              无证券投资咨询资格 · 仅提供行情数据与统计研究
            </span>
            <span className="inline-flex items-center gap-1">
              <HelpCircle className="h-3.5 w-3.5 text-neutral-500" />
              真人客服：微信 denglio0
            </span>
          </div>
        </div>

        {/* 当前账户状态栏 */}
        <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4 sm:p-5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-neutral-800 text-neutral-300">
                <Zap className="h-5 w-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">当前：</span>
                  {isPro ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                      <Crown className="h-3 w-3" /> Pro 会员 (有效)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-400">
                      免费版 · 今日剩余 {freeRemaining} 次
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  {isPro && membership?.expires_at
                    ? `会员有效期至：${membership.expires_at.replace("T", " ").slice(0, 16)} · 每日可反复使用 AI 分析（上限 500 次）`
                    : "每日 3 次 AI 分析，可用于复盘、个股诊断与批量评分"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => refresh()}
                className="inline-flex items-center gap-1.5 rounded-lg border border-neutral-800 bg-neutral-900 px-3 py-1.5 text-xs text-neutral-300 hover:border-neutral-700 hover:text-white transition cursor-pointer"
                title="刷新状态"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                刷新
              </button>
              {!isRealUser && (
                <Link
                  href="/account"
                  className="inline-flex items-center gap-1 rounded-lg bg-neutral-800 px-3 py-1.5 text-xs font-medium text-white hover:bg-neutral-700 transition"
                >
                  绑定手机号
                </Link>
              )}
            </div>
          </div>
        </div>

        {payError && (
          <div className="mt-5 flex items-start gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 text-left">
            <TriangleAlert className="mt-0.5 h-5 w-5 shrink-0 text-rose-400" />
            <div className="flex-1">
              <p className="text-sm font-semibold text-rose-300">无法发起本次下单</p>
              <p className="mt-1 text-xs leading-relaxed text-neutral-300">{payError}</p>
              {!isRealUser && (
                <Link
                  href="/account"
                  className="mt-2 inline-flex items-center rounded-lg border border-rose-500/40 bg-rose-500/10 px-3 py-1.5 text-xs font-medium text-rose-200 transition hover:bg-rose-500/20"
                >
                  前往用户中心绑定
                </Link>
              )}
            </div>
            <button
              onClick={() => setPayError("")}
              className="inline-flex min-h-11 items-center px-2 text-xs underline hover:opacity-80 cursor-pointer"
            >
              关闭
            </button>
          </div>
        )}

        <div className="mt-5 flex items-start gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-left">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-emerald-400" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">支付宝付款后自动开通，所有时长卡权益一致</p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-300">
              支付宝扫码付款后系统自动开通会员权益并同时发放恢复码，不自动续费、不自动扣款。购买前请先绑定邮箱或手机号。
            </p>
            <p className="mt-1 text-xs leading-relaxed text-neutral-300">
              开通保障：若付款后会员权益未自动点亮，可先用支付宝商户订单号在上方自助找回；仍无法开通的，请通过微信 denglio0 或邮箱 qq136692547@gmail.com 提供订单号，我们会核实订单与权益状态后处理。售后条款见<Link href="/terms/" className="text-neutral-300 underline hover:text-white">《用户协议》售后章节</Link>。
            </p>
            <p className="mt-1.5 text-[11px] leading-relaxed text-neutral-400">
              服务边界：行情数据取自第三方公开接口，可能存在延迟或缺失；AI 内容由大语言模型生成，可能存在错误。本站不提供买卖建议、不承诺收益，据此操作盈亏自负。
            </p>
          </div>
        </div>

        {/* 定价卡片 */}
        <div className="mt-8 grid grid-cols-1 gap-5 sm:grid-cols-2">
          {/* 季度会员（C 位主推） */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-amber-500/60 bg-gradient-to-b from-amber-950/20 to-neutral-900/80 p-5 shadow-xl shadow-amber-500/5 sm:col-span-2 sm:mx-auto sm:max-w-2xl sm:w-full">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-0.5 text-[10px] font-bold text-black tracking-wide uppercase shadow">
              推荐方案
            </div>

            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-amber-400" />
                  季度 Pro 会员
                </h2>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-300">
                  立省 8 元
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-amber-400 font-mono">¥49</span>
                <span className="text-xs text-neutral-400">/ 季 (90 天)</span>
                <span className="ml-1 text-[11px] text-neutral-500 line-through font-mono">¥57</span>
              </div>
              <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
                90 天连续使用，适合连续三个月的复盘与盯盘。
              </p>
              <ul className="mt-4 space-y-2 text-xs text-neutral-200 font-medium">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>AI 复盘、个股诊断与批量评分</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>自然语言盯盘提醒与触发记录</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-amber-400 shrink-0" />
                  <span>持仓研究与研究记录</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-amber-500/20">
              <button
                onClick={() => handleAlipay("quarterly")}
                disabled={paying}
                className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 px-3 py-2.5 text-xs font-bold text-black shadow-lg shadow-amber-500/20 hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition cursor-pointer"
              >
                {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 fill-black" />}
                ¥49 开通 90 天
              </button>
            </div>
          </div>

          {/* 更多方案：月卡 / 年卡（折叠） */}
          <details className="sm:col-span-2 rounded-2xl border border-neutral-800 bg-neutral-900/40">
            <summary className="cursor-pointer select-none px-5 py-4 text-sm font-semibold text-neutral-300 transition hover:text-white">
              更多方案（30 天 / 365 天）
            </summary>
            <div className="grid grid-cols-1 gap-5 px-5 pb-5 sm:grid-cols-2">

          {/* 更多方案 #1：月度会员 */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm hover:border-neutral-700 transition">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white">月度会员</h2>
                <span className="text-xs text-neutral-400">30 天标准版</span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-white font-mono">¥19.9</span>
                <span className="text-xs text-neutral-400">/ 月</span>
                <span className="ml-1 text-[11px] text-neutral-500 font-mono">约 0.66 元/天</span>
              </div>
              <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                适合按月使用 AI 复盘、个股诊断与盯盘提醒。
              </p>
              <ul className="mt-4 space-y-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>包含 Pro 全部 AI 分析权益</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>自然语言盯盘提醒</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
                  <span>个股研究笔记与跟踪看板</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800/80">
              <button
                onClick={() => handleAlipay("monthly")}
                disabled={paying}
                className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-neutral-800 px-3 py-2.5 text-xs font-semibold text-white hover:bg-neutral-700 active:scale-[0.99] disabled:opacity-50 transition cursor-pointer"
              >
                {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-blue-400" />}
                ¥19.9 开通 30 天
              </button>
            </div>
          </div>

          {/* 更多方案 #2：年度时长方案（3 笔季卡累计） */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-purple-500/40 bg-gradient-to-b from-purple-950/20 to-neutral-900/60 p-5 shadow-sm hover:border-purple-500/60 transition">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-base font-bold text-white flex items-center gap-1.5">
                  <Crown className="h-4 w-4 text-purple-400" />
                  年度时长方案
                </h2>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 text-[10px] font-semibold text-purple-300">
                  累计 365 天
                </span>
              </div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="text-2xl font-extrabold text-white font-mono">¥49</span>
                <span className="text-xs text-neutral-400">× 3 笔</span>
                <span className="ml-1 text-[11px] text-purple-400 font-medium font-mono">折合约 12.3 元/月</span>
              </div>
              <p className="mt-2 text-xs text-neutral-400 leading-relaxed">
                48 小时内完成 3 笔季卡支付（实付 ¥147），系统自动补赠 95 天，累计 365 天。
              </p>
              <ul className="mt-4 space-y-2 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>365 天 Pro 权益，均不自动续费</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-3.5 w-3.5 text-purple-400 shrink-0" />
                  <span>3 笔季卡支付后自动合并时长</span>
                </li>
              </ul>
            </div>

            <div className="mt-6 pt-4 border-t border-neutral-800/80">
              <button
                onClick={() => handleAlipay("quarterly")}
                disabled={paying}
                className="flex min-h-10 w-full items-center justify-center gap-1.5 rounded-xl bg-purple-600/30 border border-purple-500/50 px-3 py-2.5 text-xs font-semibold text-purple-200 hover:bg-purple-600/40 active:scale-[0.99] disabled:opacity-50 transition cursor-pointer"
              >
                {paying ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Zap className="h-3.5 w-3.5 text-purple-400" />}
                ¥49 开通 90 天
              </button>
            </div>
          </div>
            </div>
          </details>
        </div>

        {/* 售后入口 */}
        <div className="mt-6 rounded-xl border border-neutral-800 bg-neutral-900/40 p-4">
          <div className="flex items-start gap-2">
            <HelpCircle className="h-4 w-4 shrink-0 text-neutral-400 mt-0.5" />
            <div className="text-xs leading-relaxed text-neutral-400">
              <p className="font-semibold text-neutral-300">付款后有问题怎么办？</p>
              <p className="mt-1">
                ① 权益未自动点亮：先在上方「输入激活码兑换 / 换电脑自助找回」里输入恢复码或支付宝商户订单号自助恢复；
              </p>
              <p className="mt-1">
                ② 仍无法开通：请通过微信 denglio0 或邮箱 qq136692547@gmail.com 提供支付宝商户订单号，我们会核实订单与权益状态后处理，详见<Link href="/terms/" className="text-neutral-300 underline hover:text-white">《用户协议》售后章节</Link>。
              </p>
            </div>
          </div>
        </div>

        {/* 核心双保险保障：找回会员 & 激活码激活 */}
        <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 sm:p-6 shadow-sm">
          {/* Tab 切换 */}
          <div className="flex border-b border-neutral-800 pb-3 gap-6">
            <button
              onClick={() => setActiveTab("recover")}
              className={`flex items-center gap-2 text-sm font-semibold pb-2 -mb-3 transition border-b-2 cursor-pointer ${
                activeTab === "recover"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              <ShieldCheck className="h-4 w-4" />
              换电脑/重装系统自助找回
            </button>
            <button
              onClick={() => setActiveTab("activate")}
              className={`flex items-center gap-2 text-sm font-semibold pb-2 -mb-3 transition border-b-2 cursor-pointer ${
                activeTab === "activate"
                  ? "border-blue-500 text-blue-400"
                  : "border-transparent text-neutral-400 hover:text-white"
              }`}
            >
              <KeyRound className="h-4 w-4" />
              输入激活码兑换
            </button>
          </div>

          {/* Tab 1: 自助找回 */}
          {activeTab === "recover" && (
            <div className="mt-4">
              <p className="text-xs text-neutral-300">
                如果您清理了浏览器、重装了系统或换了新设备，输入购买时的<b>【支付宝订单号】</b>或专属<b>【恢复码】</b>，即可一键将 Pro 权益恢复至当前设备：
              </p>
              <form onSubmit={handleRecover} className="mt-3 flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  aria-label="输入找回凭证"
                  value={recoverInput}
                  onChange={(e) => setRecoverInput(e.target.value.trim())}
                  placeholder="请输入恢复码 (如 AKP-xxxx-xxxx) 或 支付宝商户单号"
                  className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 font-mono"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={recovering || !recoverInput.trim()}
                  className="min-h-11 rounded-lg border border-neutral-700 bg-neutral-900 px-5 text-xs font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white disabled:opacity-50 shrink-0 cursor-pointer"
                >
                  {recovering ? "正在核验订单..." : "立即找回会员"}
                </button>
              </form>

              {recoverMsg && (
                <p className={`mt-2.5 text-xs font-medium ${recoverMsg.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
                  {recoverMsg.text}
                </p>
              )}

              <div className="mt-3 flex items-start gap-1.5 text-[11px] text-neutral-400">
                <HelpCircle className="h-3.5 w-3.5 shrink-0 text-neutral-400 mt-0.5" />
                <span>
                  如何查找订单号？打开手机支付宝 ➔「我的」➔「账单」➔ 找到爱看盘支付记录 ➔ 查看<b>【商家订单号】</b>即可。
                </span>
              </div>
            </div>
          )}

          {/* Tab 2: 激活码兑换 */}
          {activeTab === "activate" && (
            <div className="mt-4">
              <p className="text-xs text-neutral-300">
                如果您拥有赠品激活码或年卡专属卡密，请在下方输入激活：
              </p>
              <form onSubmit={handleActivate} className="mt-3 flex flex-col sm:flex-row gap-2.5">
                <input
                  type="text"
                  aria-label="输入激活码"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder="请输入激活码（如 AKP-XXXX-XXXX）"
                  className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-sm text-white outline-none focus:border-blue-500 font-mono"
                  autoComplete="off"
                />
                <button
                  type="submit"
                  disabled={activating || !code.trim() || !isRealUser}
                  className="min-h-11 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50 transition shrink-0 cursor-pointer"
                >
                  {activating ? "正在验证…" : "立即激活"}
                </button>
              </form>

              {activateMsg && (
                <p className={`mt-2.5 text-xs font-medium ${activateMsg.type === "ok" ? "text-emerald-400" : "text-rose-400"}`}>
                  {activateMsg.text}
                </p>
              )}

              {!isRealUser && (
                <p className="mt-2 text-[11px] text-amber-400">
                  * 提示：激活前请先登录账号，激活成功后权益将直接绑定至当前账号。
                </p>
              )}
            </div>
          )}
        </div>

        {/* 底部免责声明 */}
        <div className="mt-8 rounded-lg border border-neutral-800/80 p-4 text-center text-xs text-neutral-400">
          <p className="flex items-center justify-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-neutral-400" />
            服务说明：爱看盘为行情数据与研究辅助工具软件，不提供任何投资收益保证，请自主决策。
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
