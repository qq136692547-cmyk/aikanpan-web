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
      <div className="mx-auto flex h-7 w-full max-w-[1440px] items-center gap-1 overflow-x-auto px-4 text-[10px] text-neo-dim sm:px-6">
        {context.breadcrumb.map((crumb, index) => {
          const isLast = index === context.breadcrumb.length - 1;
          return (
            <span key={`${crumb.label}-${index}`} className="flex shrink-0 items-center gap-1">
              {index > 0 && <ChevronRight size={10} aria-hidden />}
              {crumb.href && !isLast ? (
                <Link href={crumb.href} className="transition-colors hover:text-neo-primary">
                  {crumb.label}
                </Link>
              ) : (
                <span className={isLast ? "font-medium text-neo-ink" : undefined}>{crumb.label}</span>
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
