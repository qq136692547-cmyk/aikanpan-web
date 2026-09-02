import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "我的账户",
  description: "管理爱看盘账户、登录方式、会员状态和数据同步。",
};

export default function AccountLayout({ children }: { children: ReactNode }) {
  return children;
}
