import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: true,
  productionBrowserSourceMaps: false,
  output: "standalone",
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "aikanpan.top" },
    ],
  },
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          // 注意：下面三个头刻意不在这里设置，由 Caddy 站点级 header {} 统一注入
          //   X-Content-Type-Options / Strict-Transport-Security / Referrer-Policy
          // 原因：Caddy 覆盖 100% 响应，包括完全不经 Next 的 /api/*（FastAPI 反代）
          // 以及 Next 自己发出的 301/308 重定向；只写在 Next 侧会让这两类响应丢掉这三个头。
          // 要改这三个头请去改 /etc/caddy/Caddyfile，不要在这里加回来 —— 加回来就会出现
          // 同名头重复两份（2026-10-26 已清理过一次，别再制造一次）。
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://hm.baidu.com",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data: https:",
              "font-src 'self' data:",
              "connect-src 'self' https://hm.baidu.com",
              "frame-ancestors 'none'",
              "base-uri 'self'",
              "form-action 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
