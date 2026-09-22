"use client";

import { useEffect, useState, type FormEvent } from "react";
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
import { useMembership } from "@/lib/membership";
import { useAuth } from "@/lib/auth";
import { isAlipayOrderPaid } from "@/lib/payment";

type PaymentConfirmation = "idle" | "checking" | "success" | "pending" | "error";

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

        if (res && res.ok && isAlipayOrderPaid(res.data.status)) {
          setPaymentConfirmation("success");
          setPaymentMessage("您的 Pro 会员权益已成功开通！");
          if (res.data.recovery_code) {
            setRecoveryCode(res.data.recovery_code);
          }
          refresh();
          return;
        }

        if (attempt < 8) {
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

  const handleAlipay = async () => {
    setPayError("");
    setPaying(true);
    try {
      const res = await api.createAlipayOrder("monthly");
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
  const paymentTone =
    paymentConfirmation === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-400"
      : paymentConfirmation === "error"
        ? "border-rose-500/30 bg-rose-500/10 text-rose-400"
        : paymentConfirmation === "pending"
          ? "border-amber-500/30 bg-amber-500/10 text-amber-400"
          : "border-blue-500/30 bg-blue-500/10 text-blue-400";
  const paymentTitle =
    paymentConfirmation === "success"
      ? "支付成功，Pro 会员已自动激活！"
      : paymentConfirmation === "error"
        ? "暂时无法确认支付结果"
        : paymentConfirmation === "pending"
          ? "支付结果确认中"
          : "正在确认支付结果";
  const paymentDescription =
    paymentConfirmation === "success"
      ? "您的有效时长已实时生效，欢迎体验深度量化 AI 研判。"
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
                  <p>• <b>重装系统或换电脑防丢保障</b>：如清理了浏览器缓存或更换设备，在本页面凭上述<b>【恢复码】</b>或支付宝账单里的<b>【商户订单号：{outTradeNo || "见支付宝账单"}】</b>均可1秒自助找回并恢复！</p>
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
            解锁三地市场专属深度 AI 研判、多空评级、量化雷达与主力资金监控
          </p>
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
                  <span className="text-sm font-semibold text-white">当前状态：</span>
                  {isPro ? (
                    <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                      <Crown className="h-3 w-3" /> Pro 会员 (有效)
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded bg-neutral-800 px-2 py-0.5 text-xs font-medium text-neutral-400">
                      免费体验模式
                    </span>
                  )}
                </div>
                <p className="mt-1 text-xs text-neutral-400">
                  {isPro && membership?.expires_at
                    ? `会员有效期至：${membership.expires_at.replace("T", " ").slice(0, 16)} · 每日 500 次有效调用`
                    : "免费用户每日享 10 次深度 AI 研判额度，升级后立即扩充至每日 500 次"}
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

        {/* 定价卡片 */}
        <div className="mt-6 grid grid-cols-1 gap-6 md:grid-cols-2">
          {/* 月卡 — 主推极速付 */}
          <div className="relative flex flex-col justify-between rounded-2xl border-2 border-blue-500/50 bg-gradient-to-b from-blue-950/20 to-neutral-900/60 p-6 shadow-xl shadow-blue-500/5">
            <div className="absolute -top-3 left-6 rounded-full bg-blue-600 px-3 py-0.5 text-[11px] font-bold text-white tracking-wide uppercase shadow">
              最受欢迎 · 极速开通
            </div>

            <div>
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold text-white">月度 Pro 会员</h2>
                <span className="text-xs text-blue-400 font-medium">30 天全功能体验</span>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">¥19</span>
                <span className="text-xs text-neutral-400">/ 月</span>
                <span className="ml-2 text-xs text-neutral-500 line-through font-mono">¥39</span>
              </div>

              <ul className="mt-5 space-y-2.5 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>每日 <b>500 次</b> 深度 AI 量化研判与多空打分</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>A股/港股/美股 三地市场个股雷达与主力资金</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>持仓策略建议与观望买卖点推演</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-blue-400 shrink-0" />
                  <span>免注册免等待，支付宝扫码即付即用</span>
                </li>
              </ul>
            </div>

            <div className="mt-8">
              {payError && (
                <p className="mb-3 text-xs text-rose-400 flex items-center gap-1.5">
                  <TriangleAlert className="h-3.5 w-3.5 shrink-0" />
                  {payError}
                </p>
              )}

              <button
                onClick={handleAlipay}
                disabled={paying}
                className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-600/20 hover:bg-blue-500 active:scale-[0.99] disabled:opacity-50 transition cursor-pointer"
              >
                {paying ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    正在调起支付宝...
                  </>
                ) : (
                  <>
                    <Zap className="h-4 w-4" />
                    支付宝扫码开通（免登录直接付）
                  </>
                )}
              </button>

              <p className="mt-2 text-center text-[11px] text-neutral-400">
                {isRealUser
                  ? "✓ 支付成功后自动绑定至当前账号"
                  : "✓ 免繁琐注册，付完即生效；生成专属恢复码防丢失"}
              </p>
            </div>
          </div>

          {/* 年卡 */}
          <div className="relative flex flex-col justify-between rounded-2xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-sm">
            <div>
              <div className="flex items-baseline justify-between">
                <h2 className="text-lg font-bold text-white">年度 Pro 会员</h2>
                <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[11px] font-semibold text-amber-300">
                  省 29 元 / 折合 16元/月
                </span>
              </div>

              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-3xl font-extrabold text-white font-mono">¥199</span>
                <span className="text-xs text-neutral-400">/ 年 (365天)</span>
                <span className="ml-2 text-xs text-neutral-500 line-through font-mono">¥468</span>
              </div>

              <ul className="mt-5 space-y-2.5 text-xs text-neutral-300">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>包含月度版所有全部核心功能与高频额度</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>专属高胜率量化策略优先体验通道</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>全年无休行情异动监控与定制需求支持</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>1对1 专属客服服务</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-950/60 p-3.5">
              <div className="flex items-center gap-2 text-xs font-semibold text-amber-400">
                <MessageCircle className="h-4 w-4" />
                <span>年卡咨询与开通方式</span>
              </div>
              <p className="mt-2 text-xs text-neutral-300 leading-relaxed">
                添加运营微信：<b className="font-mono text-white select-all bg-neutral-800 px-1.5 py-0.5 rounded">denglio0</b>
              </p>
              <p className="mt-1 text-[11px] text-neutral-400">
                备注：<span className="text-amber-300 font-medium">爱看盘年卡</span>（专人秒速发激活码，即时生效）
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
                  className="min-h-11 rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50 transition shrink-0 cursor-pointer"
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
