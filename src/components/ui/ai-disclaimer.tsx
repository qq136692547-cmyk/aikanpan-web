import { AlertTriangle } from "lucide-react";

export function AiDisclaimer({ className = "" }: { className?: string }) {
  return (
    <p className={`flex items-start gap-1.5 text-[10px] leading-relaxed text-neo-dim ${className}`}>
      <AlertTriangle size={12} className="mt-0.5 shrink-0 text-[var(--neo-amber)]" />
      <span>AI 生成，不构成投资建议</span>
    </p>
  );
}
