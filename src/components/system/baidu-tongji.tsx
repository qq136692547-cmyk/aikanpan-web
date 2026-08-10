"use client";

import { useEffect } from "react";

const BAIDU_TONGJI_ID = process.env.NEXT_PUBLIC_BAIDU_TONGJI_ID || "";

export function BaiduTongji() {
  useEffect(() => {
    if (!BAIDU_TONGJI_ID || typeof window === "undefined") return;
    const existing = (window as unknown as { _hmt?: unknown[] })._hmt;
    if (existing) return;
    const hm = document.createElement("script");
    hm.async = true;
    hm.src = `https://hm.baidu.com/hm.js?${BAIDU_TONGJI_ID}`;
    const s = document.getElementsByTagName("script")[0];
    s?.parentNode?.insertBefore(hm, s);
  }, []);

  return null;
}
