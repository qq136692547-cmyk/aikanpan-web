import React from "react";

export interface BentoCardProps {
  children: React.ReactNode;
  title?: React.ReactNode;
  icon?: React.ReactNode;
  subtitle?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}

export function BentoCard({
  children,
  title,
  icon,
  subtitle,
  action,
  className = "",
}: BentoCardProps) {
  return (
    <div
      className={`relative overflow-hidden rounded-[18px] border border-white/[0.08] bg-[#101216] p-5 sm:p-6 transition-all duration-300 hover:border-white/[0.14] ${className}`}
      style={{
        boxShadow:
          "-6px -6px 16px rgba(255, 255, 255, 0.045), 8px 8px 20px rgba(0, 0, 0, 0.65)",
      }}
    >
      {(title || subtitle || action) && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 border-b border-white/[0.06] pb-3">
          <div className="flex items-center gap-2">
            {icon && <span className="text-white/80">{icon}</span>}
            {title && (
              <h2 className="text-[14px] font-semibold text-white tracking-wide">
                {title}
              </h2>
            )}
            {subtitle && (
              <span className="text-[11px] text-[#7C8595]">{subtitle}</span>
            )}
          </div>
          {action && <div>{action}</div>}
        </div>
      )}
      {children}
    </div>
  );
}
