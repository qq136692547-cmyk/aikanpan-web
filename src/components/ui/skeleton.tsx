/** 统一加载骨架屏 — Neomorphism style */

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="neo-skeleton h-20 rounded-lg" />
      ))}
    </div>
  );
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="neo-card-sm overflow-hidden">
      <div className="px-4 py-3">
        <div className="neo-skeleton h-4 w-24 rounded" />
      </div>
      <div className="divide-y divide-[var(--neo-edge)]">
        {Array.from({ length: rows }).map((_, i) => (
          <div key={i} className="flex items-center gap-4 px-4 py-2.5">
            <div className="neo-skeleton h-3 w-16 rounded" />
            <div className="flex-1" />
            <div className="neo-skeleton h-3 w-12 rounded" />
            <div className="neo-skeleton h-3 w-10 rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function GridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="neo-skeleton h-28 rounded-lg" />
      ))}
    </div>
  );
}

export function FullPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-[1440px] flex-1 px-6 py-6">
      <div className="neo-skeleton mb-4 h-8 w-48 rounded" />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="neo-skeleton h-32 rounded-lg" />
        <div className="neo-skeleton h-32 rounded-lg" />
        <div className="neo-skeleton h-32 rounded-lg" />
      </div>
      <div className="mt-6 space-y-3">
        <div className="neo-skeleton h-20 rounded-lg" />
        <div className="neo-skeleton h-20 rounded-lg" />
      </div>
    </div>
  );
}
