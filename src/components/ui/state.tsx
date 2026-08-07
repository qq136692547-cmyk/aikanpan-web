"use client";
import type { ReactNode } from "react";

export function EmptyState({
  title,
  description,
  action,
  image,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  image?: string;
}) {
  return (
    <div className="neo-card-sm flex flex-col items-center justify-center px-6 py-10 text-center">
      {image && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt="" aria-hidden className="neo-art-bright mx-auto mb-3 h-20 w-20 object-contain opacity-90" />
      )}
      <div className="text-[14px] font-semibold text-neo-ink">{title}</div>
      {description && <p className="mt-1 max-w-sm text-[12px] leading-relaxed text-neo-mid">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({
  title,
  description,
  onRetry,
}: {
  title?: string;
  description?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="neo-card-sm border border-[var(--neo-down-soft)] p-5">
      <div className="flex items-center gap-2">
        <span className="h-2 w-2 shrink-0 rounded-full bg-neo-down pulse-dot" />
        <div className="text-sm font-semibold text-neo-ink">{title || "数据加载失败"}</div>
      </div>
      {description && <p className="mt-2 text-xs leading-relaxed text-neo-mid">{description}</p>}
      {onRetry && (
        <button onClick={onRetry} className="neo-chip mt-3 px-3 py-1.5 text-xs text-neo-primary">
          重新加载
        </button>
      )}
    </div>
  );
}
