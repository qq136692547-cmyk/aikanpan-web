import { Navbar } from "@/components/layout/navbar";
import { Footer } from "@/components/layout/footer";
import { api, type StockSearchResult } from "@/lib/api";
import type { Metadata } from "next";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "搜索股票",
  description: "搜索A股股票，按代码或名称查找个股行情数据。",
};

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  let results: StockSearchResult[] = [];
  let error: string | null = null;

  if (q && q.trim()) {
    try {
      const data = await api.searchStocks(q.trim());
      results = data.list || [];
    } catch (e) {
      error = "搜索接口暂时不可用";
    }
  }

  return (
    <>
      <Navbar />
      <main className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
        <h1 className="text-xl font-bold text-[var(--text-primary)]">搜索结果</h1>
        {q && (
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            关键词: <span className="font-num text-[var(--text-primary)]">{q}</span>
            {results.length > 0 && <span className="ml-2 text-[var(--text-tertiary)]">({results.length} 条结果)</span>}
          </p>
        )}

        {error && (
          <div className="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">{error}</p>
          </div>
        )}

        {!q && (
          <div className="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">请在上方搜索框输入股票代码或名称</p>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">支持 A 股代码（如 300414）或名称（如 中光防雷）</p>
          </div>
        )}

        {q && !error && results.length === 0 && (
          <div className="mt-8 rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)] p-6 text-center">
            <p className="text-sm text-[var(--text-secondary)]">未找到匹配的股票</p>
            <p className="mt-2 text-xs text-[var(--text-tertiary)]">请检查代码是否正确，或尝试其他关键词</p>
          </div>
        )}

        {results.length > 0 && (
          <div className="mt-4 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--bg-surface)]">
            <table className="w-full">
              <thead>
                <tr className="border-b border-[var(--border-subtle)] text-[11px] uppercase tracking-wide text-[var(--text-tertiary)]">
                  <th className="px-4 py-2 text-left font-medium">名称</th>
                  <th className="px-4 py-2 text-left font-medium">代码</th>
                  <th className="px-4 py-2 text-left font-medium">拼音</th>
                </tr>
              </thead>
              <tbody>
                {results.map((s) => (
                  <tr key={s.code}>
                    <td className="px-4 py-2.5 text-sm">
                      <a href={`/stock/${s.code.replace(/\./, "")}/`} className="font-medium text-[var(--text-primary)] transition-fast hover:text-brand">
                        {s.name}
                      </a>
                    </td>
                    <td className="font-num px-4 py-2.5 text-sm text-[var(--text-secondary)]">{s.code}</td>
                    <td className="px-4 py-2.5 text-xs text-[var(--text-tertiary)]">{s.pinyin || "-"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </main>
      <Footer />
    </>
  );
}
