import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
  display: "swap",
});

const SITE_URL = "https://aikanpan.top";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "爱看盘 — AI 股票复盘工具",
    template: "%s · 爱看盘",
  },
  description: "A股行情浏览、AI每日复盘、个股分析、持仓管理",
  applicationName: "爱看盘",
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: "website",
    locale: "zh_CN",
    url: SITE_URL,
    siteName: "爱看盘",
    title: "爱看盘 — AI 股票复盘工具",
    description: "A股行情浏览、AI每日复盘、个股分析、持仓管理",
  },
  twitter: {
    card: "summary",
    title: "爱看盘 — AI 股票复盘工具",
    description: "A股行情浏览、AI每日复盘、个股分析、持仓管理",
  },
};

const orgJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "爱看盘",
  alternateName: "AI 股票复盘工具",
  url: SITE_URL,
  description: "A股行情浏览、AI每日复盘、个股分析、持仓管理",
  applicationCategory: "FinanceApplication",
  operatingSystem: "Web",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "CNY",
  },
  publisher: {
    "@type": "Organization",
    name: "爱看盘",
    url: SITE_URL,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="zh-CN"
      className={`${inter.variable} ${jetbrainsMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgJsonLd) }}
        />
        {children}
      </body>
    </html>
  );
}
