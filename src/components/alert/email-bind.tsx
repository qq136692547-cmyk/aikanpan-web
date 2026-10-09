"use client";

import { useEffect, useRef, useState } from "react";
import { Mail } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * 内联邮箱绑定：用于盯盘场景。
 * 绑定成功后会把当前游客 token 升级为邮箱账号（游客数据由服务端合并），
 * 并默认开通邮件提醒，用户可在通知设置里自行关闭。
 */
export function EmailBind({ onBound }: { onBound?: () => void }) {
  const { user, bindUser } = useAuth();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

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
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setMessage("请输入有效的邮箱地址");
      setIsError(true);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await api.sendEmailCode(normalized);
      setMessage("验证码已发送，请查收邮件（若未收到请检查垃圾邮件）");
      setIsError(false);
      startCountdown();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "验证码发送失败");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  async function bind() {
    const normalized = email.trim().toLowerCase();
    if (!EMAIL_RE.test(normalized)) {
      setMessage("请输入有效的邮箱地址");
      setIsError(true);
      return;
    }
    if (!/^\d{6}$/.test(code.trim())) {
      setMessage("请输入 6 位验证码");
      setIsError(true);
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      const result = await api.verifyEmail(normalized, code.trim(), user?.token);
      bindUser({
        user_id: result.user_id,
        token: result.token,
        type: "email",
        created_at: new Date().toISOString(),
      });
      setCode("");
      setMessage("邮箱已绑定，盯盘触发后会发送到该邮箱");
      setIsError(false);
      onBound?.();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "验证失败");
      setIsError(true);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="neo-inset mt-3 px-4 py-3">
      <div className="flex items-center gap-2">
        <Mail size={14} style={{ color: "var(--neo-primary)" }} />
        <span className="text-[12px] font-medium text-neo-ink">绑定邮箱，关闭页面也能收到提醒</span>
      </div>
      <p className="mt-1 text-[10px] leading-relaxed text-neo-dim">
        服务端持续监控你设置的条件，触发后发送到邮箱。邮箱仅用于发送提醒。
      </p>
      <div className="mt-3 flex flex-col gap-2 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          aria-label="接收提醒的邮箱"
          className="neo-card-sm min-w-0 flex-1 px-3 py-2 text-[12px] text-neo-ink outline-none"
          style={{ borderRadius: 10 }}
        />
        <input
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, "").slice(0, 6))}
          placeholder="6 位验证码"
          inputMode="numeric"
          aria-label="邮箱验证码"
          className="neo-card-sm w-full px-3 py-2 text-[12px] tracking-widest text-neo-ink outline-none sm:w-28"
          style={{ borderRadius: 10 }}
        />
        <button
          type="button"
          onClick={sendCode}
          disabled={busy || countdown > 0}
          className="neo-chip shrink-0 px-3 py-2 text-[12px] font-medium disabled:opacity-50"
        >
          {countdown > 0 ? `${countdown}s` : "获取验证码"}
        </button>
        <button
          type="button"
          onClick={bind}
          disabled={busy}
          className="neo-chip-active shrink-0 px-3 py-2 text-[12px] font-medium disabled:opacity-50"
        >
          绑定
        </button>
      </div>
      {message && (
        <p className="mt-2 text-[11px]" style={{ color: isError ? "var(--neo-danger, #c0392b)" : "var(--neo-mid)" }}>
          {message}
        </p>
      )}
    </div>
  );
}
