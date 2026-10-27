"use client";

// 本文件唯一一处 <a> 是「回首页」，刻意不用 next/link：根 layout 已经挂了，
// 需要的是整页硬跳转（顺带丢掉全部客户端状态），而不是再走一层客户端路由。
/* eslint-disable @next/next/no-html-link-for-pages */

import { useEffect, useState } from "react";
import { reportClientError } from "@/lib/analytics";

/**
 * 根级错误边界：根 layout 自己挂了才会走到这里。
 *
 * 三条硬约束，缺一条就白屏或二次崩：
 * 1. 必须自带 <html><body>（Next 要求：这里会替换根 layout）；
 * 2. 不 import 任何依赖 layout 的组件（Navbar/Footer/样式体系可能正是失败源）；
 * 3. 不用 globals.css 的类，全部内联 style —— 根 layout 失败时样式表可能没加载。
 *
 * 色值取自 globals.css 的真实 token（不是手写近似值）：
 *   --neo-bg #0A0B0D / --neo-surface-raised #14171C / --neo-primary-fill #5B52E8
 *   --neo-ink #EDEFF3 / --neo-ink-dim #7C8595
 */
const BG = "#0A0B0D";
const CARD = "#14171C";
const PRIMARY = "#5B52E8";
const INK = "#EDEFF3";
const DIM = "#7C8595";

const bodyStyle = {
  margin: 0,
  minHeight: "100vh",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "24px",
  background: BG,
  color: INK,
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", sans-serif',
  WebkitFontSmoothing: "antialiased" as const,
};

const cardStyle = {
  width: "100%",
  maxWidth: "420px",
  boxSizing: "border-box" as const,
  padding: "32px",
  textAlign: "center" as const,
  background: CARD,
  border: "1px solid rgba(255,255,255,0.08)",
  borderRadius: "16px",
};

const headlineStyle = {
  margin: 0,
  fontSize: "20px",
  fontWeight: 700,
  lineHeight: 1.4,
  color: INK,
};

const descStyle = {
  margin: "8px 0 0",
  fontSize: "14px",
  lineHeight: 1.6,
  color: DIM,
};

const actionsStyle = {
  marginTop: "24px",
  display: "flex",
  flexWrap: "wrap" as const,
  gap: "12px",
  justifyContent: "center",
};

/**
 * 跳到主内容（skip-link）。
 *
 * 为什么不用 layout.tsx 那套 Tailwind 的 sr-only / focus:not-sr-only：
 * global-error 会替换整个 html/body，产物里 **不带任何样式表**
 * （实测 .next/server/app/_global-error.html 的 <head> 里没有 stylesheet 链接），
 * 所以那套工具类在这里根本不生效 —— 链接会永久可见，而 body 是 display:flex，
 * 它会变成 flex item 与居中的错误卡片并排，页面直接走样。
 * 因此这里全部用内联 style（与本文件「不用 globals.css 的类」一致），
 * 聚焦态用 React state 切，因为内联 style 优先级高于样式表，:focus 规则盖不住它。
 */
const skipHiddenStyle = {
  position: "absolute",
  width: "1px",
  height: "1px",
  padding: 0,
  margin: "-1px",
  overflow: "hidden",
  clipPath: "inset(50%)",
  whiteSpace: "nowrap",
  border: "0",
} as const;

const skipVisibleStyle = {
  position: "fixed",
  top: "16px",
  left: "16px",
  zIndex: 100,
  padding: "8px 16px",
  borderRadius: "8px",
  background: "#101216",
  color: "#FFFFFF",
  fontSize: "13px",
  lineHeight: "20px",
  textDecoration: "none",
  boxShadow: "0 10px 30px rgba(0,0,0,0.45)",
} as const;

const baseBtn = {
  display: "inline-flex",
  alignItems: "center",
  justifyContent: "center",
  minHeight: "44px",
  padding: "10px 24px",
  borderRadius: "12px",
  fontSize: "14px",
  fontWeight: 600,
  textDecoration: "none",
  cursor: "pointer",
};

const primaryBtnStyle = {
  ...baseBtn,
  border: "1px solid transparent",
  background: PRIMARY,
  color: "#FFFFFF",
};

const secondaryBtnStyle = {
  ...baseBtn,
  border: "1px solid rgba(255,255,255,0.14)",
  background: "transparent",
  color: INK,
};

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const [skipFocused, setSkipFocused] = useState(false);

  useEffect(() => {
    reportClientError({
      scope: "global",
      message: String(error.message || error.name),
      digest: error.digest,
    });
    // 只依赖 digest：同一错误重渲染不重复上报（详见 error.tsx 同名注释）。
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error.digest]);

  return (
    <html lang="zh-CN">
      <body style={bodyStyle}>
        {/* 跳到主内容：与根 layout 的 skip-link 对应（本页不加载样式表，故用内联 style） */}
        <a
          href="#main-content"
          onFocus={() => setSkipFocused(true)}
          onBlur={() => setSkipFocused(false)}
          style={skipFocused ? skipVisibleStyle : skipHiddenStyle}
        >
          跳到主内容
        </a>
        <main id="main-content" tabIndex={-1} style={cardStyle}>
          <h1 style={headlineStyle}>这个页面出错了</h1>
          <p style={descStyle}>数据没有丢，可以重试</p>
          <div style={actionsStyle}>
            <button type="button" onClick={() => reset()} style={primaryBtnStyle}>
              重新加载
            </button>
            {/* 刻意用 <a>：整页硬跳转，见文件头说明 */}
            <a href="/" style={secondaryBtnStyle}>
              回首页
            </a>
          </div>
        </main>
      </body>
    </html>
  );
}
