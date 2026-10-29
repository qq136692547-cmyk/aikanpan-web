import type { Metadata, Viewport } from "next";
import "@fontsource-variable/inter";
import { AuthProvider } from "@/lib/auth";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { ErrorReporter } from "@/components/system/error-reporter";
import { SwrProvider } from "@/components/system/swr-provider";
import { AnalyticsReporter } from "@/components/system/analytics-reporter";
import { BaiduTongji } from "@/components/system/baidu-tongji";
import "./globals.css";



export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  userScalable: true,
  viewportFit: "cover",
  themeColor: "#05070A",
};

export const metadata: Metadata = {
  title: {
    default: "爱看盘 · A股/港股/美股 AI 复盘工作台",
    template: "%s · 爱看盘",
  },
  description: "A股、港股与美股 复盘工具 — 实时行情、个股诊断、智能盯盘",
  authors: [{ name: "爱看盘团队", url: "https://aikanpan.top/about/" }],
  creator: "爱看盘团队",
  publisher: "爱看盘",
  metadataBase: new URL("https://aikanpan.top"),
  openGraph: {
    title: "爱看盘 · A股/港股/美股 AI 复盘工作台",
    description: "爱看盘是一款开源 A 股、港股与美股复盘工具，提供实时行情、市场温度、涨跌停池、个股诊断与批量评分、自然语言智能盯盘、研究台、持仓管理与交易流水，数据来自东方财富、新浪财经、腾讯行情、Finnhub、EODHD 等公开接口。",
    url: "https://aikanpan.top",
    siteName: "爱看盘",
    locale: "zh_CN",
    type: "website",
    images: [
      {
        url: "/og-cover.png",
        width: 1200,
        height: 630,
        alt: "爱看盘 · A股/港股/美股 AI 复盘工作台",
      },
    ],
  },
  // twitter 故意**不写** title / description。
  //
  // Next 的自动继承逻辑（next/dist/lib/metadata/resolve-metadata.js 的 hasTwTitle）是
  // 「twitter 只有在**缺** title 时才从页面 openGraph 取」。以前这里写死了全站标题，
  // 于是每个页面都带上了「爱看盘 · A股/港股/美股 AI 复盘工作台」，页面自己的 og:title
  // 再正确也传不到分享卡片上。
  // 现在留空 → 各页从自己的 openGraph 继承 title/description；没写 openGraph 的页面
  // 会退回到本文件的 openGraph（也就是全站默认），行为安全。
  // ⚠️ 不要为了「看得见」把 title / description 加回来，一加就又会盖掉所有页面。
  twitter: {
    card: "summary_large_image",
    images: ["/og-cover.png"],
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
        {/* 跳到主内容：键盘用户的第一个 Tab 落点。
            目标主内容区必须可被程序化聚焦（tabIndex 设为 -1），否则回车只滚动不移动焦点。 */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-lg focus:bg-[#101216] focus:px-4 focus:py-2 focus:text-[13px] focus:text-white focus:shadow-xl"
        >
          跳到主内容
        </a>
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
              // Pro 权益是付费的（月卡 ¥19.9/月、季卡 ¥49/90 天），此前写 price:"0"
              // 等于向搜索引擎声明全站免费。年卡 ¥147 是「48 小时内购满 3 笔季卡自动
              // 升级」的结果，不是可单独购买的标价，所以不进 price 区间。
              offers: {
                "@type": "AggregateOffer",
                lowPrice: "19.9",
                highPrice: "49",
                priceCurrency: "CNY",
              },
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
        <SwrProvider>
          <AuthProvider>
            {children}
            <BottomNav />
            <AnalyticsReporter />
            <BaiduTongji />
          </AuthProvider>
        </SwrProvider>
        <GlobalSearch />
        <ErrorReporter />
      </body>
    </html>
  );
}
