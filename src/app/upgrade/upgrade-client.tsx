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

  // 只有手机号/邮箱等真实注册用户才能付款，游客不算
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

  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activateMsg, setActivateMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!paySuccess || !outTradeNo) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const verifyOrder = async (attempt: number) => {
      try {
        const res = await api.checkAlipayOrderStatus(outTradeNo);
        if (cancelled) return;
        if (isAlipayOrderPaid(res.data?.status)) {
          setPaymentConfirmation("success");
          setPaymentMessage("");
          refresh();
          return;
        }
        if (attempt < 5) {
          timer = setTimeout(() => verifyOrder(attempt + 1), 1500);
          return;
        }
        setPaymentConfirmation("pending");
        setPaymentMessage("支付结果仍在确认中。若已扣款，到账后会自动增加会员时长。");
      } catch (error: unknown) {
        if (cancelled) return;
        if (attempt < 2) {
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
      ? "您的有效时长已实时更新，感谢您的支持。"
      : paymentMessage || "请勿重复付款，通常几秒内即可完成确认。";

  return (
    <div className="flex min-h-screen flex-col bg-neutral-950 text-neutral-100">
      <Navbar />

      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-10 sm:px-6">
        {paymentConfirmation !== "idle" && (
          <div className={`mb-6 flex items-center justify-between rounded-lg border p-4 ${paymentTone}`}>
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
              className="inline-flex min-h-11 items-center px-2 text-xs underline hover:opacity-80"
            >
              关闭
            </button>
          </div>
        )}

        <div className="text-center">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-1 text-xs font-semibold text-amber-400">
            <Crown className="h-3.5 w-3.5" /> 软件增值分析权限
          </span>
          <h1 className="mt-3.5 text-2xl font-bold tracking-tight text-white sm:text-3xl">
            升级爱看盘 Pro 会员
          </h1>
          <p className="mt-2 text-sm text-neutral-400">
            每日 500 次深度 AI 研判、多空量化盘中监控与主力资金流向
          </p>
        </div>

        <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="flex h-11 w-11 items-center justify-center rounded-full bg-blue-600/20 text-blue-400 font-bold text-base">
                {isRealUser ? (user?.user_id?.[0]?.toUpperCase() || "U") : "?"}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-white">
                    {isRealUser ? "已登录用户" : "游客 (未注册)"}
                  </span>
                  {isPro ? (
                    <span className="rounded bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400 border border-amber-500/30">
                      PRO 尊享会员
                  </span>
                ) : (
                  <span className="rounded bg-neutral-800 px-2 py-0.5 text-xs text-neutral-400">
                    免费版
                  </span>
                )}
              </div>
              <p className="text-xs text-neutral-400 mt-1">
                {isRealUser
                  ? isPro && membership?.expires_at
                    ? "会员有效期至：" + membership.expires_at.replace("T", " ").slice(0, 16)
                  : "当前为免费额度（每日 10 次调用），支付成功后时长将自动绑定到此账号"
                : "请先登录或注册账号，付款后会员时长将自动绑定到您的账号"}
              </p>
            </div>
            </div>

            {!isRealUser && (
              <Link
                href="/account"
                className="inline-flex min-h-11 items-center gap-1.5 rounded-md bg-blue-600 px-4 text-xs font-semibold text-white shadow hover:bg-blue-500 transition"
              >
                登录 / 注册 <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            )}
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-2">
          <div className="relative flex flex-col justify-between rounded-xl border-2 border-blue-600 bg-neutral-900 p-6 shadow-xl">
            <div className="absolute -top-3 right-4 rounded-full bg-blue-600 px-2.5 py-0.5 text-[11px] font-semibold text-white">
              支付宝直付 · 自动到账
            </div>

            <div>
              <div className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-blue-500" />
                <h2 className="text-lg font-bold text-white">Pro 月度会员</h2>
              </div>
              <p className="mt-1 text-xs text-neutral-400">低门槛尝鲜，日常复盘与个股研判首选</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-white">¥19</span>
                <span className="text-xs text-neutral-400">/ 30天 (不自动续费)</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-neutral-300">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>每日 500 次有效深度 AI 研判与个股打分</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>全市场盘中异动与主力资金流向实时监控</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-400 shrink-0" />
                  <span>多设备实时同步，支持导出专属 Markdown 研报</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-5 border-t border-neutral-800">
              {payError && (
                <p className="mb-3 text-xs text-rose-400 text-center font-medium">{payError}</p>
              )}

              {isRealUser ? (
                <button
                  onClick={handleAlipay}
                  disabled={paying}
                  className="w-full flex min-h-12 items-center justify-center gap-2 rounded-lg bg-[#0958D9] hover:bg-[#0748B8] py-3.5 text-sm font-semibold text-white shadow transition disabled:opacity-60 cursor-pointer"
                >
                  {paying ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      正在跳转支付宝安全收银台…
                    </>
                  ) : (
                    <>
                      <span>使用支付宝付款 ¥19</span>
                      <ExternalLink className="h-4 w-4 opacity-80" />
                    </>
                  )}
                </button>
              ) : (
                <Link
                  href="/account"
                  className="w-full flex min-h-12 items-center justify-center gap-1.5 rounded-lg bg-neutral-800 py-3.5 text-sm font-semibold text-neutral-200 hover:bg-neutral-700 transition"
                >
                  请先登录 / 注册账号后支付
                </Link>
              )}

              <p className="mt-2.5 text-center text-[11px] text-neutral-400">
                🔒 支付宝官方直连安全支付 · 付款后自动增加 30 天会员
              </p>
            </div>
          </div>

          <div className="flex flex-col justify-between rounded-xl border border-amber-500/30 bg-amber-500/5 p-6 shadow-sm">
            <div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-amber-500" />
                  <h2 className="text-lg font-bold text-white">Pro 年度尊享</h2>
                </div>
                <span className="rounded bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[11px] font-medium text-amber-400">
                  立省 ¥29 · 每日仅需 0.5 元
                </span>
              </div>
              <p className="mt-1 text-xs text-neutral-400">全年陪伴与量化技术工具首选，超高性价比</p>

              <div className="mt-5 flex items-baseline gap-1.5">
                <span className="text-4xl font-extrabold text-amber-400">¥199</span>
                <span className="text-xs text-neutral-400">/ 365天</span>
              </div>

              <ul className="mt-6 space-y-3 text-xs text-neutral-300">
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>包含月度版所有功能，全年无限制连续使用</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>限时加赠 30 天会员时长（共 395 天）</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <CheckCircle2 className="h-4 w-4 text-amber-500 shrink-0" />
                  <span>官方技术支持与产品新功能优先体验权</span>
                </li>
              </ul>
            </div>

            <div className="mt-8 pt-5 border-t border-amber-500/20">
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                <p className="text-xs font-semibold text-amber-300 flex items-center justify-center gap-1.5">
                  <MessageCircle className="h-4 w-4 text-amber-400" />
                  需要年卡请添加微信：
                  <span className="font-bold underline decoration-dashed select-all text-white text-sm">
                    denglio0
                  </span>
                </p>
                <p className="mt-1 text-[11px] text-neutral-400">
                  添加好友请备注：<b className="text-amber-300">爱看盘</b>（专人快速发码，即时开通）
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm">
          <div className="flex items-center gap-2">
            <KeyRound className="h-4 w-4 text-blue-500" />
            <h3 className="text-sm font-semibold text-white">已有激活码？（年卡付款后获取或好友赠送）</h3>
          </div>

          <form onSubmit={handleActivate} className="mt-3.5 flex flex-col sm:flex-row gap-2.5">
            <input
              type="text"
              aria-label="输入激活码"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="请输入激活码（如 AKP-XXXX-XXXX）"
              className="flex-1 rounded-md border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 text-base text-white outline-none focus:border-blue-500 sm:text-xs"
              autoComplete="off"
            />
            <button
              type="submit"
              disabled={activating || !code.trim() || !isRealUser}
              className="min-h-11 rounded-md bg-blue-600 px-5 text-xs font-semibold text-white shadow hover:bg-blue-500 disabled:opacity-50 transition shrink-0 cursor-pointer"
            >
              {activating ? "正在验证…" : "立即激活"}
            </button>
          </form>

          {activateMsg && (
            <p className={"mt-2.5 text-xs font-medium " + (activateMsg.type === "ok" ? "text-emerald-400" : "text-rose-400")}>
              {activateMsg.text}
            </p>
          )}

          {!isRealUser && (
            <p className="mt-2 text-[11px] text-amber-400">
              * 提示：激活前请先登录账号，激活成功后权益将直接绑定至当前账号。
            </p>
          )}
        </div>

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
