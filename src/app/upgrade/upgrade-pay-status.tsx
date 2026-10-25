"use client";

/**
 * 支付宝回跳后的到账确认横幅（客户端岛）。
 *
 * 只有带着 pay_success=1&out_trade_no=... 回来时才需要轮询订单状态，
 * 因此整块放进客户端，服务端页面只在需要时挂载它。
 *
 * 状态判定必须走 resolveAlipayOrderStatus()：后端 status 是归一化值
 * （PAID / REFUSED），真实交易状态在 raw_status 里，只看 status 会把
 * 已付款判成未付款（这个坑已经踩过一次）。
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  Clock3,
  Copy,
  Loader2,
  MessageCircle,
  ShieldCheck,
  TriangleAlert,
} from "lucide-react";
import { api } from "@/lib/api";
import { reportConversionEvent } from "@/lib/analytics";
import { useMembership } from "@/lib/membership";
import { isAlipayOrderPaid, isAlipayOrderRefused, resolveAlipayOrderStatus } from "@/lib/payment";

type PaymentConfirmation = "idle" | "checking" | "success" | "pending" | "error" | "refused";

export function UpgradePayStatus({
  paySuccess = false,
  outTradeNo = "",
}: {
  paySuccess?: boolean;
  outTradeNo?: string;
}) {
  const { refresh } = useMembership();

  const [paymentConfirmation, setPaymentConfirmation] = useState<PaymentConfirmation>(
    paySuccess ? (outTradeNo ? "checking" : "error") : "idle"
  );
  const [paymentMessage, setPaymentMessage] = useState(
    paySuccess && !outTradeNo ? "支付回跳缺少订单号，暂时无法确认到账结果。" : ""
  );
  const [recoveryCode, setRecoveryCode] = useState("");
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!paySuccess || !outTradeNo) return;

    let cancelled = false;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const verifyOrder = async (attempt: number) => {
      if (cancelled) return;
      try {
        const res = await api.checkAlipayOrderStatus(outTradeNo);
        if (cancelled) return;

        const orderStatus = resolveAlipayOrderStatus(res?.data?.status, res?.data?.raw_status);

        // 已实付但被拒发（限购一次 / 年卡权益已达成后的重复购买）→ 立即停止轮询并告知退款去向
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
        setPaymentMessage("支付已受理，到账确认中。若几分钟后仍未点亮会员，可用恢复码在上方自助找回。");
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

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (paymentConfirmation === "idle") return null;

  return (
    <div className={`mb-6 rounded-xl border p-4 ${paymentTone} shadow-sm`}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          {paymentConfirmation === "checking" && <Loader2 className="h-6 w-6 shrink-0 animate-spin" />}
          {paymentConfirmation === "success" && <CheckCircle2 className="h-6 w-6 shrink-0" />}
          {paymentConfirmation === "pending" && <Clock3 className="h-6 w-6 shrink-0" />}
          {paymentConfirmation === "error" && <TriangleAlert className="h-6 w-6 shrink-0" />}
          {paymentConfirmation === "refused" && <MessageCircle className="h-6 w-6 shrink-0" />}
          <div>
            <p className="text-sm font-semibold">{paymentTitle}</p>
            <p className="text-xs opacity-90">{paymentDescription}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={() => setPaymentConfirmation("idle")}
          className="inline-flex min-h-11 cursor-pointer items-center px-2 text-xs underline hover:opacity-80"
        >
          关闭
        </button>
      </div>

      {/* 专属会员找回凭据卡片 */}
      {paymentConfirmation === "success" && (
        <div className="mt-4 rounded-lg border border-emerald-500/20 bg-neutral-950/80 p-3.5 text-neutral-200">
          <div className="flex flex-col justify-between gap-2 border-b border-neutral-800 pb-2.5 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-400">
              <ShieldCheck className="h-4 w-4" />
              <span>您的专属会员找回凭据（防重装系统丢失）</span>
            </div>
            {recoveryCode && (
              <button
                type="button"
                onClick={() => copyToClipboard(recoveryCode)}
                className="inline-flex cursor-pointer items-center gap-1.5 rounded bg-emerald-500/20 px-2.5 py-1 font-mono text-xs font-medium text-emerald-300 hover:bg-emerald-500/30"
              >
                <Copy className="h-3.5 w-3.5" />
                {copied ? "已复制凭证" : `恢复码：${recoveryCode} (点击复制)`}
              </button>
            )}
          </div>
          <div className="mt-2.5 text-[11px] leading-relaxed text-neutral-400">
            <p>
              • <b>重装系统或换电脑防丢保障</b>：如清理了浏览器缓存或更换设备，在本页面凭上述
              <b>【恢复码】</b>即可自助找回并恢复。请立刻把恢复码保存到别处——它不会再次显示。
            </p>
            <p className="mt-1">
              • <b>恢复码丢失时</b>：可凭支付宝账单里的商户订单号联系客服人工核实，处理方式见下方
              「付款后有问题怎么办」。
            </p>
            <p className="mt-1">
              • <b>多端同步</b>：您也可前往{" "}
              <Link href="/account" className="text-emerald-400 underline hover:text-emerald-300">
                用户中心绑定手机号
              </Link>
              ，实现手机与多台电脑永久云同步。
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
