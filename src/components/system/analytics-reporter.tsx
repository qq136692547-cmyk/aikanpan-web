"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth";
import { reportPageVisit } from "@/lib/analytics";

export function AnalyticsReporter() {
  const pathname = usePathname();
  const { user } = useAuth();
  const reported = useRef<string>("");

  useEffect(() => {
    if (!user || !pathname) return;
    if (reported.current === pathname) return;
    reported.current = pathname;
    reportPageVisit(pathname, user.token);
  }, [pathname, user]);

  return null;
}
