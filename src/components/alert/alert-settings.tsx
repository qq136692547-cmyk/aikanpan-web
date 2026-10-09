"use client";

import { useState } from "react";
import useSWR from "swr";
import { Bell, Mail, MessageSquareText, Smartphone } from "lucide-react";
import { api } from "@/lib/api";
import { useAuth } from "@/lib/auth";
import { ErrorState } from "@/components/ui/state";

export function AlertSettings() {
  const { user, loading: authLoading } = useAuth();
  const { data: settings, mutate } = useSWR(
    user ? ["alert-settings", user.user_id] : null,
    () => api.getAlertSettings(),
    { refreshInterval: 30000 }
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    typeof window !== "undefined" && "Notification" in window ? Notification.permission : "unsupported"
  );

  if (authLoading) {
    return <div className="neo-skeleton h-28 rounded-xl" />;
  }

  if (!user) {
    return <ErrorState title="通知设置不可用" description="账户初始化失败，请刷新页面后重试。" onRetry={() => window.location.reload()} />;
  }

  async function toggleBrowser(value: boolean) {
    setSaving(true);
    setMessage("");
    try {
      if (value) {
        if (typeof window === "undefined" || !("Notification" in window)) {
          setMessage("当前浏览器不支持通知");
          return;
        }
        const result = await Notification.requestPermission();
        setPermission(result);
        if (result !== "granted") {
          setMessage("通知权限未开启");
          return;
        }
      }
      await api.updateAlertSettings({ browser_enabled: value });
      await mutate();
      setMessage(value ? "浏览器通知已开启" : "浏览器通知已关闭");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "设置保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleSms(value: boolean) {
    setSaving(true);
    setMessage("");
    try {
      await api.updateAlertSettings({ sms_enabled: value });
      await mutate();
      setMessage(value ? "短信通知已开启" : "短信通知已关闭");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "设置保存失败");
    } finally {
      setSaving(false);
    }
  }

  async function toggleEmail(value: boolean) {
    setSaving(true);
    setMessage("");
    try {
      await api.updateAlertSettings({ email_enabled: value });
      await mutate();
      setMessage(value ? "邮件通知已开启" : "邮件通知已关闭");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "设置保存失败");
    } finally {
      setSaving(false);
    }
  }

  const phoneVerified = !!settings?.phone_verified;
  const emailVerified = !!settings?.email_verified;

  return (
    <section className="neo-card p-5">
      <div className="flex items-center gap-2">
        <Bell size={16} style={{ color: "var(--neo-primary)" }} />
        <h3 className="text-[14px] font-semibold text-neo-ink">通知设置</h3>
      </div>
      <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="neo-inset flex items-center gap-3 px-4 py-3">
          <div className="neo-card-sm flex h-9 w-9 shrink-0 items-center justify-center" style={{ borderRadius: 10 }}>
            <Smartphone size={16} style={{ color: "var(--neo-primary)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-neo-ink">浏览器通知</div>
            <div className="text-[10px] text-neo-dim">{permission === "granted" ? "权限已开启，仅页面打开时提醒" : "开启后，页面打开时弹出提醒"}</div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={!!settings?.browser_enabled}
              onChange={(e) => toggleBrowser(e.target.checked)}
              disabled={saving}
              className="peer sr-only"
              aria-label="浏览器通知开关"
            />
            <span className="h-5 w-9 rounded-full bg-[var(--neo-surface-inset)] transition-colors peer-checked:bg-neo-primary" />
          </label>
        </div>

        <div className="neo-inset flex items-center gap-3 px-4 py-3">
          <div className="neo-card-sm flex h-9 w-9 shrink-0 items-center justify-center" style={{ borderRadius: 10 }}>
            <MessageSquareText size={16} style={{ color: phoneVerified ? "var(--neo-primary)" : "var(--neo-dim)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-neo-ink">短信通知</div>
            <div className="truncate text-[10px] text-neo-dim">
              {phoneVerified ? `绑定手机号 ${settings?.phone_masked || ""}，由服务端发送` : "绑定手机号后可开启"}
            </div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={!!settings?.sms_enabled}
              onChange={(e) => toggleSms(e.target.checked)}
              disabled={saving || !phoneVerified}
              className="peer sr-only"
              aria-label="短信通知开关"
            />
            <span className="h-5 w-9 rounded-full bg-[var(--neo-surface-inset)] transition-colors peer-checked:bg-neo-primary disabled:opacity-40" />
          </label>
        </div>

        <div className="neo-inset flex items-center gap-3 px-4 py-3">
          <div className="neo-card-sm flex h-9 w-9 shrink-0 items-center justify-center" style={{ borderRadius: 10 }}>
            <Mail size={16} style={{ color: emailVerified ? "var(--neo-primary)" : "var(--neo-dim)" }} />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-[12px] font-medium text-neo-ink">邮件通知</div>
            <div className="truncate text-[10px] text-neo-dim">
              {emailVerified ? `绑定邮箱 ${settings?.email_masked || ""}，触发时发送` : "绑定邮箱后可开启"}
            </div>
          </div>
          <label className="relative inline-flex shrink-0 cursor-pointer items-center">
            <input
              type="checkbox"
              checked={!!settings?.email_enabled}
              onChange={(e) => toggleEmail(e.target.checked)}
              disabled={saving || !emailVerified}
              className="peer sr-only"
              aria-label="邮件通知开关"
            />
            <span className="h-5 w-9 rounded-full bg-[var(--neo-surface-inset)] transition-colors peer-checked:bg-neo-primary disabled:opacity-40" />
          </label>
        </div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-neo-dim">
        服务端每 30 秒持续监控，关闭页面也照常运行；浏览器通知仅页面打开时弹出，离开页面请开启邮件或短信通知。
      </p>
      {message && <p className="mt-2 text-[11px] text-neo-mid">{message}</p>}
    </section>
  );
}
