import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "会员管理",
  robots: { index: false, follow: true },
  alternates: { canonical: "/admin/membership/" },
};

export default function AdminLayout({ children }: { children: ReactNode }) {
  return children;
}
