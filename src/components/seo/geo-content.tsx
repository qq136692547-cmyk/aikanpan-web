import type { ReactNode } from "react";

export interface GeoFaqItem {
  question: string;
  answer: string;
}

export interface GeoReference {
  label: string;
  url: string;
}

function formatUpdateTime(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function GeoByline({ updatedAt }: { updatedAt: string }) {
  return (
    <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-neo-dim">
      <span>
        作者：<a rel="author" href="/about/" className="text-neo-primary">爱看盘团队</a>
      </span>
      <time dateTime={updatedAt}>数据更新时间：{formatUpdateTime(updatedAt)}</time>
    </div>
  );
}

export function GeoArticleSchema({
  headline,
  description,
  url,
  datePublished,
  dateModified,
}: {
  headline: string;
  description: string;
  url: string;
  datePublished: string;
  dateModified: string;
}) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline,
    description,
    url,
    mainEntityOfPage: { "@type": "WebPage", "@id": url },
    datePublished,
    dateModified,
    author: {
      "@type": "Organization",
      name: "爱看盘团队",
      url: "https://aikanpan.top/about/",
    },
    publisher: {
      "@type": "Organization",
      name: "爱看盘",
      url: "https://aikanpan.top",
    },
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

export function GeoFaqSection({ title = "常见问题", items }: { title?: string; items: GeoFaqItem[] }) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: { "@type": "Answer", text: item.answer },
    })),
  };

  return (
    <section className="neo-card mt-4 p-4" aria-labelledby="geo-faq-title">
      <h2 id="geo-faq-title" className="text-[15px] font-semibold text-neo-ink">{title}</h2>
      <div className="mt-3 space-y-3">
        {items.map((item) => (
          <div key={item.question}>
            <h3 className="text-[13px] font-medium text-neo-ink">{item.question}</h3>
            <p className="mt-1 text-[12px] leading-relaxed text-neo-mid">{item.answer}</p>
          </div>
        ))}
      </div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
      />
    </section>
  );
}

export function GeoReferences({
  items,
  note = "本页数据来自公开行情接口，仅供研究参考，不构成任何投资建议。",
}: {
  items: GeoReference[];
  note?: ReactNode;
}) {
  return (
    <section id="references" className="mt-4 border-t border-[var(--neo-surface-inset)] pt-3">
      <h2 className="text-[13px] font-semibold text-neo-ink">数据来源与说明</h2>
      <ul className="mt-2 space-y-1 text-[11px] text-neo-mid">
        {items.map((item) => (
          <li key={item.url}>
            <cite className="not-italic text-neo-ink">{item.label}</cite>
            {"："}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-neo-primary underline decoration-[var(--neo-surface-active)] underline-offset-2"
            >
              {item.url}
            </a>
          </li>
        ))}
      </ul>
      <p className="mt-2 text-[11px] leading-relaxed text-neo-dim">{note}</p>
    </section>
  );
}
