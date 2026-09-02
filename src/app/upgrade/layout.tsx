import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "会员升级",
  description: "了解爱看盘免费版与 Pro 会员权益，激活连续 AI 复盘和研究工作流。",
};

export default function UpgradeLayout({ children }: { children: ReactNode }) {
  return children;
}
