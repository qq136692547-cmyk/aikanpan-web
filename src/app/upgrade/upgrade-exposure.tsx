"use client";

/**
 * /upgrade 的付费页曝光埋点，单独做成一个不渲染任何 UI 的客户端岛。
 *
 * 为什么单独拆：转换漏斗里 upgrade_exposure 曾被计成「匿名占比 29%」——
 * 原因是子组件的 effect 先于父级 AuthProvider 的 effect 执行，游客 token
 * 还没写进 localStorage，readAuthToken() 返回 null，事件就被打成匿名。
 * 这里显式等 loading 结束（token 已落盘）再发，且 ref 保证只发一次。
 */

import { useEffect, useRef } from "react";
import { useAuth } from "@/lib/auth";
import { reportConversionEvent } from "@/lib/analytics";

export function UpgradeExposure() {
  const { loading } = useAuth();
  const firedRef = useRef(false);

  useEffect(() => {
    if (firedRef.current) return;
    if (loading) return;
    firedRef.current = true;
    reportConversionEvent("upgrade_exposure");
  }, [loading]);

  return null;
}
