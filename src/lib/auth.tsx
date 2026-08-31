"use client";

import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from "react";

// ============================================
// Types
// ============================================

interface AuthUser {
  user_id: string;
  token: string;
  type: "guest" | "hw" | "wx" | "phone";
  created_at?: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  isAuthenticated: boolean;
  loginAsGuest: () => Promise<AuthUser>;
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
    guestLogin()
      .then((u) => {
        saveToStorage(u);
        setUser(u);
      })
      .catch((err) => {
        console.error("[auth] guest login failed:", err);
        // 不阻塞页面，用户可以继续浏览
      })
      .finally(() => {
        setLoading(false);
      });
  }, []);

  const loginAsGuest = useCallback(async () => {
    const u = await guestLogin();
    saveToStorage(u);
    setUser(u);
    return u;
  }, []);

  const bindUser = useCallback((u: AuthUser) => {
    saveToStorage(u);
    setUser(u);
  }, []);

  const logout = useCallback(() => {
    clearStorage();
    setUser(null);
    // 重新游客登录
    guestLogin()
      .then((u) => {
        saveToStorage(u);
        setUser(u);
      })
      .catch(() => {});
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user,
        loginAsGuest,
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
