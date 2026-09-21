"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  MAIN_MODES,
  getNavigationSubnav,
  marketModeHref,
  normalizeNavigationPath,
  resolveNavigationContext,
  type MarketMode,
} from "@/lib/navigation";

function isActive(pathname: string, activePath: string | null): boolean {
  if (!activePath) return false;
  const current = normalizeNavigationPath(pathname);
  const target = normalizeNavigationPath(activePath);
  if (target === "/") return current === "/";
  return current === target || current.startsWith(`${target}/`);
}

export function PrimaryNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = resolveNavigationContext(pathname, searchParams.toString());
  const subnav = getNavigationSubnav(context.scope);

  function selectMode(next: MarketMode) {
    if (next === context.scope) return;
    router.push(marketModeHref(context, next));
  }

  return (
    <div className="hidden items-center gap-3 lg:flex">
      <div className="flex items-center gap-1" role="tablist" aria-label="市场范围">
        {MAIN_MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            role="tab"
            aria-selected={context.scope === item.value}
            onClick={() => selectMode(item.value)}
            className={`inline-flex min-h-11 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-semibold transition-all duration-200 ${
              context.scope === item.value ? "neo-chip-active" : "neo-chip"
            }`}
          >
            {item.value === "cn" && (
              <span className={`h-1.5 w-1.5 rounded-full ${context.scope === "cn" ? "bg-red-500" : "bg-red-400/50"}`} aria-hidden />
            )}
            {item.value === "hk" && (
              <span className={`h-1.5 w-1.5 rounded-full ${context.scope === "hk" ? "bg-purple-500" : "bg-purple-400/50"}`} aria-hidden />
            )}
            {item.value === "us" && (
              <span className={`h-1.5 w-1.5 rounded-full ${context.scope === "us" ? "bg-blue-500" : "bg-blue-400/50"}`} aria-hidden />
            )}
            {item.label}
          </button>
        ))}
      </div>

      <span className="h-4 w-px bg-[var(--neo-surface-inset)]" aria-hidden />

      <nav className="flex items-center gap-1" aria-label="功能导航">
        {subnav.map((item) => {
          const href = item.path === "/" || item.path === "/about/" ? item.path : `${item.path}?market=${context.scope}`;
          const active = isActive(pathname, item.path);
          return (
            <Link
              key={`${context.scope}-${item.path}`}
              href={href}
              className={`inline-flex min-h-11 items-center rounded-full px-3 text-[13px] font-medium transition-all duration-200 ${
                active ? "neo-chip-active" : "neo-chip"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

export function MobileNavigation({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const context = resolveNavigationContext(pathname, searchParams.toString());
  const subnav = getNavigationSubnav(context.scope);

  function go(next: MarketMode) {
    onNavigate?.();
    if (next === context.scope) return;
    router.push(marketModeHref(context, next));
  }

  return (
    <div>
      <div className="grid grid-cols-3 gap-1.5">
        {MAIN_MODES.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={context.scope === item.value}
            onClick={() => go(item.value)}
            className={`inline-flex min-h-11 items-center justify-center gap-1.5 rounded-full px-4 text-[13px] font-semibold ${
              context.scope === item.value ? "neo-chip-active" : "neo-chip"
            }`}
          >
            {item.value === "cn" && (
              <span className={`h-1.5 w-1.5 rounded-full ${context.scope === "cn" ? "bg-red-500" : "bg-red-400/50"}`} aria-hidden />
            )}
            {item.value === "hk" && (
              <span className={`h-1.5 w-1.5 rounded-full ${context.scope === "hk" ? "bg-purple-500" : "bg-purple-400/50"}`} aria-hidden />
            )}
            {item.value === "us" && (
              <span className={`h-1.5 w-1.5 rounded-full ${context.scope === "us" ? "bg-blue-500" : "bg-blue-400/50"}`} aria-hidden />
            )}
            {item.label}
          </button>
        ))}
      </div>
      <div className="mt-2 grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {subnav.map((item) => {
          const href = item.path === "/" || item.path === "/about/" ? item.path : `${item.path}?market=${context.scope}`;
          const active = isActive(pathname, item.path);
          return (
            <Link
              key={`${context.scope}-${item.path}-mobile`}
              href={href}
              onClick={onNavigate}
              className={`inline-flex min-h-11 items-center justify-center rounded-full px-4 text-[13px] ${active ? "neo-chip-active" : "neo-chip"}`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </div>
  );
}
