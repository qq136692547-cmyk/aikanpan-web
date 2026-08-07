import type { Metadata } from "next";
import "@fontsource-variable/inter";
import { AuthProvider } from "@/lib/auth";
import { BottomNav } from "@/components/layout/bottom-nav";
import { GlobalSearch } from "@/components/layout/global-search";
import { ErrorReporter } from "@/components/system/error-reporter";
import "./globals.css";


export const metadata: Metadata = {
  title: {
    default: "爱看盘 · AI 复盘工具",
    template: "%s · 爱看盘",
  },
  description: "A股 AI 复盘工具 — 实时行情、AI 诊断、智能盯盘",
  metadataBase: new URL("https://aikanpan.top"),
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="dark">
      <body
        className="antialiased pb-16 md:pb-0"
      >
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "WebApplication",
              name: "爱看盘",
              url: "https://aikanpan.top",
              description: "A股 AI 复盘工具 — 实时行情、AI 诊断、智能盯盘",
              applicationCategory: "FinanceApplication",
              operatingSystem: "Web",
              offers: { "@type": "Offer", price: "0", priceCurrency: "CNY" },
            }),
          }}
        />
        <AuthProvider>
          {children}
          <BottomNav />
        </AuthProvider>
        <GlobalSearch />
        <ErrorReporter />
      </body>
    </html>
  );
}
