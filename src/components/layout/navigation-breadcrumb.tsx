"use client";

import { Suspense } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { resolveNavigationContext } from "@/lib/navigation";

function BreadcrumbContent() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const context = resolveNavigationContext(pathname, searchParams.toString());

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
  return (
    <Suspense fallback={null}>
      <BreadcrumbContent />
    </Suspense>
  );
}
