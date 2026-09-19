import type { SaleRecord } from '@/types';

export function RevenueChart({ sales, money }: { sales: SaleRecord[]; money: (amount: number) => string }) {
  const days: { label: string; date: string; revenue: number }[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const iso = d.toISOString().split('T')[0];
    const revenue = sales.filter((s) => s.date === iso).reduce((sum, s) => sum + s.totalRevenue, 0);
    days.push({ label: d.toLocaleDateString('en-GB', { weekday: 'short' }), date: iso, revenue });
  }

  const max = Math.max(...days.map((d) => d.revenue), 1);
  const width = 560;
  const height = 180;
  const barGap = 16;
  const barWidth = (width - barGap * (days.length - 1)) / days.length;

  return (
    <svg viewBox={`0 0 ${width} ${height + 32}`} className="w-full h-auto" role="img" aria-label="Revenue for the last 7 days">
      {days.map((d, i) => {
        const barHeight = Math.max((d.revenue / max) * height, d.revenue > 0 ? 4 : 0);
        const x = i * (barWidth + barGap);
        const y = height - barHeight;
        return (
          <g key={d.date}>
            <title>
              {d.label}: {money(d.revenue)}
            </title>
            <rect
              x={x}
              y={y}
              width={barWidth}
              height={barHeight}
              rx={4}
              fill={d.revenue > 0 ? 'url(#barGradient)' : 'currentColor'}
              className={d.revenue > 0 ? '' : 'text-violet-100 dark:text-neutral-800'}
            />
            <text x={x + barWidth / 2} y={height + 20} textAnchor="middle" fontSize="11" className="fill-neutral-500 dark:fill-neutral-400">
              {d.label}
            </text>
          </g>
        );
      })}
      <defs>
        <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#7c3aed" />
        </linearGradient>
      </defs>
    </svg>
  );
}
