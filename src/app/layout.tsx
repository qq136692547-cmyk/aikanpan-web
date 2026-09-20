import type { Metadata } from "next";
import "@fontsource-variable/inter";
import { AuthProvider } from "@/lib/auth";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { ErrorReporter } from "@/components/system/error-reporter";
import { AnalyticsReporter } from "@/components/system/analytics-reporter";
import { BaiduTongji } from "@/components/system/baidu-tongji";
import "./globals.css";


export const metadata: Metadata = {
  title: {
    default: "爱看盘 · 每日复盘工具",
    template: "%s · 爱看盘",
  },
  description: "A股、港股与美股 复盘工具 — 实时行情、个股诊断、智能盯盘",
  authors: [{ name: "爱看盘团队", url: "https://aikanpan.top/about/" }],
  creator: "爱看盘团队",
  publisher: "爱看盘",
  metadataBase: new URL("https://aikanpan.top"),
  openGraph: {
    title: "爱看盘 · 每日复盘工具",
    description: "爱看盘是一款开源 A 股、港股与美股复盘工具，提供实时行情、市场温度、涨跌停池、个股诊断与批量评分、自然语言智能盯盘、研究台、持仓管理与交易流水，数据来自东方财富、新浪财经、腾讯行情、Finnhub、EODHD 等公开接口。",
    url: "https://aikanpan.top",
    siteName: "爱看盘",
    locale: "zh_CN",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "爱看盘 · 每日复盘工具",
    description: "爱看盘是一款开源 A 股、港股与美股复盘工具，提供实时行情、市场温度、涨跌停池、个股诊断与批量评分、自然语言智能盯盘、研究台、持仓管理与交易流水，数据来自东方财富、新浪财经、腾讯行情、Finnhub、EODHD 等公开接口。",
  },
  other: { dateModified: "2026-08-10" },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body
        className="app-bottom-clearance antialiased"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "爱看盘",
              url: "https://aikanpan.top",
              description: "A股 复盘工具 — 实时行情、个股诊断、智能盯盘",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "Organization",
              "@id": "https://aikanpan.top/#organization",
              name: "爱看盘",
              url: "https://aikanpan.top",
              logo: "https://aikanpan.top/favicon.ico",
              description: "A股、港股与美股 复盘与决策辅助工具",
              sameAs: ["https://github.com/qq136692547-cmyk/aikanpan-web"],
            }),
          }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebSite",
              name: "爱看盘",
              url: "https://aikanpan.top",
              potentialAction: {
                "@type": "SearchAction",
                target: {
                  "@type": "EntryPoint",
                  urlTemplate: "https://aikanpan.top/search/?q={search_term_string}",
                },
                "query-input": "required name=search_term_string",
              },
              publisher: { "@id": "https://aikanpan.top/#organization" },
            }),
          }}
        />
        <AuthProvider>
          {children}
          <BottomNav />
          <AnalyticsReporter />
          <BaiduTongji />
        </AuthProvider>
        <GlobalSearch />
        <ErrorReporter />
      </body>
    </html>
  );
}
