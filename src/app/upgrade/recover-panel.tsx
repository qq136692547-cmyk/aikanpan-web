"use client";

/**
 * 「自助找回 / 激活码兑换」双表单（客户端岛）。
 *
 * 2026-10-26 契约变更：会员找回只接受恢复码（AKP-XXXX-XXXX），
 * 裸订单号一律拒绝 —— 订单号曾是找回凭据，会经前端错误上报与浏览器历史泄露。
 * 因此这里的输入框、占位符、帮助文案都不再承诺「用订单号自助找回」；
 * 订单号只在「联系客服人工核实」这条路径里使用。
 */

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { HelpCircle, KeyRound, ShieldCheck } from "lucide-react";
import { api } from "@/lib/api";
import { reportConversionEvent } from "@/lib/analytics";
import { useAuth } from "@/lib/auth";
import { useMembership } from "@/lib/membership";

type Msg = { type: "ok" | "err"; text: string } | null;

const SUPPORT = "微信 denglio0（加好友请备注：爱看盘）或邮箱 qq136692547@gmail.com";

export function RecoverPanel() {
  const { user, isAuthenticated } = useAuth();
  const { refresh } = useMembership();
  const isRealUser = isAuthenticated && !!user?.type && user.type !== "guest";

  const [activeTab, setActiveTab] = useState<"recover" | "activate">("recover");

  const [recoverInput, setRecoverInput] = useState("");
  const [recovering, setRecovering] = useState(false);
  const [recoverMsg, setRecoverMsg] = useState<Msg>(null);

  const [code, setCode] = useState("");
  const [activating, setActivating] = useState(false);
  const [activateMsg, setActivateMsg] = useState<Msg>(null);

  const handleRecover = async (e: FormEvent) => {
    e.preventDefault();
    if (!recoverInput.trim()) return;
    setRecovering(true);
    setRecoverMsg(null);
    try {
      const res = await api.recoverMembership(recoverInput.trim());
      if (res && res.success) {
        setRecoverMsg({ type: "ok", text: res.message || "会员资格已成功恢复至当前设备！" });
        reportConversionEvent("activation_success", { source: "recover" });
        setRecoverInput("");
        refresh();
      } else {
        setRecoverMsg({ type: "err", text: res.message || "未找到匹配的恢复码，请核对后重试" });
      }
    } catch (error: unknown) {
      setRecoverMsg({
        type: "err",
        text:
          error instanceof Error && error.message
            ? error.message
            : "找回服务暂时不可用，请稍后重试",
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
        text: error instanceof Error && error.message ? error.message : "激活码无效或已被使用",
      });
    } finally {
      setActivating(false);
    }
  };

  const tabClass = (tab: "recover" | "activate") =>
    `flex items-center gap-2 pb-2 -mb-3 text-sm font-semibold transition border-b-2 cursor-pointer ${
      activeTab === tab
        ? "border-blue-500 text-blue-400"
        : "border-transparent text-neutral-400 hover:text-white"
    }`;

  return (
    <div className="mt-8 rounded-2xl border border-neutral-800 bg-neutral-900/60 p-5 shadow-sm sm:p-6">
      <div className="flex gap-6 border-b border-neutral-800 pb-3">
        <button type="button" onClick={() => setActiveTab("recover")} className={tabClass("recover")}>
          <ShieldCheck className="h-4 w-4" />
          换电脑/重装系统自助找回
        </button>
        <button type="button" onClick={() => setActiveTab("activate")} className={tabClass("activate")}>
          <KeyRound className="h-4 w-4" />
          输入激活码兑换
        </button>
      </div>

      {activeTab === "recover" && (
        <div className="mt-4">
          <p className="text-xs leading-relaxed text-neutral-300">
            如果您清理了浏览器、重装了系统或换了新设备，输入付款成功后获得的专属
            <b>【恢复码】</b>，即可一键将 Pro 权益恢复至当前设备：
          </p>
          <form onSubmit={handleRecover} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
            <input
              type="text"
              aria-label="输入恢复码"
              value={recoverInput}
              onChange={(e) => setRecoverInput(e.target.value.trim().toUpperCase())}
              placeholder="请输入恢复码（如 AKP-XXXX-XXXX）"
              className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 font-mono text-sm text-white outline-none focus:border-blue-500"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={recovering || !recoverInput.trim()}
              className="min-h-11 shrink-0 cursor-pointer rounded-lg border border-neutral-700 bg-neutral-900 px-5 text-xs font-medium text-neutral-300 transition hover:border-neutral-500 hover:text-white disabled:opacity-50"
            >
              {recovering ? "正在核验…" : "立即找回会员"}
            </button>
          </form>

          {recoverMsg && (
            <p
              className={`mt-2.5 text-xs font-medium ${
                recoverMsg.type === "ok" ? "text-emerald-400" : "text-rose-400"
              }`}
              role={recoverMsg.type === "err" ? "alert" : "status"}
            >
              {recoverMsg.text}
            </p>
          )}

          <div className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-neutral-400">
            <HelpCircle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-neutral-400" />
            <span>
              恢复码在付款成功页显示，且<b>只显示一次</b>，请当时就保存好。
              若已丢失，请通过 {SUPPORT} 提供支付宝商户订单号，我们核实订单与权益状态后处理。
              订单号本身<b>不能</b>自助找回。
            </span>
          </div>
        </div>
      )}

      {activeTab === "activate" && (
        <div className="mt-4">
          <p className="text-xs leading-relaxed text-neutral-300">
            如果您拥有赠品激活码或年卡专属卡密，请在下方输入激活：
          </p>
          <form onSubmit={handleActivate} className="mt-3 flex flex-col gap-2.5 sm:flex-row">
            <input
              type="text"
              aria-label="输入激活码"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              placeholder="请输入激活码（如 AKP-XXXX-XXXX）"
              className="flex-1 rounded-lg border border-neutral-800 bg-neutral-950 px-3.5 py-2.5 font-mono text-sm text-white outline-none focus:border-blue-500"
              autoComplete="off"
              spellCheck={false}
            />
            <button
              type="submit"
              disabled={activating || !code.trim() || !isRealUser}
              className="min-h-11 shrink-0 cursor-pointer rounded-lg bg-blue-600 px-5 text-xs font-semibold text-white shadow transition hover:bg-blue-500 disabled:opacity-50"
            >
              {activating ? "正在验证…" : "立即激活"}
            </button>
          </form>

          {activateMsg && (
            <p
              className={`mt-2.5 text-xs font-medium ${
                activateMsg.type === "ok" ? "text-emerald-400" : "text-rose-400"
              }`}
              role={activateMsg.type === "err" ? "alert" : "status"}
            >
              {activateMsg.text}
            </p>
          )}

          {!isRealUser && (
            <p className="mt-2 text-[11px] text-amber-400">
              * 提示：激活前请先
              <Link href="/account" className="underline hover:text-amber-300">
                绑定邮箱或手机号
              </Link>
              ，激活成功后权益将直接绑定至当前账号。
            </p>
          )}
        </div>
      )}
    </div>
  );
}
