"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { Bell, ClipboardList, Home, Info, Microscope, Search, TrendingUp } from "lucide-react";
import {
  MAIN_MODES,
  getNavigationSubnav,
  marketModeHref,
  normalizeNavigationPath,
  resolveNavigationContext,
} from "@/lib/navigation";

const iconMap = {
  "/market/": TrendingUp,
  "/review/": ClipboardList,
  "/research/": Microscope,
  "/search": Search,
  "/alerts": Bell,
  "/": Home,
  "/about/": Info,
} as const;

function isActive(pathname: string, activePath: string | null): boolean {
  if (!activePath) return false;
  const current = normalizeNavigationPath(pathname);
  if (activePath === "/") return current === "/";
  return current === activePath || current.startsWith(`${activePath}/`);
}

function BottomNavContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = resolveNavigationContext(pathname, searchParams.toString());
  const subnav = getNavigationSubnav(context.scope);

  return (
    <nav className="neo-navbar fixed bottom-0 left-0 right-0 z-50 md:hidden" style={{ borderRadius: "20px 20px 0 0", boxShadow: "0 -4px 16px rgba(0,0,0,0.45)" }}>
      <div className="px-2 pt-1.5">
        <div className="grid grid-cols-3 gap-1">
          {MAIN_MODES.map((tab) => (
            <Link
              key={tab.value}
              href={marketModeHref(context, tab.value)}
              aria-label={tab.label}
              className={`rounded-xl px-2 py-1 text-center text-[10px] font-semibold ${
                context.scope === tab.value ? "neo-chip-active" : "text-neo-dim"
              }`}
            >
              {tab.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center justify-between pb-1 pt-0.5">
          {subnav.map((item) => {
            const Icon = iconMap[item.path as keyof typeof iconMap] || Home;
            const href = item.path === "/" || item.path === "/about/" ? item.path : `${item.path}?market=${context.scope}`;
            const active = isActive(pathname, context.activePath);
            return (
              <Link
                key={`${context.scope}-${item.path}`}
                href={href}
                aria-label={item.label}
                className={`flex min-w-[44px] flex-col items-center gap-0.5 rounded-xl px-2 py-1 ${
                  active ? "neo-chip-active" : "text-neo-dim"
                }`}
              >
                <Icon size={15} strokeWidth={active ? 2.3 : 1.7} />
                <span className={`text-[9px] ${active ? "font-semibold" : "font-medium"}`}>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export function BottomNav() {
  return (
    <Suspense fallback={<div className="neo-navbar fixed bottom-0 left-0 right-0 h-16 md:hidden" />}>
      <BottomNavContent />
    </Suspense>
  );
}
