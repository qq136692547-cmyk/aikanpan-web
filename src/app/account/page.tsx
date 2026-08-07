"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { KeyRound, LogOut, ShieldCheck, Smartphone, UserRound } from "lucide-react";
import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { useAuth } from "@/lib/auth";
import { api, type AuthMe } from "@/lib/api";

export default function AccountPage() {
  const { user, loading, bindUser, loginAsGuest } = useAuth();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [countdown, setCountdown] = useState(0);
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState<"error" | "ok">("error");
  const [busy, setBusy] = useState(false);
  const [me, setMe] = useState<AuthMe | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!user) return;
    api.getMe().then(setMe).catch(() => {});
  }, [user]);

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  function startCountdown() {
    setCountdown(60);
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((v) => {
        if (v <= 1 && timerRef.current) clearInterval(timerRef.current);
        return v > 0 ? v - 1 : 0;
      });
    }, 1000);
  }

  async function sendCode() {
    if (!/^1\d{10}$/.test(phone.trim())) {
      setMessage("请输入有效的 11 位手机号");
      setMessageType("error");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await api.sendSms(phone.trim());
      setMessage("验证码已发送");
      setMessageType("ok");
      startCountdown();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "验证码发送失败");
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  }

  async function verify(e: FormEvent) {
    e.preventDefault();
    if (!/^1\d{10}$/.test(phone.trim()) || !/^\d{6}$/.test(code.trim())) {
      setMessage("请输入手机号和 6 位验证码");
      setMessageType("error");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await api.verifySms(phone.trim(), code.trim(), user?.token);
      bindUser({
        user_id: result.user_id,
        token: result.token,
        type: "phone",
        created_at: new Date().toISOString(),
      });
      setCode("");
      setMessage(result.created ? "手机号注册成功" : "手机号登录成功");
      setMessageType("ok");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "验证失败");
      setMessageType("error");
    } finally {
      setBusy(false);
    }
  }

  async function resetGuest() {
    await loginAsGuest();
    setMe(null);
    setMessage("");
  }

  const phoneVerified = user?.type === "phone" || me?.phone_verified;
  const masked = me?.phone_masked || (user?.type === "phone" ? "已绑定" : "");

  return (
    <div className="neo-page">
      <Navbar />
      <main className="mx-auto w-full max-w-3xl flex-1 px-6 py-6">
        <section className="neo-card relative overflow-hidden p-6 neo-fade-up">
          <h1 className="text-[22px] font-bold tracking-tight text-neo-ink">账户</h1>
          <p className="mt-1 text-[12px] text-neo-dim">手机号绑定后，自选、持仓、计划会在设备间同步</p>

          <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="neo-inset-sm flex items-center gap-3 px-4 py-3">
              <div className="neo-card-sm flex h-10 w-10 shrink-0 items-center justify-center" style={{ borderRadius: 10 }}>
                {phoneVerified ? <ShieldCheck size={18} style={{ color: "var(--neo-primary)" }} /> : <UserRound size={18} style={{ color: "var(--neo-dim)" }} />}
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-neo-dim">{phoneVerified ? "手机号账户" : "游客模式"}</div>
                <div className="truncate text-[13px] font-semibold text-neo-ink">{phoneVerified ? masked : "未绑定手机号"}</div>
              </div>
            </div>
            <div className="neo-inset-sm flex items-center gap-3 px-4 py-3">
              <div className="neo-card-sm flex h-10 w-10 shrink-0 items-center justify-center" style={{ borderRadius: 10 }}>
                <KeyRound size={18} style={{ color: "var(--neo-dim)" }} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] text-neo-dim">账户 ID</div>
                <div className="truncate text-[12px] font-medium text-neo-ink" style={{ fontFamily: "var(--font-inter), system-ui" }}>
                  {loading ? "…" : user?.user_id || "未登录"}
                </div>
              </div>
            </div>
          </div>

          {!phoneVerified && (
            <form onSubmit={verify} className="mt-5">
              <div className="text-[13px] font-semibold text-neo-ink">绑定手机号</div>
              <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-[1fr_140px]">
                <div className="relative">
                  <Smartphone size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--neo-dim)" }} />
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 11))}
                    placeholder="手机号"
                    inputMode="numeric"
                    autoComplete="tel"
                    className="neo-input w-full rounded-md py-2.5 pl-9 pr-3 text-[13px]"
                  />
                </div>
                <div className="flex gap-2">
                  <input
                    value={code}
                    onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="验证码"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    className="neo-input min-w-0 flex-1 rounded-md px-3 py-2.5 text-[13px]"
                  />
                  <button
                    type="button"
                    onClick={sendCode}
                    disabled={busy || countdown > 0}
                    className="neo-btn shrink-0 rounded-md px-3 py-2.5 text-[12px] disabled:opacity-60"
                  >
                    {countdown > 0 ? `${countdown}s` : "发送"}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={busy || !user} className="neo-btn-primary mt-3 rounded-md px-5 py-2.5 text-[13px] font-medium disabled:opacity-60">
                {busy ? "处理中…" : "绑定并登录"}
              </button>
            </form>
          )}

          {message && (
            <p className={`mt-3 text-[12px] ${messageType === "ok" ? "text-neo-up" : "text-neo-down"}`}>{message}</p>
          )}

          <div className="mt-5 flex flex-wrap gap-2 pt-4" style={{ borderTop: "1px solid var(--neo-edge)" }}>
            {phoneVerified ? (
              <button onClick={resetGuest} className="neo-chip flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-neo-dim">
                <LogOut size={13} />
                切换游客身份
              </button>
            ) : (
              <button onClick={resetGuest} className="neo-chip flex items-center gap-1.5 px-3 py-1.5 text-[12px] text-neo-dim">
                <LogOut size={13} />
                重新生成游客身份
              </button>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </div>
  );
}
