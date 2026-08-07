interface SparklineProps {
  data: number[];
  trend: number;
  height?: number;
  className?: string;
}

export function Sparkline({ data, trend, height = 32, className }: SparklineProps) {
  if (!data || data.length < 2) return null;

  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;
  const points = data
    .map((v, i) => {
      const x = data.length === 1 ? 50 : (i / (data.length - 1)) * 99 + 0.5;
      const y = 31 - ((v - min) / range) * 26;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(" ");
  const area = `0.5,32 ${points} 99.5,32`;
  const stroke = trend > 0 ? "var(--neo-up-text)" : trend < 0 ? "var(--neo-down-text)" : "var(--neo-ink-faint)";
  const fill = trend > 0 ? "rgba(230,57,70,0.08)" : trend < 0 ? "rgba(21,154,78,0.08)" : "rgba(155,163,175,0.08)";

  return (
    <svg
      viewBox="0 0 100 32"
      preserveAspectRatio="none"
      style={{ height }}
      className={className}
      aria-hidden
    >
      <polygon points={area} fill={fill} />
      <polyline
        points={points}
        fill="none"
        stroke={stroke}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
