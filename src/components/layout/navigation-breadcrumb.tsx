"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { resolveNavigationContext } from "@/lib/navigation";
// 面包屑与导航共用同一个 location.search store：/stock/[code] 这类页面有 83 条 URL，
// 它们的「A股 › 市场 › 个股」是站内最主要的一组内链。原先在这里读 query 的那个 hook
// 会强制上层套 <Suspense>（此处 fallback 是 null，连占位都没有），等于整块内链对
// 不执行 JS 的抓取器完全不可见。
import { useLocationSearch } from "@/components/layout/location-search";

function BreadcrumbContent() {
  const pathname = usePathname();
  const search = useLocationSearch();
  const context = resolveNavigationContext(pathname, search);

  if (!context.showBreadcrumb || context.breadcrumb.length < 2) return null;

  return (
    <nav aria-label="页面位置" className="border-t border-[var(--neo-surface-inset)]">
      <div className="mx-auto flex min-h-11 w-full max-w-[1440px] items-center gap-1 overflow-x-auto px-4 text-[10px] text-neo-dim sm:px-6">
        {context.breadcrumb.map((crumb, index) => {
          const isLast = index === context.breadcrumb.length - 1;
          return (
            <span key={`${crumb.label}-${index}`} className="flex shrink-0 items-center gap-1">
              {index > 0 && <ChevronRight size={10} aria-hidden />}
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className="inline-flex min-h-11 items-center gap-1 transition-colors hover:text-neo-primary">
                  {index === 0 && context.scope === "cn" && <span className="h-1.5 w-1.5 rounded-full bg-red-500" aria-hidden />}
                  {index === 0 && context.scope === "hk" && <span className="h-1.5 w-1.5 rounded-full bg-purple-500" aria-hidden />}
                  {index === 0 && context.scope === "us" && <span className="h-1.5 w-1.5 rounded-full bg-blue-500" aria-hidden />}
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? "font-semibold text-neo-ink" : undefined}>{crumb.label}</span>
              )}
            </span>
          );
        })}
      </div>
    </nav>
  );
}

export function NavigationBreadcrumb() {
  // 不再需要 <Suspense>：这里不调用任何会挂起（suspend）的 API。
  // 原先那层 fallback={null} 的唯一效果是把整块面包屑挡在 SSR HTML 之外。
  return <BreadcrumbContent />;
}
