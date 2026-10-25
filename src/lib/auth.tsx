"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ============================================
// Types
// ============================================

interface AuthUser {
  user_id: string;
  token: string;
  type: "guest" | "hw" | "wx" | "phone" | "email";
  created_at?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  /**
   * 游客登录失败的原因（null = 正常）。
   * 之前失败只是 console.error，user 永远为 null、loading 变 false，
   * 于是依赖 ready 的按钮全部 disabled 且没有任何重试入口 —— 用户只能刷新页面。
   */
  error: string | null;
  loginAsGuest: () => Promise<AuthUser>;
  /** 重新尝试游客登录（失败态下的「重试」按钮用） */
  retry: () => void;
  logout: () => void;
  bindUser: (user: AuthUser) => void;
  /** 绑定真实身份（升级游客token到微信/华为账号），后续实现 */
  // upgradeAccount: (type: "wx" | "hw", credential: string) => Promise<AuthUser>;
}

// ============================================
// Constants
// ============================================

const STORAGE_KEY = "aikanpan_auth";
const API_BASE = process.env.NEXT_PUBLIC_API_BASE || "https://aikanpan.top/api/v1";

// ============================================
// Context
// ============================================

const AuthContext = createContext<AuthContextValue | null>(null);

// ============================================
// Helpers
// ============================================

function loadFromStorage(): AuthUser | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthUser;
    if (data?.token && data?.user_id) return data;
    return null;
  } catch {
    return null;
  }
}

function saveToStorage(user: AuthUser): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(user));
  } catch {
    // ignore
  }
}

function clearStorage(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

async function guestLogin(): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/auth/guest-login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
  });
  if (!res.ok) {
    throw new Error(`guest-login failed: ${res.status}`);
  }
  const data = await res.json();
  return {
    user_id: data.user_id,
    token: data.token,
    type: "guest",
    created_at: new Date().toISOString(),
  };
}

// ============================================
// Provider
// ============================================

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loginAsGuest = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const u = await guestLogin();
      saveToStorage(u);
      setUser(u);
      return u;
    } catch (e) {
      // 暴露给 UI：否则调用方只看到「永远 ready=false」，没有任何可操作入口。
      setError(e instanceof Error ? e.message : "guest-login failed");
      throw e;
    } finally {
      setLoading(false);
    }
  }, []);

  const retry = useCallback(() => {
    void loginAsGuest().catch(() => {
      // 失败已写入 error，UI 会展示重试入口
    });
  }, [loginAsGuest]);

  // 初始化：从 localStorage 恢复，没有则自动游客登录
  useEffect(() => {
    const existing = loadFromStorage();
    if (existing) {
      // Auth state is restored after mount so localStorage is never read during SSR.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setUser(existing);
      setLoading(false);
      return;
    }

    // 自动游客登录
    void loginAsGuest().catch(() => {
      // 失败可重试，不阻塞页面浏览
    });
  }, [loginAsGuest]);

  const bindUser = useCallback((u: AuthUser) => {
    saveToStorage(u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setUser(null);
    // 重新游客登录（失败同样可重试，不再静默吞掉）
    void loginAsGuest().catch(() => {});
  }, [loginAsGuest]);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        error,
        loginAsGuest,
        retry,
        logout,
        bindUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// ============================================
// Hook
// ============================================

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

/**
 * 获取当前 token（非 React 上下文使用，直接从 localStorage 读取）
 */
export function getAuthToken(): string | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as AuthUser;
    return data?.token ?? null;
  } catch {
    return null;
  }
}
